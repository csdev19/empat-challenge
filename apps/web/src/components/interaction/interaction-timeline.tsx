import { useInteractions } from "@/hooks/use-interactions";
import { InteractionCard } from "./interaction-card";
import type { Interaction } from "@/hooks/use-interactions";

interface InteractionTimelineProps {
  hiringProcessId: string;
  onEdit?: (interaction: Interaction) => void;
  onDelete?: (interaction: Interaction) => void;
}

export function InteractionTimeline({
  hiringProcessId,
  onEdit,
  onDelete,
}: InteractionTimelineProps) {
  const { data, isLoading, error } = useInteractions(hiringProcessId);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Loading interactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Error loading interactions"}
        </p>
      </div>
    );
  }

  const interactions = data?.data || [];

  if (interactions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No interactions yet. Add your first note to track this hiring process.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {interactions.map((interaction) => (
        <InteractionCard
          key={interaction.id}
          interaction={interaction}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
