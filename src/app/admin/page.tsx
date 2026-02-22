"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users, BookOpen, CheckCircle, TrendingUp, AlertTriangle, Clock,
  Mic, MessageSquare, Zap, BarChart3, Shield, ArrowUpRight,
  Activity, Target, Volume2,
} from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-center py-12">Failed to load dashboard</p>;

  const o = data.overview;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-muted mt-1">Executive summary of platform health and activity</p>
        </div>
        <Link
          href="/api/admin/export?type=doubts&format=csv"
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" /> Export Report
        </Link>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={<Users className="w-5 h-5" />} label="Total Students" value={o.totalStudents} color="blue" />
        <KPICard icon={<Activity className="w-5 h-5" />} label="Active Today" value={o.activeStudentsToday} sub={`of ${o.totalStudents}`} color="green" />
        <KPICard icon={<BookOpen className="w-5 h-5" />} label="Doubts Today" value={o.doubtsToday} color="purple" />
        <KPICard icon={<BarChart3 className="w-5 h-5" />} label="Doubts This Week" value={o.doubtsThisWeek} color="indigo" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={<Target className="w-5 h-5" />} label="Avg Doubts/Student" value={o.avgDoubtsPerStudent} color="cyan" />
        <KPICard
          icon={<Volume2 className="w-5 h-5" />}
          label="Voice vs Text"
          value={`${o.voicePercent}% / ${100 - o.voicePercent}%`}
          sub={`${o.voiceDoubts} voice · ${o.textDoubts} text`}
          color="fuchsia"
        />
        <KPICard
          icon={<CheckCircle className="w-5 h-5" />}
          label="AI Resolution Rate"
          value={`${o.resolutionRate}%`}
          sub={`${o.resolvedDoubts} of ${o.totalDoubts}`}
          color="emerald"
          highlight={o.resolutionRate >= 70}
        />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Escalation Rate"
          value={`${o.escalationRate}%`}
          sub="Tier 3 model usage"
          color="amber"
        />
      </div>

      {/* Additional metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted font-medium">Total Doubts</p>
          <p className="text-2xl font-bold mt-1">{o.totalDoubts}</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-green-600">{o.resolvedDoubts} resolved</span>
            <span className="text-amber-600">{o.unresolvedDoubts} unresolved</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted font-medium">Avg Response Time</p>
          <p className="text-2xl font-bold mt-1">{(o.avgResponseTimeMs / 1000).toFixed(1)}s</p>
          <p className="text-xs text-muted mt-2">Target: &lt;5s</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted font-medium">Satisfaction Rate</p>
          <p className="text-2xl font-bold mt-1">{o.satisfactionRate}%</p>
          <p className="text-xs text-muted mt-2">Based on student ratings</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted font-medium">Quick Actions</p>
          <div className="flex flex-col gap-1 mt-2">
            <Link href="/admin/interventions" className="text-xs text-primary hover:text-primary-dark font-medium">View Interventions →</Link>
            <Link href="/admin/alerts" className="text-xs text-primary hover:text-primary-dark font-medium">View Alerts →</Link>
            <Link href="/admin/ai-performance" className="text-xs text-primary hover:text-primary-dark font-medium">AI Performance →</Link>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Distribution */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Subject Distribution</h2>
            <Link href="/admin/subjects" className="text-sm text-primary hover:text-primary-dark">Details →</Link>
          </div>
          <div className="space-y-3">
            {data.subjectDistribution.map((item: any) => {
              const maxCount = Math.max(...data.subjectDistribution.map((s: any) => s.count));
              const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              const colors: Record<string, string> = {
                Mathematics: "from-indigo-500 to-blue-500",
                Physics: "from-cyan-500 to-teal-500",
                Chemistry: "from-amber-500 to-orange-500",
                Biology: "from-emerald-500 to-green-500",
              };
              return (
                <div key={item.subject} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-24 text-right truncate">{item.subject}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors[item.subject] || "from-gray-400 to-gray-500"} rounded-full flex items-center justify-end pr-3 transition-all duration-700`}
                      style={{ width: `${Math.max(pct, 12)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Usage */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Model Usage</h2>
            <Link href="/admin/ai-performance" className="text-sm text-primary hover:text-primary-dark">Details →</Link>
          </div>
          <div className="space-y-4">
            {data.modelUsage.map((item: any) => {
              const total = data.modelUsage.reduce((s: number, m: any) => s + m.count, 0);
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              const info: Record<string, { label: string; color: string }> = {
                "gpt-4o-mini": { label: "Tier 1 · GPT-4o Mini", color: "bg-green-500" },
                "gpt-4.1": { label: "Tier 2 · GPT-4.1", color: "bg-blue-500" },
                "claude-opus-4-6": { label: "Tier 3 · Claude Opus", color: "bg-purple-500" },
              };
              const { label, color } = info[item.model] || { label: item.model, color: "bg-gray-500" };
              return (
                <div key={item.model}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted">{pct}% ({item.count})</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Doubts Table */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted" /> Recent Doubts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-medium text-muted">Student</th>
                <th className="text-left py-3 px-3 font-medium text-muted">Question</th>
                <th className="text-left py-3 px-3 font-medium text-muted">Subject</th>
                <th className="text-left py-3 px-3 font-medium text-muted">Mode</th>
                <th className="text-left py-3 px-3 font-medium text-muted">Model</th>
                <th className="text-left py-3 px-3 font-medium text-muted">Status</th>
                <th className="text-left py-3 px-3 font-medium text-muted">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentDoubts.map((d: any) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="py-3 px-3 font-medium whitespace-nowrap">
                    <Link href={`/admin/students/${d.studentId}`} className="text-primary hover:underline">
                      {d.student?.name}
                    </Link>
                  </td>
                  <td className="py-3 px-3 max-w-[200px] truncate">{d.question}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{d.subject || "-"}</span>
                  </td>
                  <td className="py-3 px-3">
                    {d.inputMode === "voice" ? (
                      <span className="flex items-center gap-1 text-xs text-fuchsia-600"><Mic className="w-3 h-3" /> Voice</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted"><MessageSquare className="w-3 h-3" /> Text</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs">{d.modelUsed || "-"}</td>
                  <td className="py-3 px-3">
                    {d.status === "resolved" ? (
                      <span className="flex items-center gap-1 text-success text-xs"><CheckCircle className="w-3.5 h-3.5" /> Resolved</span>
                    ) : (
                      <span className="flex items-center gap-1 text-warning text-xs"><AlertTriangle className="w-3.5 h-3.5" /> {d.status}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-muted text-xs whitespace-nowrap">
                    {format(new Date(d.createdAt), "MMM d, h:mm a")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, color, highlight }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; highlight?: boolean;
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600",
    fuchsia: "bg-fuchsia-50 text-fuchsia-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className={`bg-white rounded-xl border p-4 ${highlight ? "border-green-300 ring-1 ring-green-200" : "border-border"} hover:shadow-sm transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted font-medium">{label}</p>
        <div className={`p-1.5 rounded-lg ${bg[color] || "bg-gray-50 text-gray-600"}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
