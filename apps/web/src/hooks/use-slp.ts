import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type { SLPBase, CreateSLP, UpdateSLP } from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type { SLPBase, CreateSLP, UpdateSLP };

// Query keys
const slpKeys = {
  all: ["slp"] as const,
  profile: () => [...slpKeys.all, "profile"] as const,
};

// Fetch current user's SLP profile
export function useSLP() {
  return useQuery({
    queryKey: slpKeys.profile(),
    queryFn: async (): Promise<SLPBase> => {
      const result = await clientTreaty.api.v1.slp.get();

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }

      if (!result.data) {
        throw new Error("No data returned from server");
      }

      const { error, data } = result.data;
      if (error) {
        throw new Error(error?.message || "An error occurred");
      }

      return data;
    },
    retry: false, // Don't retry on 404 (profile not found)
  });
}

// Create SLP profile mutation
export function useCreateSLP() {
  const queryClient = useQueryClient();

  return useMutation<SLPBase, Error, CreateSLP>({
    mutationFn: async (data: CreateSLP): Promise<SLPBase> => {
      const result = await clientTreaty.api.v1.slp.post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: SLPBase }).data;
    },
    onSuccess: () => {
      // Invalidate SLP profile query
      queryClient.invalidateQueries({ queryKey: slpKeys.profile() });
    },
  });
}

// Update SLP profile mutation
export function useUpdateSLP() {
  const queryClient = useQueryClient();

  return useMutation<SLPBase, Error, UpdateSLP>({
    mutationFn: async (data: UpdateSLP): Promise<SLPBase> => {
      const result = await clientTreaty.api.v1.slp.put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: SLPBase }).data;
    },
    onSuccess: () => {
      // Invalidate SLP profile query
      queryClient.invalidateQueries({ queryKey: slpKeys.profile() });
    },
  });
}
