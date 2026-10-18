jest.mock('@/src/config', () => ({ config: { api: { baseUrl: 'https://api.example.com', timeout: 30000 } } }));
const mockRefresh = jest.fn();
jest.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ refreshSession: mockRefresh }) } }));
jest.mock('@/src/services/auth/tokenStorage', () => ({ tokenStorage: { getAccessToken: jest.fn() } }));
import { apiClient } from '../sample';
import { tokenStorage } from '@/src/services/auth/tokenStorage';
const getToken = tokenStorage.getAccessToken as jest.Mock;
const response = (status: number) => ({ status, ok: status === 200, json: async () => status === 200 ? { totalEarnings: '10' } : { message: 'Unauthorized' } });
beforeEach(() => {
  jest.clearAllMocks();
  apiClient.setToken(null);
  getToken.mockResolvedValue('old');
  global.fetch = jest.fn();
});
it('refreshes a 401 and replays the request once with the rotated token', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
  mockRefresh.mockImplementation(async () => { getToken.mockResolvedValue('new'); return true; });
  await expect(apiClient.getEarnings()).resolves.toEqual({ totalEarnings: '10' });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.example.com/creator/earnings', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer new' }) }));
});
it('does not refresh again when the retry also returns 401', async () => {
  (fetch as jest.Mock).mockResolvedValue(response(401));
  mockRefresh.mockResolvedValue(true);
  await expect(apiClient.getEarnings()).rejects.toThrow('Unauthorized');
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('does not replay a request after failed refresh', async () => {
  (fetch as jest.Mock).mockResolvedValue(response(401));
  mockRefresh.mockResolvedValue(false);
  await expect(apiClient.getEarnings()).rejects.toThrow('Unauthorized');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('reuses a token already rotated by another request', async () => {
  getToken.mockResolvedValueOnce('old').mockResolvedValue('new');
  (fetch as jest.Mock).mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
  await apiClient.getEarnings();
  expect(mockRefresh).not.toHaveBeenCalled();
});
it('leaves non-401 errors alone', async () => {
  (fetch as jest.Mock).mockResolvedValue(response(403));
  await expect(apiClient.getEarnings()).rejects.toThrow();
  expect(mockRefresh).not.toHaveBeenCalled();
});
