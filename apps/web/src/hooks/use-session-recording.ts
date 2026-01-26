import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  SessionRecordingWithTrials,
  UpdateSessionRecording,
} from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type {
  SessionRecordingWithTrials,
  UpdateSessionRecording,
};

// Query keys
const sessionRecordingKeys = {
  all: ["sessionRecording"] as const,
  detail: (therapySessionId: string) =>
    [...sessionRecordingKeys.all, therapySessionId] as const,
};

// Fetch session recording with trials
export function useSessionRecording(therapySessionId: string) {
  return useQuery({
    queryKey: sessionRecordingKeys.detail(therapySessionId),
    queryFn: async (): Promise<SessionRecordingWithTrials> => {
      const result = await clientTreaty.api.v1["session-recording"]({
        therapySessionId,
      }).get();

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

// Update session recording mutation
export function useUpdateSessionRecording() {
  const queryClient = useQueryClient();

  return useMutation<
    SessionRecordingWithTrials,
    Error,
    { therapySessionId: string; data: UpdateSessionRecording }
  >({
    mutationFn: async ({
      therapySessionId,
      data,
    }): Promise<SessionRecordingWithTrials> => {
      const result = await clientTreaty.api.v1["session-recording"]({
        therapySessionId,
      }).put(data);

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }

      return (result.data as { data: SessionRecordingWithTrials }).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: sessionRecordingKeys.detail(variables.therapySessionId),
      });
    },
  });
}

// Recalculate session metrics mutation
export function useRecalculateSessionMetrics() {
  const queryClient = useQueryClient();

  return useMutation<
    SessionRecordingWithTrials,
    Error,
    { therapySessionId: string }
  >({
    mutationFn: async ({
      therapySessionId,
    }): Promise<SessionRecordingWithTrials> => {
      const result = await clientTreaty.api.v1["session-recording"]({
        therapySessionId,
      })["recalculate"].post();

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }

      return (result.data as { data: SessionRecordingWithTrials }).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: sessionRecordingKeys.detail(variables.therapySessionId),
      });
    },
  });
}
