import { useState, useEffect } from "react";
import { useStudents } from "@/hooks/use-students";
import { useGenerateSessionLink } from "@/hooks/use-therapy-sessions";
import { useSLP } from "@/hooks/use-slp";
import { useSession } from "@/hooks/use-session";
import { Button } from "@empat-challenge/web-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { GenerateLinkDialog } from "@/components/therapy-session/generate-link-dialog";
import { CreateSLPProfileDialog } from "@/components/slp/create-slp-profile-dialog";
import { AddStudentsDialog } from "@/components/caseload/add-students-dialog";
import Loader from "@/components/loader";
import { toast } from "sonner";
import { Link2, User, Calendar, Plus } from "lucide-react";
import type { SessionLinkResponse } from "@/hooks/use-therapy-sessions";
import type { StudentBase } from "@/hooks/use-students";

export function CaseloadView() {
  const { session } = useSession();
  const { data: slp, isLoading: slpLoading, error: slpError } = useSLP();
  const { data, isLoading, error } = useStudents();
  const generateLink = useGenerateSessionLink();
  const [selectedStudent, setSelectedStudent] = useState<StudentBase | null>(null);
  const [sessionLink, setSessionLink] = useState<SessionLinkResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createSLPDialogOpen, setCreateSLPDialogOpen] = useState(false);
  const [addStudentsDialogOpen, setAddStudentsDialogOpen] = useState(false);

  // Show create SLP dialog if profile doesn't exist
  useEffect(() => {
    if (!slpLoading && slpError && session?.user) {
      // Check if error is "not found" (404)
      const errorMessage = slpError instanceof Error ? slpError.message : String(slpError);
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        setCreateSLPDialogOpen(true);
      }
    }
  }, [slpLoading, slpError, session]);

  const handleSLPProfileCreated = () => {
    setCreateSLPDialogOpen(false);
    toast.success("SLP profile created! You can now use the platform.");
  };

  const handleGenerateLink = async () => {
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

  // Show loading while checking SLP profile
  if (slpLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  // Show error if SLP profile doesn't exist (will trigger dialog)
  if (slpError && !slp) {
    const errorMessage = slpError instanceof Error ? slpError.message : String(slpError);
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return (
        <>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome!</h1>
              <p className="text-muted-foreground mt-2">Create your SLP profile to get started</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>SLP Profile Required</CardTitle>
                <CardDescription>
                  You need to create your Speech Language Pathologist profile before you can use the
                  platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCreateSLPDialogOpen(true)}>Create SLP Profile</Button>
              </CardContent>
            </Card>
          </div>
          <CreateSLPProfileDialog
            open={createSLPDialogOpen}
            onOpenChange={setCreateSLPDialogOpen}
            onSuccess={handleSLPProfileCreated}
            defaultName={session?.user?.name || ""}
          />
        </>
      );
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load students"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const students = data?.data || [];
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
              disabled={generateLink.isPending}
              variant="default"
            >
              <Link2 className="h-4 w-4 mr-2" />
              {generateLink.isPending ? "Generating..." : "Generate Session Link"}
            </Button>
          )}
          <Button onClick={() => setAddStudentsDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Students
          </Button>
        </div>
      </div>

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

      <CreateSLPProfileDialog
        open={createSLPDialogOpen}
        onOpenChange={setCreateSLPDialogOpen}
        onSuccess={handleSLPProfileCreated}
        defaultName={session?.user?.name || ""}
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
