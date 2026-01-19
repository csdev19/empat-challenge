import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@empat-challenge/web-ui";
import MDEditor from "@uiw/react-md-editor";
import { type InteractionType } from "@empat-challenge/domain/constants";
import {
  useUpdateInteraction,
  type Interaction,
  type UpdateInteractionInput,
} from "@/hooks/use-interactions";
import { toast } from "sonner";

interface EditInteractionDialogProps {
  interaction: Interaction;
  hiringProcessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const interactionTypeLabels: Record<InteractionType, string> = {
  email: "Email",
  "phone-call": "Phone Call",
  "video-call": "Video Call",
  "in-person-meeting": "In-Person Meeting",
  "technical-challenge": "Technical Challenge",
  application: "Application",
  offer: "Offer",
  rejection: "Rejection",
  "follow-up": "Follow-up",
  note: "Note",
};

export function EditInteractionDialog({
  interaction,
  hiringProcessId,
  open,
  onOpenChange,
}: EditInteractionDialogProps) {
  const [title, setTitle] = useState(interaction.title || "");
  const [content, setContent] = useState(interaction.content);
  const [type, setType] = useState<InteractionType>(interaction.type || "note");

  const updateMutation = useUpdateInteraction();

  useEffect(() => {
    if (open) {
      setTitle(interaction.title || "");
      setContent(interaction.content);
      setType(interaction.type || "note");
    }
  }, [open, interaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (content.length < 10) {
      toast.error("Content must be at least 10 characters");
      return;
    }

    const data: UpdateInteractionInput = {
      content,
      title: title || undefined,
      type,
    };

    try {
      await updateMutation.mutateAsync({
        hiringProcessId,
        interactionId: interaction.id,
        data,
      });
      toast.success("Interaction updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update interaction");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Interaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-title">Title (Optional)</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as InteractionType)}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(interactionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-content">Content</Label>
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || "")}
              preview="edit"
              height={300}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || content.length < 10}>
              {updateMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
