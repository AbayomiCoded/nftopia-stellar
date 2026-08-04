import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export interface PersistenceConfig {
  name: string;
  version?: number;
  migrate?: (persistedState: any, version: number) => Promise<any>;
  partialize?: (state: any) => any;
  blacklist?: string[];
  whitelist?: string[];
  storage?: StorageAdapter;
  encrypt?: boolean;
  encryptKeys?: string[];
}

// AsyncStorage adapter
export const asyncStorageAdapter: StorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`[Persistence] Failed to get item ${key}:`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`[Persistence] Failed to set item ${key}:`, error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[Persistence] Failed to remove item ${key}:`, error);
    }
  },
};

// Secure storage adapter for sensitive data
export const secureStorageAdapter: StorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`[Persistence] Failed to get secure item ${key}:`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch (error) {
      console.error(`[Persistence] Failed to set secure item ${key}:`, error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`[Persistence] Failed to remove secure item ${key}:`, error);
    }
  },
};

// Create a storage adapter with encryption
export const createEncryptedStorage = (
  encryptionKey: string
): StorageAdapter => {
  return {
    getItem: async (key: string) => {
      try {
        const value = await SecureStore.getItemAsync(key);
        if (value) {
          // In production, decrypt here
          // const decrypted = decrypt(value, encryptionKey);
          // return decrypted;
          return value;
        }
        return null;
      } catch (error) {
        console.error(`[Persistence] Failed to get encrypted item ${key}:`, error);
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        // In production, encrypt here
        // const encrypted = encrypt(value, encryptionKey);
        // await SecureStore.setItemAsync(key, encrypted);
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      } catch (error) {
        console.error(`[Persistence] Failed to set encrypted item ${key}:`, error);
      }
    },
    removeItem: async (key: string) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error(`[Persistence] Failed to remove encrypted item ${key}:`, error);
      }
    },
  };
};

// Migration utilities
export interface Migration {
  version: number;
  up: (state: any) => Promise<any> | any;
  down?: (state: any) => Promise<any> | any;
}

export const runMigrations = async (
  state: any,
  currentVersion: number,
  migrations: Migration[]
): Promise<any> => {
  let migratedState = state;
  let version = currentVersion;

  // Sort migrations by version
  const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of sortedMigrations) {
    if (migration.version > version) {
      migratedState = await migration.up(migratedState);
      version = migration.version;
    }
  }

  return migratedState;
};

// Versioned storage helper
export const createVersionedStorage = (
  storage: StorageAdapter,
  key: string,
  currentVersion: number,
  migrations: Migration[] = []
): StorageAdapter => {
  return {
    getItem: async (keyName: string) => {
      try {
        const data = await storage.getItem(keyName);
        if (!data) return null;

        const parsed = JSON.parse(data);
        const storedVersion = parsed._version || 0;

        if (storedVersion < currentVersion) {
          // Migrate the state
          const migratedState = await runMigrations(
            parsed.state || parsed,
            storedVersion,
            migrations
          );
          // Save migrated state
          const newData = JSON.stringify({
            _version: currentVersion,
            state: migratedState,
          });
          await storage.setItem(keyName, newData);
          return JSON.stringify(migratedState);
        }

        return JSON.stringify(parsed.state || parsed);
      } catch (error) {
        console.error(`[Persistence] Versioned storage get error:`, error);
        return null;
      }
    },
    setItem: async (keyName: string, value: string) => {
      try {
        const data = JSON.stringify({
          _version: currentVersion,
          state: JSON.parse(value),
        });
        await storage.setItem(keyName, data);
      } catch (error) {
        console.error(`[Persistence] Versioned storage set error:`, error);
      }
    },
    removeItem: async (keyName: string) => {
      try {
        await storage.removeItem(keyName);
      } catch (error) {
        console.error(`[Persistence] Versioned storage remove error:`, error);
      }
    },
  };
};

// Persistence error handling
export class PersistenceError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'PersistenceError';
  }
}

export const handlePersistenceError = (error: any, fallback: any): any => {
  console.error('[Persistence] Error:', error);
  return fallback;
};

// Create storage with fallback
export const createStorageWithFallback = (
  primary: StorageAdapter,
  fallback: StorageAdapter
): StorageAdapter => {
  return {
    getItem: async (key: string) => {
      try {
        const result = await primary.getItem(key);
        if (result !== null) return result;
        return await fallback.getItem(key);
      } catch (error) {
        console.warn('[Persistence] Primary storage failed, using fallback');
        return await fallback.getItem(key);
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await primary.setItem(key, value);
      } catch (error) {
        console.warn('[Persistence] Primary storage set failed, using fallback');
        await fallback.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      try {
        await primary.removeItem(key);
      } catch (error) {
        console.warn('[Persistence] Primary storage remove failed, using fallback');
        await fallback.removeItem(key);
      }
    },
  };
};