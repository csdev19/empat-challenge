import { useNavigate } from "@tanstack/react-router";
import { useStudentProfile } from "@/hooks/use-student-profile";
import { useSession } from "@/hooks/use-session";
import { useStudentSessions } from "@/hooks/use-therapy-sessions";
import { Button } from "@empat-challenge/web-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import Loader from "@/components/loader";
import { User, Video, BookOpen, Calendar, ExternalLink, Clock } from "lucide-react";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";

export function StudentDashboard() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { data: studentProfile, isLoading, error } = useStudentProfile();
  const { data: sessionsData, isLoading: isLoadingSessions } = useStudentSessions();

  // Redirect to onboarding if profile doesn't exist
  if (!isLoading && error && !studentProfile) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      navigate({ to: "/onboarding" });
      return null;
    }
  }

  // Show loading while checking profile
  if (isLoading || isLoadingSessions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  const sessions = sessionsData?.data || [];
  const availableSessions = sessions.filter(
    (s) =>
      s.status === THERAPY_SESSION_STATUSES.SCHEDULED ||
      s.status === THERAPY_SESSION_STATUSES.ACTIVE,
  );

  // Show dashboard if profile exists
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {studentProfile?.name || session?.user?.name || "Student"}!
        </p>
      </div>

      {/* Available Sessions */}
      {availableSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Available Sessions
            </CardTitle>
            <CardDescription>
              Join a therapy session that your teacher has created
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableSessions.map((therapySession) => (
              <div
                key={therapySession.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Session</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        therapySession.status === THERAPY_SESSION_STATUSES.ACTIVE
                          ? "bg-green-500/20 text-green-600 dark:text-green-400"
                          : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {therapySession.status === THERAPY_SESSION_STATUSES.ACTIVE
                        ? "Active"
                        : "Scheduled"}
                    </span>
                  </div>
                  {therapySession.createdAt && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Created{" "}
                      {new Date(therapySession.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  {therapySession.expiresAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Expires{" "}
                      {new Date(therapySession.expiresAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    if (therapySession.linkToken) {
                      navigate({ to: `/session/${therapySession.linkToken}` });
                    }
                  }}
                  className="ml-4"
                  disabled={!therapySession.linkToken}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join Session
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <CardTitle>Join Session</CardTitle>
            </div>
            <CardDescription>
              {availableSessions.length > 0
                ? "Join an available session above"
                : "No sessions available. Wait for your teacher to create one."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              disabled={availableSessions.length === 0}
              onClick={() => {
                if (availableSessions.length > 0 && availableSessions[0]?.linkToken) {
                  navigate({ to: `/session/${availableSessions[0].linkToken}` });
                }
              }}
            >
              <Video className="h-4 w-4 mr-2" />
              {availableSessions.length > 0 ? "Join Latest Session" : "No Sessions Available"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle>My Sessions</CardTitle>
            </div>
            <CardDescription>
              View your past and upcoming therapy sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              View Sessions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>My Profile</CardTitle>
            </div>
            <CardDescription>
              View and update your student profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <User className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm font-medium">Name:</span>{" "}
            <span className="text-sm text-muted-foreground">
              {studentProfile?.name || "Not set"}
            </span>
          </div>
          {studentProfile?.age && (
            <div>
              <span className="text-sm font-medium">Age:</span>{" "}
              <span className="text-sm text-muted-foreground">
                {studentProfile.age}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
