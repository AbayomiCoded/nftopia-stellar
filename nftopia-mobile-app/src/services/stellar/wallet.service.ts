import { Keypair, Horizon } from 'stellar-sdk';
import * as bip39 from 'bip39';
import { Wallet, WalletCreateResult, WalletError, WalletErrorCode, Transaction, TransactionType, TransactionFilters, PaginatedTransactions } from './types';
import {
  isValidSecretKey,
  isValidMnemonic,
  assertValidSecretKey,
  assertValidMnemonic,
} from './validation';
import { SecureStorage } from './secureStorage';
import { createServer } from './network';
import { NetworkType } from '@/stores/walletStore';

export { TransactionType, WalletError, WalletErrorCode } from './types';
export type { Wallet, WalletCreateResult, Transaction, TransactionFilters, PaginatedTransactions } from './types';

export class StellarWalletService {
  private readonly storage: SecureStorage;
  private readonly server: Horizon.Server;

  constructor(storage?: SecureStorage, network: NetworkType = 'testnet') {
    this.storage = storage ?? new SecureStorage();
    this.server = createServer(network);
  }

  async createWallet(password?: string): Promise<WalletCreateResult> {
    const mnemonic = bip39.generateMnemonic();
    // Derive seed from mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic);
    // Use first 32 bytes of seed for Stellar keypair
    const rawSeed = seed.slice(0, 32);
    const keypair = Keypair.fromRawEd25519Seed(rawSeed);
    const wallet: Wallet = {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
      mnemonic,
    };
    await this.storage.saveWallet(wallet, password);
    return { wallet, mnemonic };
  }

  async importFromSecretKey(secretKey: string, password?: string): Promise<Wallet> {
    assertValidSecretKey(secretKey);
    const keypair = Keypair.fromSecret(secretKey);
    const wallet: Wallet = {
      publicKey: keypair.publicKey(),
      secretKey,
    };
    await this.storage.saveWallet(wallet, password);
    return wallet;
  }

