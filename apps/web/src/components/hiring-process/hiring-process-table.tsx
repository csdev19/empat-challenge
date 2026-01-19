import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@empat-challenge/web-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empat-challenge/web-ui";
import { StatusBadge } from "./status-badge";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import type { HiringProcess } from "@/hooks/use-hiring-processes";
import type { Currency, SalaryRateType } from "@empat-challenge/domain/constants";
import { SALARY_RATE_TYPE_LABELS } from "@empat-challenge/domain/constants";
import { Pencil, Trash2, Eye } from "lucide-react";

const columnHelper = createColumnHelper<HiringProcess>();

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatSalary = (
  salary: number | null,
  currency: Currency = "USD",
  salaryRateType?: SalaryRateType,
) => {
  if (!salary) return "-";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(salary);
  const rateTypeLabel = salaryRateType ? SALARY_RATE_TYPE_LABELS[salaryRateType] : undefined;
  return rateTypeLabel ? `${formatted}/${rateTypeLabel.toLowerCase()}` : `${formatted} ${currency}`;
};

interface InterviewTableProps {
  interviews: HiringProcess[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function InterviewTable({ interviews, onDelete, isDeleting = false }: InterviewTableProps) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);

  const interviewToDelete = interviews.find((i) => i.id === deleteId);

  const columns = useMemo(
    () => [
      columnHelper.accessor("companyName", {
        header: "Company",
        cell: (info) => {
          const interview = info.row.original;
          return (
            <Link
              to="/hiring-processes/$id"
              params={{ id: interview.id }}
              className="font-medium hover:underline truncate block max-w-[200px]"
              title={info.getValue()}
            >
              {info.getValue()}
            </Link>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor("jobTitle", {
        header: "Job Title",
        cell: (info) => {
          const jobTitle = info.getValue();
          return jobTitle ? (
            <span className="text-muted-foreground truncate block max-w-[300px]" title={jobTitle}>
              {jobTitle}
            </span>
          ) : (
            <span className="text-muted-foreground italic">-</span>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
        enableSorting: false,
      }),
      columnHelper.accessor("salary", {
        header: "Salary",
        cell: (info) => {
          const interview = info.row.original;
          return formatSalary(
            info.getValue(),
            interview.currency,
            interview.salaryRateType as SalaryRateType | undefined,
          );
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const salaryA = rowA.original.salary || 0;
          const salaryB = rowB.original.salary || 0;
          return salaryA - salaryB;
        },
      }),
      columnHelper.accessor("updatedAt", {
        header: "Last Update",
        cell: (info) => (
          <span className="text-muted-foreground">{formatDate(info.getValue())}</span>
        ),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const dateA = new Date(rowA.original.updatedAt).getTime();
          const dateB = new Date(rowB.original.updatedAt).getTime();
          return dateA - dateB;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const interview = info.row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                title="View"
                onClick={() =>
                  navigate({ to: "/hiring-processes/$id", params: { id: interview.id } })
                }
              >
                <Eye className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                title="Edit"
                onClick={() =>
                  navigate({
                    to: "/hiring-processes/$id/edit",
                    params: { id: interview.id },
                  })
                }
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setDeleteId(interview.id)}
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [navigate],
  );

  const table = useReactTable({
    data: interviews,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (interviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No interviews yet. Create your first interview to get started.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();
                const isActionsColumn = header.column.id === "actions";
                return (
                  <TableHead
                    key={header.id}
                    className={
                      isActionsColumn ? "text-right p-2 font-medium" : "text-left p-2 font-medium"
                    }
                  >
                    {canSort ? (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        {header.isPlaceholder
                          ? null
                          : typeof header.column.columnDef.header === "function"
                            ? header.column.columnDef.header(header.getContext())
                            : header.column.columnDef.header}
                        {isSorted && (
                          <span className="text-xs">{isSorted === "asc" ? "↑" : "↓"}</span>
                        )}
                      </button>
                    ) : header.isPlaceholder ? null : typeof header.column.columnDef.header ===
                      "function" ? (
                      header.column.columnDef.header(header.getContext())
                    ) : (
                      header.column.columnDef.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="border-b border-border hover:bg-muted/50">
              {row.getVisibleCells().map((cell) => {
                const isActionsColumn = cell.column.id === "actions";
                return (
                  <TableCell key={cell.id} className={isActionsColumn ? "p-2 text-right" : "p-2"}>
                    {typeof cell.column.columnDef.cell === "function"
                      ? cell.column.columnDef.cell(cell.getContext())
                      : cell.getValue()}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {deleteId && interviewToDelete && (
        <DeleteConfirmDialog
          companyName={interviewToDelete.companyName}
          onConfirm={() => {
            onDelete(deleteId);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
