import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  TrialDataBase,
  CreateTrialData,
  TrialDataBatch,
} from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type {
  TrialDataBase,
  CreateTrialData,
  TrialDataBatch,
};

// Query keys
const trialDataKeys = {
  all: ["trialData"] as const,
  lists: () => [...trialDataKeys.all, "list"] as const,
  list: (therapySessionId: string) =>
    [...trialDataKeys.lists(), therapySessionId] as const,
  stats: (therapySessionId: string) =>
    [...trialDataKeys.all, "stats", therapySessionId] as const,
};

// Fetch trials for a session
export function useTrials(therapySessionId: string) {
  return useQuery({
    queryKey: trialDataKeys.list(therapySessionId),
    queryFn: async (): Promise<TrialDataBase[]> => {
      const result = await clientTreaty.api.v1["trial-data"].get({
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

// Create single trial mutation
export function useCreateTrial() {
  const queryClient = useQueryClient();

  return useMutation<TrialDataBase, Error, CreateTrialData>({
    mutationFn: async (data: CreateTrialData): Promise<TrialDataBase> => {
      const result = await clientTreaty.api.v1["trial-data"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: TrialDataBase }).data;
    },
    onSuccess: (_, variables) => {
      // Invalidate trials list and stats for the session
      queryClient.invalidateQueries({
        queryKey: trialDataKeys.list(variables.therapySessionId),
      });
      queryClient.invalidateQueries({
        queryKey: trialDataKeys.stats(variables.therapySessionId),
      });
      // Also invalidate session recording
      queryClient.invalidateQueries({
        queryKey: ["sessionRecording", variables.therapySessionId],
      });
    },
  });
}

// Create batch trials mutation
export function useCreateTrialBatch() {
  const queryClient = useQueryClient();

  return useMutation<TrialDataBase[], Error, TrialDataBatch>({
    mutationFn: async (data: TrialDataBatch): Promise<TrialDataBase[]> => {
      const result = await clientTreaty.api.v1["trial-data"]["batch"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: TrialDataBase[] }).data;
    },
    onSuccess: (_, variables) => {
      // Invalidate trials list and stats for the session
      queryClient.invalidateQueries({
        queryKey: trialDataKeys.list(variables.therapySessionId),
      });
      queryClient.invalidateQueries({
        queryKey: trialDataKeys.stats(variables.therapySessionId),
      });
      // Also invalidate session recording
      queryClient.invalidateQueries({
        queryKey: ["sessionRecording", variables.therapySessionId],
      });
    },
  });
}

// Trial statistics (derived from trials)
export function useTrialStats(therapySessionId: string) {
  const { data: trials } = useTrials(therapySessionId);

  return {
    total: trials?.length || 0,
    correct: trials?.filter((t) => t.isCorrect).length || 0,
    incorrect: trials?.filter((t) => !t.isCorrect).length || 0,
    accuracy:
      trials && trials.length > 0
        ? (trials.filter((t) => t.isCorrect).length / trials.length) * 100
        : 0,
  };
}
