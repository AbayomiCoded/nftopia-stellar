import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        nfts: {
          keyArgs: false,
          merge(existing, incoming) {
            if (!existing) return incoming;
            if (!incoming) return existing;
            
            return {
              ...incoming,
              edges: [...(existing.edges || []), ...(incoming.edges || [])],
            };
          },
        },
      },
    },
  },
});

export const setupApollo = async () => {
  await persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
  });
  
  return new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.nftopia.app/graphql', // Replace with actual GraphQL endpoint
    }),
    cache,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });
};
