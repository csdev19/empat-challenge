import { useState } from "react";
import { useAvailableStudents, useAddStudentsToCaseload } from "@/hooks/use-caseload";
import { Button } from "@empat-challenge/web-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@empat-challenge/web-ui";
import { Checkbox } from "@empat-challenge/web-ui";
import { Input } from "@empat-challenge/web-ui";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import type { StudentBase } from "@/hooks/use-students";
import Loader from "@/components/loader";

interface AddStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddStudentsDialog({ open, onOpenChange, onSuccess }: AddStudentsDialogProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useAvailableStudents(page, limit);
  const addStudents = useAddStudentsToCaseload();

  const students = data?.data || [];
  const filteredStudents = students.filter((student: StudentBase) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleStudent = (studentId: string, checked?: boolean) => {
    const newSelected = new Set(selectedStudentIds);
    if (checked === false || (checked === undefined && newSelected.has(studentId))) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudentIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s: StudentBase) => s.id)));
    }
  };

  const handleAdd = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      const result = await addStudents.mutateAsync({
        studentIds: Array.from(selectedStudentIds),
      });

      if (result.skipped > 0) {
        toast.warning(
          `${result.added} student(s) added. ${result.skipped} student(s) were already in your caseload.`,
        );
      } else {
        toast.success(`${result.added} student(s) added to your caseload!`);
      }

      setSelectedStudentIds(new Set());
      setSearchQuery("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add students";
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Students to Caseload</DialogTitle>
          <DialogDescription>
            Select students to add to your caseload. You can search and filter the list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select All */}
          {filteredStudents.length > 0 && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={isLoading}>
                {selectedStudentIds.size === filteredStudents.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedStudentIds.size} selected
              </span>
            </div>
          )}

          {/* Student List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-destructive">
                  {error instanceof Error ? error.message : "Failed to load students"}
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "No students found matching your search."
                    : "No available students."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredStudents.map((student: StudentBase) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleToggleStudent(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudentIds.has(student.id)}
                      onCheckedChange={(checked) =>
                        handleToggleStudent(student.id, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{student.name}</p>
                      {student.age && (
                        <p className="text-xs text-muted-foreground">Age: {student.age}</p>
                      )}
                    </div>
                    {student.inactive && (
                      <span className="text-xs text-muted-foreground">Inactive</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {data?.meta?.pagination && data.meta.pagination.total > limit && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing{" "}
                {data.meta.pagination.page * data.meta.pagination.limit -
                  data.meta.pagination.limit +
                  1}{" "}
                to{" "}
                {Math.min(
                  data.meta.pagination.page * data.meta.pagination.limit,
                  data.meta.pagination.total,
                )}{" "}
                of {data.meta.pagination.total} students
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= (data.meta.pagination.total || 0) || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedStudentIds.size === 0 || addStudents.isPending}
          >
            {addStudents.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedStudentIds.size} Student${selectedStudentIds.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
