import { useQuery } from "@tanstack/react-query";
import { useSLP } from "@/hooks/use-slp";
import { useStudentProfile } from "@/hooks/use-student-profile";

export type UserRole = "teacher" | "student" | "unknown";

/**
 * Hook to determine the user's role (teacher/student)
 * Returns the role and loading state
 *
 * NOTE: This hook calls both SLP and Student endpoints to determine role.
 * This is intentional - we need to check both to know which role the user has.
 * The backend returns 404 for "not found" which is expected and handled gracefully.
 */
export function useUserRole() {
  const { data: slp, isLoading: slpLoading, error: slpError } = useSLP();
  const { data: student, isLoading: studentLoading, error: studentError } = useStudentProfile();

  const isLoading = slpLoading || studentLoading;

  // If user has SLP profile, they're a teacher
  if (slp && !slpError) {
    return { role: "teacher" as const, isLoading: false };
  }

  // If user has student profile, they're a student
  if (student && !studentError) {
    return { role: "student" as const, isLoading: false };
  }

  // If both failed with "not found", role is unknown (needs onboarding)
  // Note: 404 errors are expected and normal - they just mean the user doesn't have that profile type
  const slpNotFound =
    slpError instanceof Error &&
    (slpError.message.includes("not found") || slpError.message.includes("404"));
  const studentNotFound =
    studentError instanceof Error &&
    (studentError.message.includes("not found") || studentError.message.includes("404"));

  if (!isLoading && slpNotFound && studentNotFound) {
    return { role: "unknown" as const, isLoading: false };
  }

  return { role: "unknown" as const, isLoading };
}
