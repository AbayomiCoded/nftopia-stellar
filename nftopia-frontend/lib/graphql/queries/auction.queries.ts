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
      }
      bids {
        id
        amount
        bidderId
        createdAt
      }
      highestBid {
        id
        amount
        bidderId
        createdAt
      }
      seller {
        id
        username
        walletAddress
      }
    }
  }
  ${AUCTION_FIELDS_FRAGMENT}
`;