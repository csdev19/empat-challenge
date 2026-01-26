import { useQuery } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type { StudentBase } from "@empat-challenge/domain/schemas";
import type { ApiResponse } from "@empat-challenge/domain/types";

// Re-export types from domain package
export type { StudentBase };

// Query keys
export const studentKeys = {
  all: ["students"] as const,
  lists: () => [...studentKeys.all, "list"] as const,
  list: () => [...studentKeys.lists()] as const,
  details: () => [...studentKeys.all, "detail"] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
};

// Type for paginated students response
export type StudentsResponse = ApiResponse<StudentBase[]> & {
  meta?: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

// Fetch all students in caseload
export function useStudents() {
  return useQuery<StudentsResponse>({
    queryKey: studentKeys.list(),
    queryFn: async (): Promise<StudentsResponse> => {
      const result = await clientTreaty.api.v1.students.get();

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

      return result.data as StudentsResponse;
    },
  });
}

// Fetch single student
export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: async () => {
      const result = await clientTreaty.api.v1.students({ id }).get();
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
