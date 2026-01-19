import { cn } from "@/lib/utils";
import {
  HIRING_PROCESS_STATUS_INFO,
  type HiringProcessStatus,
} from "@empat-challenge/domain/constants";

interface StatusBadgeProps {
  status: HiringProcessStatus;
  className?: string;
}

const statusConfig: Record<HiringProcessStatus, { label: string; className: string }> = {
  "first-contact": {
    label: HIRING_PROCESS_STATUS_INFO["first-contact"].label,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  ongoing: {
    label: HIRING_PROCESS_STATUS_INFO.ongoing.label,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  "on-hold": {
    label: HIRING_PROCESS_STATUS_INFO["on-hold"].label,
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  rejected: {
    label: HIRING_PROCESS_STATUS_INFO.rejected.label,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  "dropped-out": {
    label: HIRING_PROCESS_STATUS_INFO["dropped-out"].label,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  hired: {
    label: HIRING_PROCESS_STATUS_INFO.hired.label,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
