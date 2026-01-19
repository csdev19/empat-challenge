import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/utils";
import "./markdown-content.css";

interface MarkdownContentProps {
  content: string;
  className?: string;
  variant?: "default" | "compact";
}

export function MarkdownContent({ content, className, variant = "default" }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "markdown-content",
        variant === "compact" && "markdown-content-compact",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
