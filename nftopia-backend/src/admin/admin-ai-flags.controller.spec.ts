import { AdminAiFlagsController } from './admin-ai-flags.controller';

describe('AdminAiFlagsController', () => {
  let controller: AdminAiFlagsController;

  const contentFlagService = {
    listFlags: jest.fn(),
    resolveFlag: jest.fn(),
  };

  const user = { userId: 'admin-1', username: 'mod' };
  const req = {
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest'),
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminAiFlagsController(contentFlagService as never);
  });

  describe('list', () => {
    it('defaults to listing pending flags', async () => {
      contentFlagService.listFlags.mockResolvedValue({ flags: [], total: 0 });

      await controller.list({});

      expect(contentFlagService.listFlags).toHaveBeenCalledWith({
        status: 'pending',
        entityType: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it('passes through an explicit status/limit/offset', async () => {
      contentFlagService.listFlags.mockResolvedValue({ flags: [], total: 0 });

      await controller.list({ status: 'reviewed', limit: 10, offset: 20 });

      expect(contentFlagService.listFlags).toHaveBeenCalledWith({
        status: 'reviewed',
        limit: 10,
        offset: 20,
      });
    });

    it('passes through the entity type filter', async () => {
      contentFlagService.listFlags.mockResolvedValue({ flags: [], total: 0 });

      await controller.list({ status: 'pending', entityType: 'listing', limit: 10, offset: 20 });

      expect(contentFlagService.listFlags).toHaveBeenCalledWith({
        status: 'pending',
        entityType: 'listing',
        limit: 10,
        offset: 20,
      });
    });

    it('returns what the service returns', async () => {
      const payload = { flags: [{ id: 'flag-1' }], total: 1 };
      contentFlagService.listFlags.mockResolvedValue(payload);

      const result = await controller.list({});

      expect(result).toEqual(payload);
    });
  });

  describe('resolve', () => {
    it('resolves the flag as the authenticated admin, forwarding ip/user-agent', async () => {
      contentFlagService.resolveFlag.mockResolvedValue({
        id: 'flag-1',
        status: 'reviewed',
      });

      await controller.resolve('flag-1', { status: 'reviewed' }, user, req);

      expect(contentFlagService.resolveFlag).toHaveBeenCalledWith('flag-1', {
        status: 'reviewed',
        reviewedBy: 'admin-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });
    });

    it('passes through the entity type filter', async () => {
      contentFlagService.listFlags.mockResolvedValue({ flags: [], total: 0 });

      await controller.list({ status: 'pending', entityType: 'listing', limit: 10, offset: 20 });

      expect(contentFlagService.listFlags).toHaveBeenCalledWith({
        status: 'pending',
        entityType: 'listing',
        limit: 10,
        offset: 20,
      });
    });

    it('returns what the service returns', async () => {
      const payload = { id: 'flag-1', status: 'dismissed' };
      contentFlagService.resolveFlag.mockResolvedValue(payload);

      const result = await controller.resolve(
        'flag-1',
        { status: 'dismissed' },
        user,
        req,
      );

      expect(result).toEqual(payload);
    });
  });
});
