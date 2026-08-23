import { gql } from '@apollo/client';
import { NFT_FIELDS_FRAGMENT, TRANSFER_EVENT_FIELDS_FRAGMENT } from './fragments';

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
