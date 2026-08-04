export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: {
    type: 'bid' | 'sale' | 'follow' | 'mint' | 'auction_end' | 'listing' | 'offer' | 'transfer';
    notificationId?: string;
    nftId?: string;
    nftName?: string;
    nftImage?: string;
    userId?: string;
    userName?: string;
    amount?: string;
    currency?: string;
    auctionId?: string;
    collectionId?: string;
    deepLink?: string;
    [key: string]: any;
  };
  sound?: 'default' | 'custom';
  priority?: 'high' | 'normal' | 'low';
  badge?: number;
}

export interface NotificationAction {
  id: string;
  title: string;
  type: 'foreground' | 'background' | 'default';
  icon?: string;
  destructive?: boolean;
  authenticationRequired?: boolean;
}

export interface NotificationCategory {
  id: string;
  actions: NotificationAction[];
  hiddenPreview?: boolean;
  customDismissAction?: boolean;
  allowInCarPlay?: boolean;
}