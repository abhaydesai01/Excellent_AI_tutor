"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Loader2, ImagePlus, Sparkles, BookOpen, Brain, Zap, X, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import DoubtCard from "@/components/DoubtCard";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentDoubts, setRecentDoubts] = useState<any[]>([]);
  const [loadedRecent, setLoadedRecent] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be smaller than 4MB");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImageBase64(base64);
      setImagePreview(base64);
      toast.success("Image attached!");
    } catch {
      toast.error("Failed to read the image. Please try again.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = () => {
    setImageBase64(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && !imageBase64) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          imageBase64: imageBase64 || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit doubt");

      const data = await res.json();
      setResult(data);
      setQuestion("");
      removeImage();
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
            placeholder={imageBase64 ? "Add a question about the image (optional)..." : "Type your question here... e.g., 'How do I solve the integral of x^2 * e^x dx?'"}
            rows={4}
            className="w-full p-4 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm resize-none"
            disabled={loading}
          />

          {imagePreview && (
            <div className="mt-3 relative inline-block">
              <img
                src={imagePreview}
                alt="Uploaded preview"
                className="max-h-48 rounded-xl border border-border object-contain"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-md flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Image attached
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:bg-gray-50 hover:text-primary transition-colors disabled:opacity-50"
              >
                <ImagePlus className="w-4 h-4" />
                {imageBase64 ? "Change Image" : "Upload Image"}
              </button>
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1"><Brain className="w-3.5 h-3.5" /> Auto-routes to best AI</span>
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Step-by-step solutions</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || (!question.trim() && !imageBase64)}
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
          <p className="font-medium mt-4">AI is analyzing your {result === null && imageBase64 ? "image" : "question"}...</p>
          <p className="text-sm text-muted mt-1">{imageBase64 ? "Using GPT-4o Vision to understand the image" : "Routing to the optimal model for best accuracy"}</p>
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
