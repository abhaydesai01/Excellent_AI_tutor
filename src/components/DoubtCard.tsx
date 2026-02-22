import Link from "next/link";
import { format } from "date-fns";
import { Clock, BookOpen, CheckCircle, AlertCircle, Zap } from "lucide-react";

interface DoubtCardProps {
  doubt: {
    id: string;
    question: string;
    subject?: string | null;
    topic?: string | null;
    complexityLevel?: string | null;
    status: string;
    modelUsed?: string | null;
    createdAt: string;
  };
  showLink?: boolean;
}

const complexityColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-orange-100 text-orange-700",
  expert: "bg-red-100 text-red-700",
};

const modelLabels: Record<string, string> = {
  "gpt-4o-mini": "Tier 1",
  "gpt-4.1": "Tier 2",
  "claude-opus-4-6": "Tier 3",
};

export default function DoubtCard({ doubt, showLink = true }: DoubtCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-all hover:border-primary/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {doubt.subject && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                <BookOpen className="w-3 h-3" />
                {doubt.subject}
              </span>
            )}
            {doubt.topic && (
              <span className="text-xs text-muted bg-gray-100 px-2.5 py-1 rounded-full">
                {doubt.topic}
              </span>
            )}
            {doubt.complexityLevel && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${complexityColors[doubt.complexityLevel] || "bg-gray-100 text-gray-700"}`}>
                {doubt.complexityLevel}
              </span>
            )}
          </div>

          <p className="text-sm text-foreground line-clamp-2 font-medium">
            {doubt.question}
          </p>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(doubt.createdAt), "MMM d, yyyy h:mm a")}
            </span>
            {doubt.modelUsed && (
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {modelLabels[doubt.modelUsed] || doubt.modelUsed}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {doubt.status === "resolved" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle className="w-4 h-4" />
              Resolved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
              <AlertCircle className="w-4 h-4" />
              {doubt.status === "pending" ? "Pending" : "Unresolved"}
            </span>
          )}

          {showLink && (
            <Link
              href={`/student/doubt/${doubt.id}`}
              className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
            >
              View Details →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
