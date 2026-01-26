import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  TherapySessionBase,
  GenerateSessionLink,
  SessionLinkResponse,
  UpdateSessionStatus,
} from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type {
  TherapySessionBase,
  GenerateSessionLink,
  SessionLinkResponse,
  UpdateSessionStatus,
};

// Query keys
const therapySessionKeys = {
  all: ["therapySessions"] as const,
  lists: () => [...therapySessionKeys.all, "list"] as const,
  list: () => [...therapySessionKeys.lists()] as const,
  details: () => [...therapySessionKeys.all, "detail"] as const,
  detail: (id: string) => [...therapySessionKeys.details(), id] as const,
};

// Generate session link mutation
export function useGenerateSessionLink() {
  const queryClient = useQueryClient();

  return useMutation<SessionLinkResponse, Error, GenerateSessionLink>({
    mutationFn: async (data: GenerateSessionLink): Promise<SessionLinkResponse> => {
      const result = await clientTreaty.api.v1["therapy-sessions"]["generate-link"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: SessionLinkResponse }).data;
    },
    onSuccess: () => {
      // Invalidate sessions list to show new session
      queryClient.invalidateQueries({ queryKey: therapySessionKeys.list() });
    },
  });
}

// Fetch single therapy session
export function useTherapySession(id: string) {
  return useQuery({
    queryKey: therapySessionKeys.detail(id),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["therapy-sessions"]({ id }).get();
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

// Fetch all therapy sessions
export function useTherapySessions() {
  return useQuery({
    queryKey: therapySessionKeys.list(),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["therapy-sessions"].get();

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
  });
}

// Update session status mutation
export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    TherapySessionBase,
    Error,
    { id: string; data: UpdateSessionStatus }
  >({
    mutationFn: async ({ id, data }): Promise<TherapySessionBase> => {
      const result = await clientTreaty.api.v1["therapy-sessions"]({ id })["status"].put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: TherapySessionBase }).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: therapySessionKeys.list() });
      queryClient.invalidateQueries({ queryKey: therapySessionKeys.detail(variables.id) });
    },
  });
}

// Start session mutation
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation<TherapySessionBase, Error, string>({
    mutationFn: async (id: string): Promise<TherapySessionBase> => {
      const result = await clientTreaty.api.v1["therapy-sessions"]({ id })["start"].post();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: TherapySessionBase }).data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: therapySessionKeys.list() });
      queryClient.invalidateQueries({ queryKey: therapySessionKeys.detail(id) });
    },
  });
}

// End session mutation
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation<
    TherapySessionBase,
    Error,
    { id: string; duration?: number }
  >({
    mutationFn: async ({
      id,
      duration,
    }): Promise<TherapySessionBase> => {
      const result = await clientTreaty.api.v1["therapy-sessions"]({ id })["end"].post({
        duration,
      });
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: TherapySessionBase }).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: therapySessionKeys.list() });
      queryClient.invalidateQueries({
        queryKey: therapySessionKeys.detail(variables.id),
      });
    },
  });
}

// Get join info for student (public endpoint)
export function useSessionJoinInfo(sessionId: string) {
  return useQuery({
    queryKey: [...therapySessionKeys.detail(sessionId), "join-info"],
    queryFn: async () => {
      const result = await clientTreaty.api.v1["therapy-sessions"]({
        id: sessionId,
      })["join-info"].get();

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

      return data as { dailyRoomUrl: string; studentToken: string };
    },
    enabled: !!sessionId,
  });
}
