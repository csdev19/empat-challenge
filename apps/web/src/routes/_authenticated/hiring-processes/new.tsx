import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@empat-challenge/web-ui";
import { HiringProcessForm } from "@/components/hiring-process/hiring-process-form";
import { useCreateHiringProcess } from "@/hooks/use-hiring-processes";
import { useCreateCompanyDetails } from "@/hooks/use-company-details";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hiring-processes/new")({
  component: NewHiringProcessPage,
});

function NewHiringProcessPage() {
  const navigate = useNavigate();
  const createMutation = useCreateHiringProcess();
  const createCompanyDetailsMutation = useCreateCompanyDetails();

  const handleSubmit = async (
    data: Parameters<typeof createMutation.mutateAsync>[0],
    companyDetails?: Parameters<typeof createCompanyDetailsMutation.mutateAsync>[0]["data"],
  ) => {
    try {
      const hiringProcess = await createMutation.mutateAsync(data);
      const hiringProcessId = hiringProcess.id;

      // Create company details if provided
      if (companyDetails) {
        try {
          await createCompanyDetailsMutation.mutateAsync({
            hiringProcessId,
            data: companyDetails,
          });
        } catch (error) {
          console.error("Failed to create company details:", error);
          // Don't fail the whole operation if company details fail
        }
      }

      toast.success("Hiring process created successfully");
      navigate({ to: "/hiring-processes" });
    } catch (error) {
      toast.error("Failed to create hiring process");
      console.error(error);
    }
  };

  const handleCancel = () => {
    navigate({ to: "/hiring-processes" });
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Hiring Process</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new job application process to track
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hiring Process Details</CardTitle>
        </CardHeader>
        <CardContent>
          <HiringProcessForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createMutation.isPending || createCompanyDetailsMutation.isPending}
            submitLabel="Create Hiring Process"
          />
        </CardContent>
      </Card>
    </div>
  );
}
