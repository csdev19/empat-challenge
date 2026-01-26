import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type {
  AddStudentsToCaseload,
} from "@empat-challenge/domain/schemas";
import { studentKeys } from "./use-students";

// Query keys
const caseloadKeys = {
  all: ["caseload"] as const,
  availableStudents: () => [...caseloadKeys.all, "available-students"] as const,
};

// Fetch available students (not in caseload)
export function useAvailableStudents(page = 1, limit = 50) {
  return useQuery({
    queryKey: [...caseloadKeys.availableStudents(), page, limit],
    queryFn: async () => {
      const result = await clientTreaty.api.v1.students.available.get({
        query: { page, limit },
      });

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }

      return result.data;
    },
  });
}

// Add students to caseload mutation
export function useAddStudentsToCaseload() {
  const queryClient = useQueryClient();

  return useMutation<
    { added: number; skipped: number; addedStudents: string[] },
    Error,
    AddStudentsToCaseload
  >({
    mutationFn: async (data: AddStudentsToCaseload) => {
      const result = await clientTreaty.api.v1.caseload.students.post(data);
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      return (result.data as { data: { added: number; skipped: number; addedStudents: string[] } })
        .data;
    },
    onSuccess: () => {
      // Invalidate caseload queries
      queryClient.invalidateQueries({ queryKey: studentKeys.list() });
      queryClient.invalidateQueries({ queryKey: caseloadKeys.availableStudents() });
    },
  });
}

// Remove student from caseload mutation
export function useRemoveStudentFromCaseload() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (studentId: string) => {
      const result = await clientTreaty.api.v1.caseload.students({ studentId }).delete();
      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
    },
    onSuccess: () => {
      // Invalidate caseload queries
      queryClient.invalidateQueries({ queryKey: studentKeys.list() });
      queryClient.invalidateQueries({ queryKey: caseloadKeys.availableStudents() });
    },
  });
}
