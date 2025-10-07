'use client';

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const Page = () => {
  const trpc = useTRPC();
  const invoke = useMutation(trpc.invoke.mutationOptions({
    onSuccess: (data) => {
      toast.success("Background job started");
    },
  }));
  return (
    <div>
      <Button disabled={invoke.isPending} onClick={() => invoke.mutate({ text: 'client' })}>
        Invoke
      </Button>
    </div>
  )
};

export default Page;