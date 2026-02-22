"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Loader2, ImagePlus, Sparkles, BookOpen, Brain, Zap } from "lucide-react";
import toast from "react-hot-toast";
import DoubtCard from "@/components/DoubtCard";

export default function StudentDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentDoubts, setRecentDoubts] = useState<any[]>([]);
  const [loadedRecent, setLoadedRecent] = useState(false);

  const loadRecentDoubts = async () => {
    if (loadedRecent) return;
    try {
      const res = await fetch("/api/doubts?limit=5");
      if (res.ok) {
        const data = await res.json();
        setRecentDoubts(data.doubts);
        setLoadedRecent(true);
      }
    } catch {}
  };

  if (!loadedRecent) loadRecentDoubts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error("Failed to submit doubt");

      const data = await res.json();
      setResult(data);
      setQuestion("");
      setLoadedRecent(false);
      toast.success("AI response generated!");
    } catch {
      toast.error("Failed to process your doubt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Hello, {session?.user?.name?.split(" ")[0] || "Student"}
        </h1>
        <p className="text-muted mt-1">Ask any academic doubt and get instant AI-powered solutions</p>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-lg">Ask Your Doubt</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here... e.g., 'How do I solve the integral of x^2 * e^x dx?'"
            rows={4}
            className="w-full p-4 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm resize-none"
            disabled={loading}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1"><Brain className="w-3.5 h-3.5" /> Auto-routes to best AI model</span>
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Step-by-step solutions</span>
            </div>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask Doubt
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-border p-8 text-center">
          <div className="animate-float inline-block">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="font-medium mt-4">AI is analyzing your question...</p>
          <p className="text-sm text-muted mt-1">Routing to the optimal model for best accuracy</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="gradient-bg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">AI Response</span>
            </div>
            <div className="flex items-center gap-2">
              {result.complexityLevel && (
                <span className="text-xs px-2.5 py-1 bg-white/20 text-white rounded-full capitalize">
                  {result.complexityLevel}
                </span>
              )}
              {result.modelUsed && (
                <span className="text-xs px-2.5 py-1 bg-white/20 text-white rounded-full">
                  {result.modelUsed}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4 mb-4 text-sm">
              {result.subject && (
                <span className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full">
                  <BookOpen className="w-3.5 h-3.5" />
                  {result.subject}
                </span>
              )}
              {result.topic && (
                <span className="px-3 py-1 bg-gray-100 text-muted rounded-full">
                  {result.topic}
                </span>
              )}
            </div>

            <div className="markdown-content prose prose-sm max-w-none">
              {result.aiResponse?.split("\n").map((line: string, i: number) => {
                if (line.startsWith("## ")) {
                  return <h2 key={i}>{line.replace("## ", "")}</h2>;
                }
                if (line.startsWith("- ")) {
                  return <li key={i}>{line.replace("- ", "")}</li>;
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return <p key={i}><strong>{line.replace(/\*\*/g, "")}</strong></p>;
                }
                if (line.trim() === "") return <br key={i} />;
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        </div>
      )}

      {recentDoubts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Doubts</h2>
            <button
              onClick={() => router.push("/student/history")}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recentDoubts.map((doubt) => (
              <DoubtCard key={doubt.id} doubt={doubt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
