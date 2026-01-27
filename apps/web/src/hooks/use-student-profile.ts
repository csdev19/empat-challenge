import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  StudentBase,
  CreateStudentProfile,
  UpdateStudentProfile,
} from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type { StudentBase, CreateStudentProfile, UpdateStudentProfile };

// Query keys
const studentProfileKeys = {
  all: ["student-profile"] as const,
  profile: () => [...studentProfileKeys.all, "profile"] as const,
};

// Fetch current user's student profile
export function useStudentProfile() {
  return useQuery({
    queryKey: studentProfileKeys.profile(),
    queryFn: async (): Promise<StudentBase> => {
      const result = await clientTreaty.api.v1["student-profile"].get();

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

// Create student profile mutation
export function useCreateStudentProfile() {
  const queryClient = useQueryClient();

  return useMutation<StudentBase, Error, CreateStudentProfile>({
    mutationFn: async (data: CreateStudentProfile): Promise<StudentBase> => {
      const result = await clientTreaty.api.v1["student-profile"].post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: StudentBase }).data;
    },
    onSuccess: () => {
      // Invalidate student profile query
      queryClient.invalidateQueries({ queryKey: studentProfileKeys.profile() });
    },
  });
}

// Update student profile mutation
export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();

  return useMutation<StudentBase, Error, UpdateStudentProfile>({
    mutationFn: async (data: UpdateStudentProfile): Promise<StudentBase> => {
      const result = await clientTreaty.api.v1["student-profile"].put(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: StudentBase }).data;
    },
    onSuccess: () => {
      // Invalidate student profile query
      queryClient.invalidateQueries({ queryKey: studentProfileKeys.profile() });
    },
  });
}
