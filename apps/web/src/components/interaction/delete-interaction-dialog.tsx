import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@empat-challenge/web-ui";
import { useDeleteInteraction } from "@/hooks/use-interactions";
import { toast } from "sonner";

interface DeleteInteractionDialogProps {
  interactionId: string;
  hiringProcessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteInteractionDialog({
  interactionId,
  hiringProcessId,
  open,
  onOpenChange,
}: DeleteInteractionDialogProps) {
  const deleteMutation = useDeleteInteraction();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ hiringProcessId, interactionId });
      toast.success("Interaction deleted successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete interaction");
      console.error(error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Interaction</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this interaction? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
