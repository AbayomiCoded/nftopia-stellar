import { useQuery } from '@apollo/client';
import { GET_NFT_CARD_QUERY } from '@/lib/api/graphql/queries';

export interface NFTCard {
  id: string;
  name: string;
  image: string | null;
}

export interface NFTCardData {
  nft: NFTCard | null;
}

export interface NFTCardVars {
  id: string;
}

/** Minimal single-NFT lookup (id, name, image) for card-style list items. */
export const useNFTCard = (nftId: string) => {
  const { data, loading, error } = useQuery<NFTCardData, NFTCardVars>(
    GET_NFT_CARD_QUERY,
    {
      variables: { id: nftId },
      skip: !nftId,
    }
  );

  return {
    nft: data?.nft ?? null,
    loading,
    error,
  };
};
