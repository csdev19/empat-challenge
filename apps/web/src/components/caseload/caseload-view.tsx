import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStudents } from "@/hooks/use-students";
import {
  useGenerateSessionLink,
  useTherapySessions,
  useEndSession,
} from "@/hooks/use-therapy-sessions";
import { useSLP } from "@/hooks/use-slp";
import { Button } from "@empat-challenge/web-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { GenerateLinkDialog } from "@/components/therapy-session/generate-link-dialog";
import { AddStudentsDialog } from "@/components/caseload/add-students-dialog";
import Loader from "@/components/loader";
import { toast } from "sonner";
import { Link2, User, Plus, Video, ExternalLink, Clock, Square } from "lucide-react";
import type { SessionLinkResponse } from "@/hooks/use-therapy-sessions";
import type { StudentBase } from "@/hooks/use-students";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";

export function CaseloadView() {
  const navigate = useNavigate();
  const { data: slp, isLoading: slpLoading, error: slpError } = useSLP();
  const { data, isLoading, error } = useStudents();
  const { data: sessionsData } = useTherapySessions();
  const generateLink = useGenerateSessionLink();
  const endSession = useEndSession();
  const [selectedStudent, setSelectedStudent] = useState<StudentBase | null>(null);
  const [sessionLink, setSessionLink] = useState<SessionLinkResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addStudentsDialogOpen, setAddStudentsDialogOpen] = useState(false);

  // Get active and scheduled sessions
  // sessionsData structure: { data: T[], error: null, meta: {...} }
  const sessions = sessionsData?.data || [];
  const activeSessions = sessions.filter(
    (s: any) =>
      s.status === THERAPY_SESSION_STATUSES.ACTIVE ||
      s.status === THERAPY_SESSION_STATUSES.SCHEDULED,
  );
  const hasActiveSession = activeSessions.length > 0;

  // Redirect to onboarding if SLP profile doesn't exist
  if (!slpLoading && slpError && !slp) {
    const errorMessage = slpError instanceof Error ? slpError.message : String(slpError);
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      navigate({ to: "/onboarding" });
      return null;
    }
  }

  // Get students list (handle empty case)
  const students =
    error &&
    error instanceof Error &&
    (error.message.includes("404") || error.message.includes("not found"))
      ? []
      : data?.data || [];

  const handleGenerateLink = async () => {
    // Check if there's already an active session
    if (hasActiveSession) {
      toast.error(
        "You already have an active session. Please end the current session before creating a new one.",
      );
      return;
    }

    // Get the first active student (or first student if no active filter)
    const activeStudents = students.filter((s) => !s.inactive);
    const studentToUse = activeStudents.length > 0 ? activeStudents[0] : students[0];

    if (!studentToUse) {
      toast.error("No students available to generate a session link");
      return;
    }

    try {
      const result = await generateLink.mutateAsync({ studentId: studentToUse.id });
      setSessionLink(result);
      setSelectedStudent(studentToUse);
      setDialogOpen(true);
      toast.success("Session link generated successfully! All students can use this link.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate session link";
      toast.error(errorMessage);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSessionLink(null);
    setSelectedStudent(null);
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await endSession.mutateAsync({ id: sessionId });
      toast.success("Session ended successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to end session";
      toast.error(errorMessage);
    }
  };

  // Show loading while checking SLP profile or students
  if (slpLoading || (slp && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  // Only show students error if SLP profile exists
  // If no SLP profile, we show the SLP profile creation dialog instead
  if (error && slp) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If it's a 404 or "not found", it might mean no students yet (which is fine)
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      // This is okay - just means no students in caseload yet
    } else {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }
  }

  // Only show students if SLP profile exists
  // If no SLP profile, the dialog will be shown above
  if (!slp) {
    return null; // Will be handled by the SLP profile creation dialog above
  }

  const pagination = data?.meta?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caseload</h1>
          <p className="text-muted-foreground mt-2">
            Manage your students and generate therapy session links
          </p>
        </div>
        <div className="flex gap-2">
          {students.length > 0 && (
            <Button
              onClick={handleGenerateLink}
              disabled={generateLink.isPending || hasActiveSession}
              variant="default"
              title={
                hasActiveSession
                  ? "Please end the current active session before creating a new one"
                  : undefined
              }
            >
              <Link2 className="h-4 w-4 mr-2" />
              {generateLink.isPending
                ? "Generating..."
                : hasActiveSession
                  ? "Active Session Exists"
                  : "Generate Session Link"}
            </Button>
          )}
          <Button onClick={() => setAddStudentsDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Students
          </Button>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              You have an active session. End it before creating a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSessions.map((session: any) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Session</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        session.status === THERAPY_SESSION_STATUSES.ACTIVE
                          ? "bg-green-500/20 text-green-600 dark:text-green-400"
                          : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {session.status === THERAPY_SESSION_STATUSES.ACTIVE ? "Active" : "Scheduled"}
                    </span>
                  </div>
                  {session.createdAt && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Created{" "}
                      {new Date(session.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  {session.expiresAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Expires{" "}
                      {new Date(session.expiresAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => {
                      if (session.id) {
                        navigate({ to: `/session/${session.id}` });
                      } else if (session.linkToken) {
                        navigate({ to: `/session/${session.linkToken}` });
                      }
                    }}
                    variant="outline"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Session
                  </Button>
                  {(session.status === THERAPY_SESSION_STATUSES.ACTIVE ||
                    session.status === THERAPY_SESSION_STATUSES.SCHEDULED) && (
                    <Button
                      onClick={() => handleEndSession(session.id)}
                      disabled={endSession.isPending}
                      variant="destructive"
                      title="End this session to allow creating a new one"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      {endSession.isPending ? "Ending..." : "End Session"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {students.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Students</CardTitle>
            <CardDescription>
              You don't have any students in your caseload yet. Add students to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setAddStudentsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Students to Caseload
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {student.name}
                    </CardTitle>
                    {student.age && <CardDescription>Age: {student.age}</CardDescription>}
                  </div>
                  {student.inactive && (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All students can join the same session room using the generated link above.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.total > pagination.limit && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {pagination.page * pagination.limit - pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
          students
        </div>
      )}

      <GenerateLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sessionLink={sessionLink}
        studentName={selectedStudent?.name || ""}
        onClose={handleCloseDialog}
      />

      <AddStudentsDialog
        open={addStudentsDialogOpen}
        onOpenChange={setAddStudentsDialogOpen}
        onSuccess={() => {
          // Students list will automatically refresh via query invalidation
        }}
      />
    </div>
  );
}
