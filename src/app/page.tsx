"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Page: React.FC = () => {
  const [value, setValue] = useState<string>("");
  const trpc = useTRPC();

  const { data: messages } = useQuery(trpc.messages.getMany.queryOptions());
  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        toast.success("Background job started!");
      },
    }),
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Input
        placeholder="Enter text..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        disabled={createMessage.isPending}
        onClick={() => createMessage.mutate({ value: value })}
      >
        Invoke background job
      </Button>
      {JSON.stringify(messages, null, 2)}
    </div>
  );
};

export default Page;
