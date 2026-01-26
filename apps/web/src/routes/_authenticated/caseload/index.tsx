import { createFileRoute, Navigate } from "@tanstack/react-router";
import { CaseloadView } from "@/components/caseload/caseload-view";
import { useUserRole } from "@/hooks/use-user-role";

export const Route = createFileRoute("/_authenticated/caseload/")({
  component: CaseloadComponent,
});

function CaseloadComponent() {
  const { role, isLoading } = useUserRole();

  // Redirect students and unknown users away from caseload
  if (!isLoading && role !== "teacher") {
    return <Navigate to="/" />;
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <CaseloadView />
    </div>
  );
}
