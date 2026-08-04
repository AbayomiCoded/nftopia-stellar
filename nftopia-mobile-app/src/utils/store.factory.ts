import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { persist, PersistOptions, devtools } from 'zustand/middleware';
import {
  PersistenceConfig,
  asyncStorageAdapter,
  secureStorageAdapter,
  createVersionedStorage,
  createEncryptedStorage,
  handlePersistenceError,
  PersistenceError,
} from './persistence.utils';

export interface StoreConfig<T> {
  name: string;
  initialState: T;
  actions: (set: any, get: any, store?: any) => T;
  persist?: {
    enabled: boolean;
    name?: string;
    version?: number;
    migrate?: (state: any, version: number) => Promise<any>;
    partialize?: (state: T) => any;
    blacklist?: (keyof T)[];
    whitelist?: (keyof T)[];
    storage?: 'async' | 'secure' | 'encrypted';
    encryptKeys?: string[];
  };
  devtools?: {
    enabled: boolean;
    name?: string;
  };
}

// Storage factory
const getStorage = (type: 'async' | 'secure' | 'encrypted', encryptKeys?: string[]) => {
  switch (type) {
    case 'secure':
      return secureStorageAdapter;
    case 'encrypted':
      // Create encrypted storage with a key derived from the app
      const encryptionKey = 'nftopia-encryption-key'; // In production, use a secure key from environment
      return createEncryptedStorage(encryptionKey);
    case 'async':
    default:
      return asyncStorageAdapter;
  }
};

// Create store with persistence, versioning, and devtools
export function createStore<T>(
  config: StoreConfig<T>
): UseBoundStore<StoreApi<T>> {
  const {
    name,
    initialState,
    actions,
    persist: persistConfig,
    devtools: devtoolsConfig,
  } = config;

  // Create the base store
  let store: any;

  if (persistConfig?.enabled) {
    // Configure persistence
    const storageType = persistConfig.storage || 'async';
    const storage = getStorage(storageType, persistConfig.encryptKeys);

    // Add versioning if version is specified
    let finalStorage = storage;
    if (persistConfig.version) {
      finalStorage = createVersionedStorage(
        storage,
        persistConfig.name || name,
        persistConfig.version,
        persistConfig.migrate ? [{ version: persistConfig.version, up: persistConfig.migrate }] : []
      );
    }

    const persistOptions: PersistOptions<T, any> = {
      name: persistConfig.name || name,
      storage: finalStorage,
      version: persistConfig.version || 0,
      migrate: persistConfig.migrate
        ? async (persistedState: any, version: number) => {
            try {
              const migrated = await persistConfig.migrate!(persistedState, version);
              return migrated;
            } catch (error) {
              console.error(`[Store] Migration failed for ${name}:`, error);
              return initialState;
            }
          }
        : undefined,
      partialize: persistConfig.partialize
        ? (state: T) => persistConfig.partialize!(state)
        : undefined,
    };

    // Apply blacklist/whitelist
    if (persistConfig.blacklist || persistConfig.whitelist) {
      const originalPartialize = persistOptions.partialize;
      persistOptions.partialize = (state: T) => {
        let partial = originalPartialize ? originalPartialize(state) : state;

        if (persistConfig.whitelist && persistConfig.whitelist.length > 0) {
          const whitelisted: any = {};
          persistConfig.whitelist.forEach((key) => {
            if (key in partial) {
              whitelisted[key as string] = partial[key as keyof T];
            }
          });
          partial = whitelisted;
        } else if (persistConfig.blacklist && persistConfig.blacklist.length > 0) {
          const blacklisted = new Set(persistConfig.blacklist as string[]);
          const filtered: any = {};
          Object.keys(partial).forEach((key) => {
            if (!blacklisted.has(key)) {
              filtered[key] = partial[key];
            }
          });
          partial = filtered;
        }

        return partial;
      };
    }

    // Create state creator with error handling
    const stateCreator: StateCreator<T, [], [], T> = (set, get, store) => {
      try {
        return actions(set, get, store);
      } catch (error) {
        console.error(`[Store] Error in actions for ${name}:`, error);
        return initialState;
      }
    };

    // Apply persist middleware
    store = create(
      devtoolsConfig?.enabled
        ? devtools(
            persist(stateCreator, persistOptions),
            { name: devtoolsConfig.name || name }
          )
        : persist(stateCreator, persistOptions)
    );
  } else {
    // No persistence
    const stateCreator: StateCreator<T, [], [], T> = (set, get, store) => {
      try {
        return actions(set, get, store);
      } catch (error) {
        console.error(`[Store] Error in actions for ${name}:`, error);
        return initialState;
      }
    };

    store = create(
      devtoolsConfig?.enabled
        ? devtools(stateCreator, { name: devtoolsConfig.name || name })
        : stateCreator
    );
  }

  // Wrap store methods with error handling
  const wrappedStore = (...args: any[]) => {
    try {
      return store(...args);
    } catch (error) {
      console.error(`[Store] Error accessing store ${name}:`, error);
      return store(...args);
    }
  };

  Object.assign(wrappedStore, store);

  return wrappedStore as UseBoundStore<StoreApi<T>>;
}

// Helper to clear all persisted data
export const clearAllPersistedData = async (storeNames: string[]): Promise<void> => {
  for (const name of storeNames) {
    try {
      await asyncStorageAdapter.removeItem(name);
      await secureStorageAdapter.removeItem(name);
    } catch (error) {
      console.error(`[Persistence] Failed to clear ${name}:`, error);
    }
  }
};

// Helper to get persisted data size
export const getPersistenceSize = async (): Promise<{
  total: number;
  stores: Record<string, number>;
}> => {
  const stores: Record<string, number> = {};
  let total = 0;

  try {
    const keys = await AsyncStorage.getAllKeys();
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const size = new Blob([value]).size;
        stores[key] = size;
        total += size;
      }
    }
  } catch (error) {
    console.error('[Persistence] Failed to get size:', error);
  }

  return { total, stores };
};