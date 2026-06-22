import { gql } from "@apollo/client";
import { AUCTION_FIELDS_FRAGMENT } from "../fragments";

export const GET_AUCTION_BY_ID_QUERY = gql`
  query GetAuctionById($id: ID!) {
    auction(id: $id) {
      ...AuctionFields
      nft {
        id
        name
        image
        tokenId
        description
        attributes {
          traitType
          value
          displayType
        }
        collection {
          id
          name
          symbol
          image
        }
        creator {
          id
          username
          walletAddress
        }
        owner {
          id
          username
          walletAddress
        }
      }
      bids {
        id
        amount
        bidderId
        bidder {
          id
          username
          walletAddress
        }
        createdAt
      }
      highestBid {
        id
        amount
        bidderId
        bidder {
          id
          username
        }
        createdAt
      }
      seller {
        id
        username
        walletAddress
      }
      winner {
        id
        username
        walletAddress
      }
    }
  }
  ${AUCTION_FIELDS_FRAGMENT}
`;