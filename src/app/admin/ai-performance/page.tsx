"use client";

import { useState, useEffect } from "react";
import { Zap, CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown, BarChart3, Brain } from "lucide-react";

export default function AIPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai-performance")
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
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return <p>Failed to load AI performance data</p>;

  const { resolution, models, feedback, complexity } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" /> AI Performance Dashboard
        </h1>
        <p className="text-muted mt-1">Track AI model effectiveness, resolution rates, and student satisfaction</p>
      </div>

      {/* Resolution Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-muted">Total Answered</span></div>
          <p className="text-2xl font-bold">{resolution.totalAnswered}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted">Resolution Rate</span></div>
          <p className="text-2xl font-bold text-green-600">{resolution.resolutionRate}%</p>
          <p className="text-xs text-muted mt-0.5">{resolution.resolved} resolved</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-muted">Escalation Rate</span></div>
          <p className="text-2xl font-bold text-amber-600">{resolution.escalationRate}%</p>
          <p className="text-xs text-muted mt-0.5">{resolution.unresolved} unresolved</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-purple-500" /><span className="text-xs text-muted">Avg Response Time</span></div>
          <p className="text-2xl font-bold">{(resolution.avgResponseTimeMs / 1000).toFixed(1)}s</p>
          <p className="text-xs text-muted mt-0.5">Target: &lt;5s</p>
        </div>
      </div>

      {/* Model Usage */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4">Model Usage Analytics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted">Model</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Usage</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Queries</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Avg Response</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m: any) => (
                <tr key={m.model} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{m.label}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{m.tier}</span></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-3">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${m.percentage}%` }} />
                      </div>
                      <span className="font-bold">{m.percentage}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{m.count}</td>
                  <td className="py-3 px-4">{(m.avgResponseMs / 1000).toFixed(1)}s</td>
                  <td className="py-3 px-4">{Math.round(m.avgConfidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Feedback */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4">Student Feedback</h2>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <ThumbsUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{feedback.helpful}</p>
                <p className="text-xs text-muted">Helpful</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <ThumbsDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{feedback.notHelpful}</p>
                <p className="text-xs text-muted">Not Helpful</p>
              </div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Satisfaction Rate</span>
              <span className="font-bold">{feedback.satisfactionRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${feedback.satisfactionRate}%` }} />
            </div>
            <p className="text-xs text-muted mt-1">{feedback.totalRated} total ratings</p>
          </div>
        </div>

        {/* Complexity Distribution */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4">Complexity Distribution</h2>
          <div className="space-y-4">
            {complexity.map((c: any) => {
              const total = complexity.reduce((s: number, x: any) => s + x.count, 0);
              const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
              const colors: Record<string, string> = { easy: "#22c55e", medium: "#f59e0b", hard: "#f97316", expert: "#ef4444" };
              return (
                <div key={c.level}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium">{c.level}</span>
                    <span className="text-muted">{pct}% ({c.count})</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: colors[c.level] || "#94a3b8" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
