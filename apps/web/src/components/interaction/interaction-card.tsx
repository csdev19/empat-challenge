import { Card, CardContent, Button, MarkdownContent } from "@empat-challenge/web-ui";
import { InteractionTypeBadge } from "./interaction-type-badge";
import type { Interaction } from "@/hooks/use-interactions";
import { Pencil, Trash2 } from "lucide-react";

interface InteractionCardProps {
  interaction: Interaction;
  onEdit?: (interaction: Interaction) => void;
  onDelete?: (interaction: Interaction) => void;
}

export function InteractionCard({ interaction, onEdit, onDelete }: InteractionCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <InteractionTypeBadge type={interaction.type} />
            <span className="text-xs text-muted-foreground">
              {formatDate(interaction.createdAt)}
            </span>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(interaction)}
                className="hover:bg-primary/10"
              >
                <Pencil className="size-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(interaction)}
                className="hover:bg-destructive/10"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>

        {interaction.title && (
          <h4 className="font-semibold text-base mb-3 text-foreground/90 border-l-4 border-primary pl-3">
            {interaction.title}
          </h4>
        )}

        <MarkdownContent content={interaction.content} variant="compact" />
      </CardContent>
    </Card>
  );
}
