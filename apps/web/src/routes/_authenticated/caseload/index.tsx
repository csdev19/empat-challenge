import { createFileRoute } from "@tanstack/react-router";
import { CaseloadView } from "@/components/caseload/caseload-view";

export const Route = createFileRoute("/_authenticated/caseload/")({
  component: CaseloadComponent,
  beforeLoad: async () => {
    // TODO: context.session should be typed from the parent layout middleware
  },
});

function CaseloadComponent() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <CaseloadView />
    </div>
  );
}
