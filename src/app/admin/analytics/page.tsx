"use client";

import { useState, useEffect } from "react";
import { BarChart3, BookOpen, AlertTriangle, TrendingUp, Users, Brain } from "lucide-react";

export default function SubjectAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/subjects")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return <p>Failed to load analytics</p>;

  const subjectColors: Record<string, { bg: string; text: string; accent: string }> = {
    Mathematics: { bg: "bg-indigo-50", text: "text-indigo-700", accent: "#6366f1" },
    Physics: { bg: "bg-cyan-50", text: "text-cyan-700", accent: "#06b6d4" },
    Chemistry: { bg: "bg-amber-50", text: "text-amber-700", accent: "#f59e0b" },
    Biology: { bg: "bg-emerald-50", text: "text-emerald-700", accent: "#22c55e" },
  };

  const selected = selectedSubject ? data.subjects.find((s: any) => s.subject === selectedSubject) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Subject & Concept Analytics
        </h1>
        <p className="text-muted mt-1">Platform-wide academic intelligence and confusion analysis</p>
      </div>

      {/* Subject Performance Heatmap */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4">Subject Performance Heatmap</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted">Subject</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Total Doubts</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Confusion Score</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Students</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Unresolved</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((s: any) => {
                const colors = subjectColors[s.subject] || { bg: "bg-gray-50", text: "text-gray-700", accent: "#94a3b8" };
                return (
                  <tr key={s.subject} className="border-b border-border/50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        <BookOpen className="w-3.5 h-3.5" />
                        {s.subject}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold">{s.totalDoubts}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-3">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${s.confusionScore}%`,
                              background: s.confusionScore >= 60 ? "#ef4444" : s.confusionScore >= 40 ? "#f59e0b" : "#22c55e",
                            }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${
                          s.confusionScore >= 60 ? "text-red-600" : s.confusionScore >= 40 ? "text-amber-600" : "text-green-600"
                        }`}>{s.confusionScore}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{s.studentsCount}</td>
                    <td className="py-3 px-4">
                      {s.unresolvedCount > 0 && (
                        <span className="text-red-600 font-medium">{s.unresolvedCount}</span>
                      )}
                      {s.unresolvedCount === 0 && <span className="text-muted">0</span>}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedSubject(selectedSubject === s.subject ? null : s.subject)}
                        className="text-xs text-primary hover:text-primary-dark font-medium"
                      >
                        {selectedSubject === s.subject ? "Hide Topics" : "View Topics"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subject Heatmap Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.subjects.map((s: any) => {
          const colors = subjectColors[s.subject] || { bg: "bg-gray-50", text: "text-gray-700", accent: "#94a3b8" };
          return (
            <button
              key={s.subject}
              onClick={() => setSelectedSubject(selectedSubject === s.subject ? null : s.subject)}
              className={`rounded-xl p-5 text-left border-2 transition-all ${
                selectedSubject === s.subject ? `${colors.bg} border-current ${colors.text} shadow-md` : "bg-white border-border hover:shadow-sm"
              }`}
            >
              <p className="text-3xl font-bold" style={{ color: colors.accent }}>{s.totalDoubts}</p>
              <p className="font-semibold mt-1">{s.subject}</p>
              <p className="text-xs text-muted mt-0.5">
                {s.confusionScore}% confusion · {s.studentsCount} students
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Subject Topic Breakdown */}
      {selected && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Topic-Level Analytics: {selected.subject}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selected.topics.map((t: any) => (
              <div key={t.topic} className="border border-border rounded-xl p-4 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{t.topic}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    t.confusionScore >= 60 ? "bg-red-100 text-red-700" :
                    t.confusionScore >= 40 ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  }`}>{t.confusionScore}%</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted">
                  <div className="flex justify-between"><span>Total Doubts</span><span className="font-medium text-foreground">{t.totalDoubts}</span></div>
                  <div className="flex justify-between"><span>Students Struggling</span><span className="font-medium text-foreground">{t.studentsStruggling}</span></div>
                  <div className="flex justify-between"><span>Unresolved</span><span className="font-medium text-red-600">{t.unresolvedCount}</span></div>
                </div>
                <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${t.confusionScore}%`,
                      background: t.confusionScore >= 60 ? "#ef4444" : t.confusionScore >= 40 ? "#f59e0b" : "#22c55e",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most Difficult Topics */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" /> Most Difficult Topics (Top 10)
        </h2>
        <div className="space-y-3">
          {data.mostDifficultTopics.map((t: any, i: number) => (
            <div key={`${t.subject}-${t.topic}`} className="flex items-center gap-4">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t.topic}</span>
                  <span className="text-xs text-muted px-2 py-0.5 bg-gray-100 rounded-full">{t.subject}</span>
                </div>
                <div className="flex gap-4 text-xs text-muted mt-0.5">
                  <span>{t.totalDoubts} doubts</span>
                  <span>{t.studentsStruggling} students struggling</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${t.confusionScore}%`,
                      background: t.confusionScore >= 60 ? "#ef4444" : t.confusionScore >= 40 ? "#f59e0b" : "#22c55e",
                    }}
                  />
                </div>
                <span className="text-sm font-bold w-10 text-right" style={{
                  color: t.confusionScore >= 60 ? "#ef4444" : t.confusionScore >= 40 ? "#f59e0b" : "#22c55e",
                }}>{t.confusionScore}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
