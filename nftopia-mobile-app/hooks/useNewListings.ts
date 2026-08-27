import { useQuery } from '@apollo/client';
import { GET_NEW_LISTINGS_QUERY } from '@/lib/api/graphql/queries';
import { mapNewListings, NewListingRaw } from '@/src/utils/discoveryViewModels';

export interface NewListingsData {
  listings: {
    edges: { cursor: string; node: NewListingRaw }[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
    totalCount: number;
  };
}

export interface NewListingsVars {
  first?: number;
}

export const useNewListings = (first = 10) => {
  const { data, loading, error, refetch } = useQuery<
    NewListingsData,
    NewListingsVars
  >(GET_NEW_LISTINGS_QUERY, {
    variables: { first },
    notifyOnNetworkStatusChange: true,
  });

  const listings = data?.listings.edges.map((edge) => edge.node) ?? [];

  return {
    drops: mapNewListings(listings),
    loading,
    error,
    refetch,
  };
};
