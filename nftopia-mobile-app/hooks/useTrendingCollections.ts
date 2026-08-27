import { useQuery } from '@apollo/client';
import { GET_TOP_COLLECTIONS_QUERY } from '@/lib/api/graphql/queries';
import {
  mapTrendingCollections,
  TrendingCollectionRaw,
} from '@/src/utils/discoveryViewModels';

export interface TopCollectionsData {
  topCollections: TrendingCollectionRaw[];
}

export interface TopCollectionsVars {
  limit?: number;
}

export const useTrendingCollections = (limit = 10) => {
  const { data, loading, error, refetch } = useQuery<
    TopCollectionsData,
    TopCollectionsVars
  >(GET_TOP_COLLECTIONS_QUERY, {
    variables: { limit },
    notifyOnNetworkStatusChange: true,
  });

  return {
    collections: mapTrendingCollections(data?.topCollections),
    loading,
    error,
    refetch,
  };
};
