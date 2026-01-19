import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// React Query client with error handling
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});
