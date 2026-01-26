import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@empat-challenge/web-ui";
import { Button } from "@empat-challenge/web-ui";
import { Input } from "@empat-challenge/web-ui";
import { Copy, Check, X } from "lucide-react";
import type { SessionLinkResponse } from "@/hooks/use-therapy-sessions";

interface GenerateLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionLink: SessionLinkResponse | null;
  studentName: string;
  onClose: () => void;
}

export function GenerateLinkDialog({
  open,
  onOpenChange,
  sessionLink,
  studentName,
  onClose,
}: GenerateLinkDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!sessionLink?.linkUrl) return;

    try {
      await navigator.clipboard.writeText(sessionLink.linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "No expiration";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Link Generated</DialogTitle>
          <DialogDescription>
            Share this link with {studentName ? `${studentName} and other students` : "your students"} to join the therapy session. All students can use the same link.
          </DialogDescription>
        </DialogHeader>

        {sessionLink && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Link</label>
              <div className="flex gap-2">
                <Input
                  value={sessionLink.linkUrl}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expires At</label>
              <p className="text-sm text-muted-foreground">
                {formatDate(sessionLink.expiresAt)}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
