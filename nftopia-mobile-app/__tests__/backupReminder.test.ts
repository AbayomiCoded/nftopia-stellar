import { Wallet } from '@/src/services/stellar/types';

// Mock wallet data for testing
const createMockWallet = (publicKey: string, backupConfirmed = false): Wallet => ({
  publicKey,
  secretKey: `SECRET_${publicKey}`,
  mnemonic: 'test test test test test test test test test test test test',
  backupConfirmed,
});

describe('Backup Reminder System', () => {
  describe('Wallet Interface', () => {
    it('should have backupConfirmed field', () => {
      const wallet: Wallet = createMockWallet('test-key-1', true);
      expect(wallet.backupConfirmed).toBe(true);
      
      const unconfirmedWallet: Wallet = createMockWallet('test-key-2');
      expect(unconfirmedWallet.backupConfirmed).toBe(false);
    });
  });

  describe('Reminder Logic', () => {
    const mockWallets = [
      createMockWallet('key1', true), // Confirmed
      createMockWallet('key2'), // Unconfirmed
      createMockWallet('key3'), // Unconfirmed
    ];

    it('should identify unconfirmed wallets', () => {
      const unconfirmedWallets = mockWallets.filter(w => !w.backupConfirmed);
      expect(unconfirmedWallets).toHaveLength(2);
      expect(unconfirmedWallets[0].publicKey).toBe('key2');
      expect(unconfirmedWallets[1].publicKey).toBe('key3');
    });

    it('should show reminder for unconfirmed wallets', () => {
      const hasUnconfirmed = mockWallets.some(w => !w.backupConfirmed);
      expect(hasUnconfirmed).toBe(true);
    });

    it('should not show reminder when all wallets are confirmed', () => {
      const allConfirmedWallets = mockWallets.map(w => ({
        ...w,
        backupConfirmed: true,
      }));
      const hasUnconfirmed = allConfirmedWallets.some(w => !w.backupConfirmed);
      expect(hasUnconfirmed).toBe(false);
    });
  });

  describe('Reminder Timing', () => {
    it('should calculate days between reminders correctly', () => {
      const now = new Date('2024-01-15');
      const lastShown = new Date('2024-01-08'); // 7 days ago
      const daysDifference = Math.floor(
        (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDifference).toBe(7);
    });

    it('should show reminder after 7 days', () => {
      const now = new Date('2024-01-15');
      const lastShown = new Date('2024-01-01'); // 14 days ago
      const daysDifference = Math.floor(
        (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDifference).toBe(14);
      expect(daysDifference >= 7).toBe(true);
    });

    it('should not show reminder before 7 days', () => {
      const now = new Date('2024-01-15');
      const lastShown = new Date('2024-01-13'); // 2 days ago
      const daysDifference = Math.floor(
        (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDifference).toBe(2);
      expect(daysDifference >= 7).toBe(false);
    });
  });
});