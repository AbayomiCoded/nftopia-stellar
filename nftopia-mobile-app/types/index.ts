export interface User {
  id: string;
  address: string;
  username?: string;
  avatarUrl?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  creator: User;
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

export interface NFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: User;
  owner: User;
  collection?: Collection;
  attributes: NFTAttribute[];
  history: TransferEvent[];
}
