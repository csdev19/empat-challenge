import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { Textarea } from "@empat-challenge/web-ui";
import { useSessionRecording, useUpdateSessionRecording } from "@/hooks/use-session-recording";
import { Loader2 } from "lucide-react";

interface BehavioralNotesProps {
  therapySessionId: string;
}

export function BehavioralNotes({ therapySessionId }: BehavioralNotesProps) {
  const { data: recording, isLoading } = useSessionRecording(therapySessionId);
  const updateRecording = useUpdateSessionRecording();
  const [notes, setNotes] = useState("");

  // Initialize notes from recording
  useEffect(() => {
    if (recording?.behavioralNotes) {
      setNotes(recording.behavioralNotes);
    }
  }, [recording]);

  // Debounce auto-save
  const debouncedNotes = useDebounce(notes, 1000);

  useEffect(() => {
    if (debouncedNotes !== recording?.behavioralNotes && recording) {
      updateRecording.mutate({
        therapySessionId,
        data: { behavioralNotes: debouncedNotes },
      });
    }
  }, [debouncedNotes, therapySessionId, recording, updateRecording]);

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
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter behavioral notes, observations, or other relevant information..."
          rows={8}
          className="resize-none"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{notes.length} characters</span>
          {updateRecording.isPending && (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {updateRecording.isSuccess && !updateRecording.isPending && (
            <span className="text-green-600">Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
