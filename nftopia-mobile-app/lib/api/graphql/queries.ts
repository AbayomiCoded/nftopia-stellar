import { gql } from '@apollo/client';
import {
  NFT_FIELDS_FRAGMENT,
  TRANSFER_EVENT_FIELDS_FRAGMENT,
  COLLECTION_CARD_FIELDS_FRAGMENT,
  LISTING_CARD_FIELDS_FRAGMENT,
  NFT_CARD_FIELDS_FRAGMENT,
} from './fragments';

export const GET_NFTS_QUERY = gql`
  ${NFT_FIELDS_FRAGMENT}
  query GetNFTs($first: Int, $after: String) {
    nfts(first: $first, after: $after) {
      edges {
        cursor
        node {
          ...NFTFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_NFT_BY_ID_QUERY = gql`
  ${NFT_FIELDS_FRAGMENT}
  ${TRANSFER_EVENT_FIELDS_FRAGMENT}
  query GetNFTById($id: ID!) {
    nft(id: $id) {
      ...NFTFields
      history {
        ...TransferEventFields
      }
    }
  }
`;

// Home discovery: trending collections, ordered server-side by total volume.
export const GET_TOP_COLLECTIONS_QUERY = gql`
  ${COLLECTION_CARD_FIELDS_FRAGMENT}
  query GetTopCollections($limit: Int) {
    topCollections(limit: $limit) {
      ...CollectionCardFields
    }
  }
`;

// Home discovery: most recently created listings ("New Drops").
export const GET_NEW_LISTINGS_QUERY = gql`
  ${LISTING_CARD_FIELDS_FRAGMENT}
  query GetNewListings($first: Int) {
    listings(
      pagination: { first: $first }
      filter: { sortBy: "newest" }
    ) {
      edges {
        cursor
        node {
          ...ListingCardFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

// Recently viewed row: minimal per-card lookup by id (name + image only).
export const GET_NFT_CARD_QUERY = gql`
  ${NFT_CARD_FIELDS_FRAGMENT}
  query GetNFTCard($id: ID!) {
    nft(id: $id) {
      ...NFTCardFields
    }
  }
`;
