import { createFileRoute } from "@tanstack/react-router";
import { StudentDashboard } from "@/components/student/student-dashboard";

export const Route = createFileRoute("/_authenticated/student-dashboard/")({
  component: StudentDashboardComponent,
});

function StudentDashboardComponent() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <StudentDashboard />
    </div>
  );
}
