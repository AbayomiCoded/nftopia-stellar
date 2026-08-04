import * as SecureStore from 'expo-secure-store';
import { biometricService } from './biometric.service';
import { errorLogger } from '@/src/errors/logger';
import { analyticsService } from '@/src/analytics/analytics.service';

export interface SecureStorageConfig {
  requireBiometric?: boolean;
  keychainAccessible?: SecureStore.KeychainAccessibilityConstant;
  storageKey: string;
}

export interface SecureStorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  requiresBiometric?: boolean;
}

class SecureStorageService {
  private static instance: SecureStorageService;
  private readonly DEFAULT_OPTIONS: SecureStore.KeychainAccessibilityConstant = 
    SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  // Save sensitive data with optional biometric protection
  async save<T>(
    key: string,
    value: T,
    requireBiometric: boolean = false
  ): Promise<SecureStorageResult<T>> {
    try {
      const options: SecureStore.Options = {
        keychainAccessible: this.DEFAULT_OPTIONS,
        requireAuthentication: requireBiometric,
        authenticationPrompt: requireBiometric
          ? 'Authenticate to access wallet data'
          : undefined,
      };

      const jsonValue = JSON.stringify(value);
      await SecureStore.setItemAsync(key, jsonValue, options);

      analyticsService.track('secure_storage_save', {
        key,
        requireBiometric,
        success: true,
      });

      return { success: true, data: value };
    } catch (error) {
      errorLogger.log(error as Error, 'SecureStorageService.save');
      analyticsService.track('secure_storage_save', {
        key,
        requireBiometric,
        success: false,
        error: (error as Error).message,
      });
      return {
        success: false,
        error: (error as Error).message,
        requiresBiometric: false,
      };
    }
  }

  // Get sensitive data with biometric authentication
  async get<T>(
    key: string,
    requireBiometric: boolean = false
  ): Promise<SecureStorageResult<T>> {
    try {
      const options: SecureStore.Options = {
        keychainAccessible: this.DEFAULT_OPTIONS,
        requireAuthentication: requireBiometric,
        authenticationPrompt: requireBiometric
          ? 'Authenticate to access wallet data'
          : undefined,
      };

      const value = await SecureStore.getItemAsync(key, options);

      if (!value) {
        return {
          success: false,
          error: 'No data found for key',
          requiresBiometric: false,
        };
      }

      const parsed = JSON.parse(value) as T;

      analyticsService.track('secure_storage_get', {
        key,
        requireBiometric,
        success: true,
      });

      return { success: true, data: parsed };
    } catch (error) {
      // Check if error is due to biometric authentication failure
      const errorMessage = (error as Error).message;
      const isBiometricError = errorMessage.includes('Authentication') ||
                              errorMessage.includes('biometric') ||
                              errorMessage.includes('face');

      if (isBiometricError && requireBiometric) {
        analyticsService.track('secure_storage_biometric_failed', {
          key,
          error: errorMessage,
        });
        return {
          success: false,
          error: 'Biometric authentication required',
          requiresBiometric: true,
        };
      }

      errorLogger.log(error as Error, 'SecureStorageService.get');
      analyticsService.track('secure_storage_get', {
        key,
        requireBiometric,
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        requiresBiometric: false,
      };
    }
  }

  // Delete sensitive data
  async delete(key: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      analyticsService.track('secure_storage_delete', { key, success: true });
      return true;
    } catch (error) {
      errorLogger.log(error as Error, 'SecureStorageService.delete');
      analyticsService.track('secure_storage_delete', {
        key,
        success: false,
        error: (error as Error).message,
      });
      return false;
    }
  }

  // Check if key exists
  async hasKey(key: string): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value !== null;
    } catch (error) {
      errorLogger.log(error as Error, 'SecureStorageService.hasKey');
      return false;
    }
  }

  // Save wallet with biometric protection
  async saveWallet(
    publicKey: string,
    privateKey: string,
    mnemonic?: string
  ): Promise<SecureStorageResult<{ publicKey: string }>> {
    try {
      const walletData = {
        publicKey,
        privateKey,
        mnemonic,
        createdAt: new Date().toISOString(),
      };

      // Save with biometric protection
      const result = await this.save(
        `wallet_${publicKey}`,
        walletData,
        true // Require biometric for access
      );

      if (result.success) {
        // Save the public key separately for quick access
        await SecureStore.setItemAsync(
          `wallet_public_${publicKey}`,
          publicKey,
          { keychainAccessible: this.DEFAULT_OPTIONS }
        );

        analyticsService.track('wallet_saved', {
          publicKey: publicKey.substring(0, 8),
          hasMnemonic: !!mnemonic,
        });
      }

      return result;
    } catch (error) {
      errorLogger.log(error as Error, 'SecureStorageService.saveWallet');
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Get wallet with biometric authentication
  async getWallet(
    publicKey: string
  ): Promise<SecureStorageResult<{ publicKey: string; privateKey: string; mnemonic?: string }>> {
    return await this.get(`wallet_${publicKey}`, true);
  }

  // Delete wallet
  async deleteWallet(publicKey: string): Promise<boolean> {
    try {
      const deleted = await this.delete(`wallet_${publicKey}`);
      if (deleted) {
        await SecureStore.deleteItemAsync(`wallet_public_${publicKey}`);
        analyticsService.track('wallet_deleted', {
          publicKey: publicKey.substring(0, 8),
        });
      }
      return deleted;
    } catch (error) {
      errorLogger.log(error as Error, 'SecureStorageService.deleteWallet');
      return false;
    }
  }

  // Get all wallet public keys
  async getWalletPublicKeys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      // This is a simplified implementation
      // In production, you'd maintain a list of wallet keys
      const walletKeys = await SecureStore.getItemAsync('wallet_keys');
      if (walletKeys) {
        return JSON.parse(walletKeys);
      }
      return keys;
    } catch (error) {
      errorLogger.log(error as Error, 'SecureStorageService.getWalletPublicKeys');
      return [];
    }
  }

  // Save wallet keys list
  async saveWalletPublicKeys(keys: string[]): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(
        'wallet_keys',
        JSON.stringify(keys),
        { keychainAccessible: this.DEFAULT_OPTIONS }
      );
      return true;
    } catch (error) {
      errorLogger.log(error as Error, 'SecureStorageService.saveWalletPublicKeys');
      return false;
    }
  }
}

export const secureStorageService = SecureStorageService.getInstance();