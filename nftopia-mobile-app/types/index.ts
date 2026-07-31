// ============================================================
// Core Types
// ============================================================

export interface User {
  id: string;
  address: string;
  username?: string;
  avatarUrl?: string;
}

export interface NFTAttribute {
  trait_type: string;
  value: string;
}

export interface TransferEvent {
  id: string;
  type: 'mint' | 'transfer' | 'sale';
  fromAddress?: string;
  toAddress: string;
  date: string;
  price?: string;
  transactionHash: string;
}

// ============================================================
// NFT Types
// ============================================================

export interface NFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  currency: string;
  contractAddress: string;
  collectionId?: string;
  creatorId: string;
  ownerId: string;
  status: 'draft' | 'minted' | 'listed' | 'sold';
  createdAt: string;
  updatedAt: string;
  metadata?: NFTMetadata;
  creator: User;
  owner: User;
  collection?: Collection;
  attributes: NFTAttribute[];
  history: TransferEvent[];
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: NFTAttribute[];
  external_url?: string;
}

// ============================================================
// Collection Types
// ============================================================

export interface Collection {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  creatorId: string;
  creator: User;
  contractAddress?: string;
  nftCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Creator Dashboard Types
// ============================================================

export interface DashboardStats {
  totalNfts: number;
  totalCollections: number;
  totalEarnings: string;
  totalSales: number;
  floorPrice: string;
  volumeTraded: string;
}

export interface ActivityEvent {
  id: string;
  type: 'sale' | 'purchase' | 'mint' | 'listing' | 'offer' | 'transfer';
  nftId: string;
  nftName: string;
  nftImage: string;
  from?: string;
  to?: string;
  price?: string;
  currency?: string;
  timestamp: string;
  status?: 'pending' | 'confirmed' | 'failed';
}

export interface Transaction {
  id: string;
  type: 'sale' | 'purchase' | 'mint' | 'royalty';
  nftId: string;
  nftName: string;
  nftImage: string;
  amount: string;
  currency: string;
  from: string;
  to: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

// ============================================================
// Notification Types
// ============================================================

export interface Notification {
  id: string;
  type: 'outbid' | 'sale' | 'follow' | 'mint' | 'auction_end' | 'listing' | 'offer' | 'transfer';
  title: string;
  message: string;
  data?: {
    nftId?: string;
    nftName?: string;
    nftImage?: string;
    userId?: string;
    userName?: string;
    amount?: string;
    currency?: string;
  };
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  outbid: boolean;
  sale: boolean;
  follow: boolean;
  mint: boolean;
  auction_end: boolean;
  listing: boolean;
  offer: boolean;
  transfer: boolean;
  pushEnabled: boolean;
}

// ============================================================
// Offline Types
// ============================================================

export interface OfflineQueueItem {
  id: string;
  action: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

export interface CachedData {
  nfts: NFT[];
  collections: Collection[];
  notifications: Notification[];
  favorites: string[];
  watchlist: string[];
  recentSearches: string[];
  lastSync: string;
}

// ============================================================
// Minting Types
// ============================================================

export interface MintFormData {
  name: string;
  description: string;
  price: string;
  currency: string;
  collectionId?: string;
  contractAddress: string;
  image: string | null;
  attributes?: NFTAttribute[];
}

export interface MintState {
  loading: boolean;
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
  mintedNft?: NFT;
}

// ============================================================
// Telemetry Types
// ============================================================

export interface TelemetryEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
}

// ============================================================
// Navigation Types
// ============================================================

export type CreatorStackParamList = {
  CreatorDashboard: undefined;
  MyNFTs: undefined;
  MintNFT: undefined;
  CreateCollection: undefined;
  NFTDetail: { nftId: string };
  CollectionDetail: { collectionId: string };
  Earnings: undefined;
  Transactions: undefined;
};

export type NotificationStackParamList = {
  Notifications: undefined;
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Marketplace: undefined;
  Creator: undefined;
  Notifications: undefined;
  Profile: undefined;
};