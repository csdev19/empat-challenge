import { useState } from "react";
import {
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
import { useCreateInteraction, type CreateInteractionInput } from "@/hooks/use-interactions";
import { toast } from "sonner";

interface InteractionFormProps {
  hiringProcessId: string;
  onSuccess?: () => void;
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

export function InteractionForm({ hiringProcessId, onSuccess }: InteractionFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<InteractionType>("note");

  const createMutation = useCreateInteraction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (content.length < 10) {
      toast.error("Content must be at least 10 characters");
      return;
    }

    const data: CreateInteractionInput = {
      content,
      title: title || undefined,
      type,
    };

    try {
      await createMutation.mutateAsync({ hiringProcessId, data });
      toast.success("Interaction added successfully");
      setTitle("");
      setContent("");
      setType("note");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to add interaction");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title (Optional)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Technical Interview Round 2"
            maxLength={100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as InteractionType)}>
            <SelectTrigger id="type">
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
        <Label htmlFor="content">Content (Markdown supported)</Label>
        <div data-color-mode="light" className="dark:data-[color-mode=light]:hidden">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || "")}
            preview="edit"
            height={200}
          />
        </div>
        <div data-color-mode="dark" className="data-[color-mode=dark]:hidden dark:block">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || "")}
            preview="edit"
            height={200}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {content.length} / 10000 characters (minimum 10)
        </p>
      </div>

      <Button type="submit" disabled={createMutation.isPending || content.length < 10}>
        {createMutation.isPending ? "Adding..." : "Add Interaction"}
      </Button>
    </form>
  );
}
