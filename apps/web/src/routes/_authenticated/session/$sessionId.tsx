import { createFileRoute } from "@tanstack/react-router";
import { SLPSessionView } from "@/components/session/slp-session-view";

export const Route = createFileRoute("/_authenticated/session/$sessionId")({
  component: SLPSessionPage,
});

function SLPSessionPage() {
  const { sessionId } = Route.useParams();

  return <SLPSessionView sessionId={sessionId} />;
}
