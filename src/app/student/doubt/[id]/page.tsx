"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Brain, Zap, Clock, Send, Loader2, Sparkles, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function DoubtDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [doubt, setDoubt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followUpQ, setFollowUpQ] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/doubts/${id}`)
      .then((r) => r.json())
      .then(setDoubt)
      .catch(() => toast.error("Failed to load doubt"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQ.trim()) return;
    setFollowUpLoading(true);

    try {
      const res = await fetch(`/api/doubts/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: followUpQ }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setDoubt((prev: any) => ({
        ...prev,
        followUps: [...(prev.followUps || []), data],
      }));
      setFollowUpQ("");
      toast.success("Follow-up answered!");
    } catch {
      toast.error("Failed to process follow-up");
    } finally {
      setFollowUpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!doubt) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Doubt not found</p>
        <button onClick={() => router.back()} className="text-primary mt-2">Go back</button>
      </div>
    );
  }

  const complexityColors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-orange-100 text-orange-700",
    expert: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {doubt.subject && (
              <span className="flex items-center gap-1 text-sm px-3 py-1 bg-primary/10 text-primary rounded-full">
                <BookOpen className="w-3.5 h-3.5" />
                {doubt.subject}
              </span>
            )}
            {doubt.topic && (
              <span className="text-sm px-3 py-1 bg-gray-100 text-muted rounded-full">{doubt.topic}</span>
            )}
            {doubt.complexityLevel && (
              <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${complexityColors[doubt.complexityLevel] || ""}`}>
                {doubt.complexityLevel}
              </span>
            )}
            {doubt.status === "resolved" ? (
              <span className="flex items-center gap-1 text-sm text-success">
                <CheckCircle className="w-4 h-4" /> Resolved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-warning">
                <AlertCircle className="w-4 h-4" /> {doubt.status}
              </span>
            )}
          </div>

          <h1 className="text-lg font-semibold text-foreground">{doubt.question}</h1>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(doubt.createdAt), "MMMM d, yyyy h:mm a")}
            </span>
            {doubt.modelUsed && (
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Model: {doubt.modelUsed}
              </span>
            )}
          </div>
        </div>

        {doubt.aiResponse && (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">AI Response</span>
            </div>

            <div className="markdown-content">
              {doubt.aiResponse.split("\n").map((line: string, i: number) => {
                if (line.startsWith("## ")) return <h2 key={i}>{line.replace("## ", "")}</h2>;
                if (line.startsWith("- ")) return <li key={i}>{line.replace("- ", "")}</li>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        )}
      </div>

      {doubt.followUps?.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Follow-up Questions
          </h2>
          {doubt.followUps.map((fu: any) => (
            <div key={fu.id} className="bg-white rounded-xl border border-border p-5">
              <p className="font-medium text-sm mb-3 text-primary">Q: {fu.question}</p>
              <div className="markdown-content text-sm">
                {fu.answer?.split("\n").map((line: string, i: number) => {
                  if (line.startsWith("## ")) return <h2 key={i}>{line.replace("## ", "")}</h2>;
                  if (line.startsWith("- ")) return <li key={i}>{line.replace("- ", "")}</li>;
                  if (line.trim() === "") return <br key={i} />;
                  return <p key={i}>{line}</p>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Ask Follow-up
        </h3>
        <form onSubmit={handleFollowUp} className="flex gap-3">
          <input
            type="text"
            value={followUpQ}
            onChange={(e) => setFollowUpQ(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            disabled={followUpLoading}
          />
          <button
            type="submit"
            disabled={followUpLoading || !followUpQ.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {followUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
