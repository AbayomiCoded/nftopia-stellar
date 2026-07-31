import { NFT, Collection, DashboardStats, ActivityEvent, Transaction, Notification, NotificationPreferences, MintFormData } from '@/types';

const API_BASE_URL = 'https://api.nftopia.io/v1';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: any = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Dashboard API
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/creator/dashboard/stats');
  }

  async getActivityFeed(page: number = 1, limit: number = 20): Promise<ActivityEvent[]> {
    return this.request<ActivityEvent[]>(`/creator/activity?page=${page}&limit=${limit}`);
  }

  // NFT API
  async getMyNFTs(page: number = 1, limit: number = 20): Promise<NFT[]> {
    return this.request<NFT[]>(`/nfts/mine?page=${page}&limit=${limit}`);
  }

  async getNFTById(id: string): Promise<NFT> {
    return this.request<NFT>(`/nfts/${id}`);
  }

  async mintNFT(formData: MintFormData): Promise<NFT> {
    const form = new FormData();
    form.append('name', formData.name);
    form.append('description', formData.description);
    form.append('price', formData.price);
    form.append('currency', formData.currency);
    form.append('contractAddress', formData.contractAddress);
    if (formData.collectionId) {
      form.append('collectionId', formData.collectionId);
    }
    if (formData.image) {
      const filename = formData.image.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('image', { uri: formData.image, name: filename, type } as any);
    }
    if (formData.attributes) {
      form.append('attributes', JSON.stringify(formData.attributes));
    }

    return this.request<NFT>('/nfts/mint', {
      method: 'POST',
      body: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // Collection API
  async getMyCollections(page: number = 1, limit: number = 20): Promise<Collection[]> {
    return this.request<Collection[]>(`/collections/mine?page=${page}&limit=${limit}`);
  }

  async createCollection(data: { name: string; description: string; image?: string; banner?: string }): Promise<Collection> {
    const form = new FormData();
    form.append('name', data.name);
    form.append('description', data.description);
    if (data.image) {
      const filename = data.image.split('/').pop() || 'collection.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('image', { uri: data.image, name: filename, type } as any);
    }
    if (data.banner) {
      const filename = data.banner.split('/').pop() || 'banner.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('banner', { uri: data.banner, name: filename, type } as any);
    }

    return this.request<Collection>('/collections', {
      method: 'POST',
      body: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // Earnings & Transactions API
  async getEarnings(): Promise<{ totalEarnings: string; pendingEarnings: string; totalSales: number }> {
    return this.request('/creator/earnings');
  }

  async getTransactions(page: number = 1, limit: number = 20): Promise<Transaction[]> {
    return this.request<Transaction[]>(`/creator/transactions?page=${page}&limit=${limit}`);
  }

  // Notifications API
  async getNotifications(page: number = 1, limit: number = 20): Promise<Notification[]> {
    return this.request<Notification[]>(`/notifications?page=${page}&limit=${limit}`);
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/notifications/unread/count');
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request('/notifications/read-all', { method: 'PUT' });
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/notifications/preferences');
  }

  async updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  }

  // Push Notification Token
  async registerPushToken(token: string): Promise<void> {
    await this.request('/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Telemetry
  async trackEvent(event: string, properties?: Record<string, any>): Promise<void> {
    try {
      await this.request('/telemetry/track', {
        method: 'POST',
        body: JSON.stringify({ event, properties, timestamp: new Date().toISOString() }),
      });
    } catch {
      // Silently fail telemetry
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;