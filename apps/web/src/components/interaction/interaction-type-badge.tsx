import { Badge } from "@empat-challenge/web-ui";
import type { InteractionType } from "@empat-challenge/domain/constants";
import {
  Mail,
  Phone,
  Video,
  Users,
  Code,
  FileText,
  CheckCircle,
  XCircle,
  MessageCircle,
  StickyNote,
} from "lucide-react";

const typeConfig: Record<
  InteractionType,
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: string }
> = {
  email: { label: "Email", icon: Mail, variant: "default" },
  "phone-call": { label: "Phone Call", icon: Phone, variant: "default" },
  "video-call": { label: "Video Call", icon: Video, variant: "default" },
  "in-person-meeting": { label: "Meeting", icon: Users, variant: "default" },
  "technical-challenge": { label: "Technical", icon: Code, variant: "secondary" },
  application: { label: "Application", icon: FileText, variant: "secondary" },
  offer: { label: "Offer", icon: CheckCircle, variant: "default" },
  rejection: { label: "Rejection", icon: XCircle, variant: "destructive" },
  "follow-up": { label: "Follow-up", icon: MessageCircle, variant: "outline" },
  note: { label: "Note", icon: StickyNote, variant: "outline" },
};

export function InteractionTypeBadge({ type }: { type: InteractionType | null }) {
  if (!type) return null;
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant as any} className="gap-1">
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
