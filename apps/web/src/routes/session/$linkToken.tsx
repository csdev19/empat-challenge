import { createFileRoute } from "@tanstack/react-router";
import { StudentSessionView } from "@/components/session/student-session-view";

export const Route = createFileRoute("/session/$linkToken")({
  component: SessionPage,
});

function SessionPage() {
  const { linkToken } = Route.useParams();

  return <StudentSessionView linkToken={linkToken} />;
}
