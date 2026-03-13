import { Suspense } from "react";
import { getQueryClient, trpc } from "@/trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import Client from "@/app/Client";

const page = () => {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.hello.queryOptions({ text: "Anurag" }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div>Loading...</div>}>
        <Client />
      </Suspense>
    </HydrationBoundary>
  );
};

export default page;
