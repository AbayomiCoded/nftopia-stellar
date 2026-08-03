import { useQuery } from '@apollo/client';
import { GET_NFTS_QUERY } from '@/lib/api/graphql/queries';
import { NFT } from '@/types';

export interface NFTsData {
  nfts: {
    edges: {
      cursor: string;
      node: NFT;
    }[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

export interface NFTsVars {
  first: number;
  after?: string;
}

export const useNFTs = () => {
  const { data, loading, error, fetchMore, refetch } = useQuery<NFTsData, NFTsVars>(GET_NFTS_QUERY, {
    variables: { first: 10 },
    notifyOnNetworkStatusChange: true,
  });

  const loadMore = () => {
    if (data?.nfts.pageInfo.hasNextPage && !loading) {
      fetchMore({
        variables: {
          after: data.nfts.pageInfo.endCursor,
        },
      });
    }
  };

  const nfts = data?.nfts.edges.map(edge => edge.node) || [];

  return {
    nfts,
    loading,
    error,
    loadMore,
    refetch,
    hasNextPage: data?.nfts.pageInfo.hasNextPage || false,
  };
};
