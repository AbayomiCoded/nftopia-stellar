import { gql } from '@apollo/client';

export const USER_FIELDS_FRAGMENT = gql`
  fragment UserFields on User {
    id
    address
    username
    avatarUrl
  }
`;

export const TRANSFER_EVENT_FIELDS_FRAGMENT = gql`
  fragment TransferEventFields on TransferEvent {
    id
    type
    fromAddress
    toAddress
    date
    price
    transactionHash
  }
`;

export const NFT_FIELDS_FRAGMENT = gql`
  ${USER_FIELDS_FRAGMENT}
  fragment NFTFields on NFT {
    id
    name
    description
    imageUrl
    creator {
      ...UserFields
    }
    owner {
      ...UserFields
    }
    attributes {
      trait_type
      value
    }
  }
`;
