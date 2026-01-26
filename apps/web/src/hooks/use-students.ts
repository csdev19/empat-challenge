import { useQuery } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import { useSession } from "@/hooks/use-session";
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
  const { session } = useSession();
  const isAuthenticated = !!session;

  return useQuery<StudentsResponse>({
    queryKey: studentKeys.list(),
    queryFn: async (): Promise<StudentsResponse> => {
      const result = await clientTreaty.api.v1.students.get();

      if (result.error) {
        const errorMessage = getErrorMessage(result.error);
        // If it's a 404, it might mean no SLP profile or no students
        // Return empty response instead of throwing
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
          return {
            data: [],
            error: null,
            meta: {
              pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              },
            },
          } as StudentsResponse;
        }
        throw new Error(errorMessage);
      }

      if (!result.data) {
        throw new Error("No data returned from server");
      }

      const { error, data } = result.data;
      if (error) {
        // If it's a "not found" error, return empty list instead of throwing
        if (error.message?.includes("not found") || error.message?.includes("404")) {
          return {
            data: [],
            error: null,
            meta: {
              pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              },
            },
          } as StudentsResponse;
        }
        throw new Error(error?.message || "An error occurred");
      }

      return result.data as StudentsResponse;
    },
    enabled: isAuthenticated, // Only fetch when authenticated
    retry: false, // Don't retry on 404 (likely means no SLP profile or no students)
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
