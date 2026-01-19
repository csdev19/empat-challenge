import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  HiringProcessBase,
  CreateHiringProcess,
  UpdateHiringProcess,
} from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type { Currency, HiringProcessStatus } from "@empat-challenge/domain/constants";

// Re-export domain types for convenience
export type HiringProcess = HiringProcessBase;
export type CreateHiringProcessInput = CreateHiringProcess;
export type UpdateHiringProcessInput = UpdateHiringProcess;

// Query keys
const hiringProcessKeys = {
  all: ["hiringProcesses"] as const,
  lists: () => [...hiringProcessKeys.all, "list"] as const,
  list: () => [...hiringProcessKeys.lists()] as const,
  details: () => [...hiringProcessKeys.all, "detail"] as const,
  detail: (id: string) => [...hiringProcessKeys.details(), id] as const,
};

// Fetch all hiring processes
export function useHiringProcesses() {
  return useQuery({
    queryKey: hiringProcessKeys.list(),
    queryFn: async () => {
      // const result = await clientTreaty.api.v1["hiring-processes"].get();
      const result = await clientTreaty.api.v1["hiring-processes"].get();

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
  });
}

// Fetch single hiring process
export function useHiringProcess(id: string) {
  return useQuery({
    queryKey: hiringProcessKeys.detail(id),
    queryFn: async () => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).get();
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

// Create hiring process mutation
export function useCreateHiringProcess() {
  const queryClient = useQueryClient();

  return useMutation<HiringProcess, Error, CreateHiringProcessInput>({
    mutationFn: async (data: CreateHiringProcessInput): Promise<HiringProcess> => {
      const result = await clientTreaty.api.v1["hiring-processes"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      // Backend returns { data: HiringProcess }, so we need to access result.data.data
      return (result.data as { data: HiringProcess }).data;
    },
    onSuccess: () => {
      // Invalidate and refetch hiring processes list
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.list() });
    },
  });
}

// Update hiring process mutation
export function useUpdateHiringProcess() {
  const queryClient = useQueryClient();

  return useMutation<HiringProcess, Error, { id: string; data: UpdateHiringProcessInput }>({
    mutationFn: async ({ id, data }): Promise<HiringProcess> => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      // Backend returns { data: HiringProcess }, so we need to access result.data.data
      return (result.data as { data: HiringProcess }).data;
    },
    onSuccess: (_, variables) => {
      // Invalidate both list and specific detail
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.list() });
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.detail(variables.id) });
    },
  });
}

// Delete hiring process mutation
export function useDeleteHiringProcess() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const result = await clientTreaty.api.v1["hiring-processes"]({ id }).delete();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return;
    },
    onSuccess: () => {
      // Invalidate hiring processes list
      queryClient.invalidateQueries({ queryKey: hiringProcessKeys.list() });
    },
  });
}
