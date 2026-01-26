import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@empat-challenge/web-ui";
import { Textarea } from "@empat-challenge/web-ui";
import { useSessionRecording, useUpdateSessionRecording } from "@/hooks/use-session-recording";
import { Loader2, Save } from "lucide-react";

interface BehavioralNotesProps {
  therapySessionId: string;
}

export function BehavioralNotes({ therapySessionId }: BehavioralNotesProps) {
  const { data: recording, isLoading } = useSessionRecording(therapySessionId);
  const updateRecording = useUpdateSessionRecording();
  const [notes, setNotes] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize notes from recording
  useEffect(() => {
    if (recording?.behavioralNotes) {
      setNotes(recording.behavioralNotes);
      setHasUnsavedChanges(false);
    }
  }, [recording]);

  const handleSave = () => {
    updateRecording.mutate(
      {
        therapySessionId,
        data: { behavioralNotes: notes },
      },
      {
        onSuccess: () => {
          setHasUnsavedChanges(false);
        },
      },
    );
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setHasUnsavedChanges(e.target.value !== recording?.behavioralNotes);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Behavioral Notes</CardTitle>
        <CardDescription>
          Record behavioral observations and subjective notes about the session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Enter behavioral notes, observations, or other relevant information..."
          rows={8}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{notes.length} characters</span>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
            )}
            {updateRecording.isPending && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {updateRecording.isSuccess && !updateRecording.isPending && !hasUnsavedChanges && (
              <span className="text-sm text-green-600">Saved</span>
            )}
            <Button
              onClick={handleSave}
              disabled={updateRecording.isPending || !hasUnsavedChanges}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
