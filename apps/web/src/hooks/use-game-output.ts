import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  GameOutputBase,
  CreateGameOutput,
  UpdateGameOutput,
} from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type {
  GameOutputBase,
  CreateGameOutput,
  UpdateGameOutput,
};

// Query keys
const gameOutputKeys = {
  all: ["gameOutput"] as const,
  lists: () => [...gameOutputKeys.all, "list"] as const,
  list: (therapySessionId: string) =>
    [...gameOutputKeys.lists(), therapySessionId] as const,
  details: () => [...gameOutputKeys.all, "detail"] as const,
  detail: (id: string) => [...gameOutputKeys.details(), id] as const,
};

// Fetch game outputs for a session
export function useGameOutputs(therapySessionId: string) {
  return useQuery({
    queryKey: gameOutputKeys.list(therapySessionId),
    queryFn: async (): Promise<GameOutputBase[]> => {
      const result = await clientTreaty.api.v1["game-output"].get({
        query: { therapySessionId },
      });

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
    enabled: !!therapySessionId,
  });
}

// Fetch single game output
export function useGameOutput(id: string) {
  return useQuery({
    queryKey: gameOutputKeys.detail(id),
    queryFn: async (): Promise<GameOutputBase> => {
      const result = await clientTreaty.api.v1["game-output"]({ id }).get();

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
    enabled: !!id,
  });
}

// Create game output mutation
export function useCreateGameOutput() {
  const queryClient = useQueryClient();

  return useMutation<GameOutputBase, Error, CreateGameOutput>({
    mutationFn: async (data: CreateGameOutput): Promise<GameOutputBase> => {
      const result = await clientTreaty.api.v1["game-output"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: GameOutputBase }).data;
    },
    onSuccess: (_, variables) => {
      // Invalidate game outputs list for the session
      queryClient.invalidateQueries({
        queryKey: gameOutputKeys.list(variables.therapySessionId),
      });
    },
  });
}

// Update game output mutation
export function useUpdateGameOutput() {
  const queryClient = useQueryClient();

  return useMutation<
    GameOutputBase,
    Error,
    { id: string; data: UpdateGameOutput }
  >({
    mutationFn: async ({
      id,
      data,
    }): Promise<GameOutputBase> => {
      const result = await clientTreaty.api.v1["game-output"]({ id }).put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: GameOutputBase }).data;
    },
    onSuccess: (updated) => {
      // Invalidate both the detail and list queries
      queryClient.invalidateQueries({
        queryKey: gameOutputKeys.detail(updated.id),
      });
      queryClient.invalidateQueries({
        queryKey: gameOutputKeys.list(updated.therapySessionId),
      });
    },
  });
}
