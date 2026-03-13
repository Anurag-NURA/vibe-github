import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  //query client is like redux store for react-query, it holds the cache and configuration
  return new QueryClient({
    defaultOptions: {
      queries: {
        //hold the cached data for 30 seconds
        staleTime: 30 * 1000,
      },
      //this runs when server sends query data to browser(client)
      dehydrate: {
        //bacically normal json cannot serialize complex data types like dates, maps, sets, etc. superjson can handle these types and convert them to a format that can be safely transmitted over the network and then reconstructed on the client side.
        serializeData: superjson.serialize,

        /*Dehydration means next.js server will fetch data
        --> react query will cache it
        --> then sends the cached data to the browser(client)
        --> then react query on the client will use that cached data instead of making another request to the server.
        -->This improves performance and reduces unnecessary network requests.*/
        shouldDehydrateQuery: (query) => {
          //defaultShouldDehydreateQuery means only dehydrate successfull queries
          //"pending": This allows pending queries to be streamed to the client.
          return (
            defaultShouldDehydrateQuery(query) ||
            query.state.status === "pending"
          );
        },
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}

/* 
1. server components (runs api.post.getPosts()) 
2. React Query stores in cache (in server)
3. Dehyrdate the cache and send to client(browser): React query converts cache to JSON
4. Sent to browser: Embeded in HTML
5. Browser loads: React query runs superjson.deserialize
6. cache stored successfully in browser, no need to fetch data again from server, React query uses the cache to render the UI
*/
