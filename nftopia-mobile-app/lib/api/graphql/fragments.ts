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

// Card-sized field sets for Home discovery sections. Field names here match
// the backend schema.graphql exactly (`image`, not `imageUrl`) since these
// are new queries, not the legacy NFT_FIELDS_FRAGMENT above.
export const COLLECTION_CARD_FIELDS_FRAGMENT = gql`
  fragment CollectionCardFields on Collection {
    id
    name
    image
    floorPrice
    totalVolume
    totalSupply
    isVerified
  }
`;

export const LISTING_CARD_FIELDS_FRAGMENT = gql`
  fragment ListingCardFields on Listing {
    id
    price
    currency
    createdAt
    nft {
      id
      name
      image
    }
  }
`;

export const NFT_CARD_FIELDS_FRAGMENT = gql`
  fragment NFTCardFields on NFT {
    id
    name
    image
  }
`;