  async importFromMnemonic(mnemonic: string, password?: string): Promise<Wallet> {
    assertValidMnemonic(mnemonic);
    try {
      // Validate mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new WalletError('Invalid mnemonic', WalletErrorCode.INVALID_MNEMONIC);
      }
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const rawSeed = seed.slice(0, 32);
      const keypair = Keypair.fromRawEd25519Seed(rawSeed);
      const wallet: Wallet = {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        mnemonic,
      };
      await this.storage.saveWallet(wallet, password);
      return wallet;
    } catch (err) {
      if (err instanceof WalletError) throw err;
      throw new WalletError(
        `Failed to derive wallet from mnemonic: ${(err as Error).message}`,
        WalletErrorCode.INVALID_MNEMONIC,
      );
    }
  }

  async signMessage(message: string, secretKey: string): Promise<string> {
    assertValidSecretKey(secretKey);
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const messageBuffer = Buffer.from(message, 'utf-8');
      const signature = keypair.sign(messageBuffer);
      return Buffer.from(signature).toString('base64');
    } catch (err) {
      if (err instanceof WalletError) throw err;
      throw new WalletError(
        `Failed to sign message: ${(err as Error).message}`,
        WalletErrorCode.SIGN_ERROR,
      );
    }
  }

  getPublicKey(secretKey: string): string {
    assertValidSecretKey(secretKey);
    return Keypair.fromSecret(secretKey).publicKey();
  }

  isValidSecretKey(key: string): boolean {
    return isValidSecretKey(key);
  }

  isValidMnemonic(phrase: string): boolean {
    return isValidMnemonic(phrase);
  }

  async getAccountOperations(
    publicKey: string,
    cursor?: string,
    limit: number = 20
  ): Promise<PaginatedTransactions> {
    try {
      const builder = this.server
        .operations()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc');

      if (cursor) {
        builder.cursor(cursor);
      }

      const response = await builder.call();
      const transactions = this.mapOperationsToTransactions(response.records);

      return {
        transactions,
        nextPage: response.next ? response.next.toString() : undefined,
        hasMore: !!response.next,
      };
    } catch (error) {
      throw new WalletError(
        `Failed to fetch account operations: ${(error as Error).message}`,
        WalletErrorCode.NETWORK_ERROR
      );
    }
  }

  async getFilteredTransactions(
    publicKey: string,
    filters: TransactionFilters,
    cursor?: string,
    limit: number = 20
  ): Promise<PaginatedTransactions> {
    try {
      const builder = this.server
        .operations()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc');

      if (cursor) {
        builder.cursor(cursor);
      }

      const response = await builder.call();
      let transactions = this.mapOperationsToTransactions(response.records);

      // Apply filters locally (Horizon's operations endpoint supports none of them)
      if (filters.type) {
        transactions = transactions.filter(tx => tx.type === filters.type);
      }
      if (filters.asset) {
        transactions = transactions.filter(tx => tx.asset === filters.asset);
      }
      if (filters.dateFrom) {
        const from = filters.dateFrom.getTime();
        transactions = transactions.filter(tx => new Date(tx.createdAt).getTime() >= from);
      }
      if (filters.dateTo) {
        const to = filters.dateTo.getTime();
        transactions = transactions.filter(tx => new Date(tx.createdAt).getTime() <= to);
      }

      return {
        transactions,
        nextPage: response.next ? response.next.toString() : undefined,
        hasMore: !!response.next,
      };
    } catch (error) {
      throw new WalletError(
        `Failed to fetch filtered transactions: ${(error as Error).message}`,
        WalletErrorCode.NETWORK_ERROR
      );
    }
  }

  private mapOperationsToTransactions(
    operations: Horizon.ServerApi.OperationRecord[]
  ): Transaction[] {
    return operations.map(op => this.mapOperationToTransaction(op));
  }

  private mapOperationToTransaction(op: Horizon.ServerApi.OperationRecord): Transaction {
    const type = this.mapOperationType(op.type);
    const baseTransaction: Transaction = {
      id: op.id,
      hash: op.transaction_hash || '',
      createdAt: op.created_at || new Date().toISOString(),
      sourceAccount: op.source_account || '',
      type,
      fee: 0, // Fee is at transaction level, not operation level
      successful: op.transaction_successful ?? true,
    };

    const OperationType = Horizon.HorizonApi.OperationResponseType;

    // Add type-specific fields
    switch (op.type) {
      case OperationType.payment:
        return {
          ...baseTransaction,
          amount: op.amount,
          asset: op.asset_type === 'native' ? 'XLM' : op.asset_code,
          from: op.from,
          to: op.to,
        };
      case OperationType.createAccount:
        return {
          ...baseTransaction,
          amount: op.starting_balance,
          asset: 'XLM',
          to: op.account,
        };
      case OperationType.pathPayment:
      case OperationType.pathPaymentStrictSend:
        return {
          ...baseTransaction,
          amount: op.amount,
          asset: op.asset_type === 'native' ? 'XLM' : op.asset_code,
          from: op.from,
          to: op.to,
        };
      case OperationType.changeTrust:
        return {
          ...baseTransaction,
          // change_trust is never a native asset, so asset_code is the code (if any)
          asset: op.asset_code,
        };
      default:
        return baseTransaction;
    }
  }

  private mapOperationType(opType: string): TransactionType {
    const typeMap: Record<string, TransactionType> = {
      'payment': TransactionType.PAYMENT,
      'path_payment': TransactionType.PATH_PAYMENT,
      'path_payment_strict_receive': TransactionType.PATH_PAYMENT,
      'path_payment_strict_send': TransactionType.PATH_PAYMENT,
      'create_account': TransactionType.CREATE_ACCOUNT,
      'manage_sell_offer': TransactionType.MANAGE_SELL_OFFER,
      'manage_buy_offer': TransactionType.MANAGE_BUY_OFFER,
      'set_options': TransactionType.SET_OPTIONS,
      'change_trust': TransactionType.CHANGE_TRUST,
      'allow_trust': TransactionType.ALLOW_TRUST,
      'account_merge': TransactionType.ACCOUNT_MERGE,
      'inflation': TransactionType.INFLATION,
      'manage_data': TransactionType.MANAGE_DATA,
      'bump_sequence': TransactionType.BUMP_SEQUENCE,
      'clawback': TransactionType.CLAWBACK,
      'clawback_claimable_balance': TransactionType.CLAWBACK_CLAIMABLE_BALANCE,
      'begin_sponsoring_future_reserves': TransactionType.BEGIN_SPONSORING_FUTURE_RESERVES,
      'end_sponsoring_future_reserves': TransactionType.END_SPONSORING_FUTURE_RESERVES,
      'revoke_sponsorship': TransactionType.REVOKE_SPONSORSHIP,
      'liquidity_pool_deposit': TransactionType.LIQUIDITY_POOL_DEPOSIT,
      'liquidity_pool_withdraw': TransactionType.LIQUIDITY_POOL_WITHDRAW,
    };

    return typeMap[opType] || TransactionType.UNKNOWN;
  }

  getTransactionTypeIcon(type: TransactionType): string {
    const iconMap: Record<TransactionType, string> = {
      [TransactionType.PAYMENT]: '💸',
      [TransactionType.PATH_PAYMENT]: '🔄',
      [TransactionType.CREATE_ACCOUNT]: '🆕',
      [TransactionType.MANAGE_SELL_OFFER]: '📉',
      [TransactionType.MANAGE_BUY_OFFER]: '📈',
      [TransactionType.SET_OPTIONS]: '⚙️',
      [TransactionType.CHANGE_TRUST]: '🔐',
      [TransactionType.ALLOW_TRUST]: '✅',
      [TransactionType.ACCOUNT_MERGE]: '🔀',
      [TransactionType.INFLATION]: '🎈',
      [TransactionType.MANAGE_DATA]: '📝',
      [TransactionType.BUMP_SEQUENCE]: '⏭️',
      [TransactionType.CLAWBACK]: '🔙',
      [TransactionType.CLAWBACK_CLAIMABLE_BALANCE]: '💰',
      [TransactionType.BEGIN_SPONSORING_FUTURE_RESERVES]: '🤝',
      [TransactionType.END_SPONSORING_FUTURE_RESERVES]: '👋',
      [TransactionType.REVOKE_SPONSORSHIP]: '❌',
      [TransactionType.LIQUIDITY_POOL_DEPOSIT]: '💧',
      [TransactionType.LIQUIDITY_POOL_WITHDRAW]: '🚰',
      [TransactionType.UNKNOWN]: '❓',
    };

    return iconMap[type] || '❓';
  }

  getTransactionTypeLabel(type: TransactionType): string {
    const labelMap: Record<TransactionType, string> = {
      [TransactionType.PAYMENT]: 'Payment',
      [TransactionType.PATH_PAYMENT]: 'Path Payment',
      [TransactionType.CREATE_ACCOUNT]: 'Create Account',
      [TransactionType.MANAGE_SELL_OFFER]: 'Sell Offer',
      [TransactionType.MANAGE_BUY_OFFER]: 'Buy Offer',
      [TransactionType.SET_OPTIONS]: 'Set Options',
      [TransactionType.CHANGE_TRUST]: 'Add Trustline',
      [TransactionType.ALLOW_TRUST]: 'Allow Trust',
      [TransactionType.ACCOUNT_MERGE]: 'Account Merge',
      [TransactionType.INFLATION]: 'Inflation',
      [TransactionType.MANAGE_DATA]: 'Manage Data',
      [TransactionType.BUMP_SEQUENCE]: 'Bump Sequence',
      [TransactionType.CLAWBACK]: 'Clawback',
      [TransactionType.CLAWBACK_CLAIMABLE_BALANCE]: 'Claimable Balance',
      [TransactionType.BEGIN_SPONSORING_FUTURE_RESERVES]: 'Begin Sponsorship',
      [TransactionType.END_SPONSORING_FUTURE_RESERVES]: 'End Sponsorship',
      [TransactionType.REVOKE_SPONSORSHIP]: 'Revoke Sponsorship',
      [TransactionType.LIQUIDITY_POOL_DEPOSIT]: 'Pool Deposit',
      [TransactionType.LIQUIDITY_POOL_WITHDRAW]: 'Pool Withdraw',
      [TransactionType.UNKNOWN]: 'Unknown',
    };

    return labelMap[type] || 'Unknown';
  }
}

export const stellarWalletService = new StellarWalletService();
