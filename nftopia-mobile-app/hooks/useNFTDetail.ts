import { useQuery } from '@apollo/client';
import { GET_NFT_BY_ID_QUERY } from '@/lib/api/graphql/queries';
import { NFT } from '@/types';

export interface NFTDetailData {
  nft: NFT;
}

export interface NFTDetailVars {
  id: string;
}

export const useNFTDetail = (nftId: string) => {
  const { data, loading, error, refetch } = useQuery<NFTDetailData, NFTDetailVars>(GET_NFT_BY_ID_QUERY, {
    variables: { id: nftId },
    skip: !nftId,
  });

  return {
    nft: data?.nft || null,
    loading,
    error,
    refetch,
  };
};
