"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BookOpen, TrendingUp, Flame, Clock, ThumbsUp, Mic, MessageSquare,
  Target, Brain, BarChart3, ChevronRight, Award, AlertTriangle,
  Loader2, Calendar, Zap, Star,
} from "lucide-react";
import Link from "next/link";

interface ReportData {
  overview: {
    total: number;
    resolved: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
    voiceCount: number;
    textCount: number;
    helpfulCount: number;
    ratedCount: number;
    resolutionRate: number;
    satisfactionRate: number;
    avgResponseTime: number;
    streak: number;
  };
  subjects: { subject: string; total: number; resolved: number; avgConfidence: number; percentage: number }[];
  weakTopics: { topic: string; subject: string; total: number; avgConfidence: number }[];
  strongTopics: { topic: string; subject: string; total: number; avgConfidence: number }[];
  weeklyActivity: { week: string; count: number; avgConfidence: number }[];
  complexityDist: Record<string, number>;
  recentDoubts: any[];
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/report")
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center py-16 text-muted">Failed to load report data</div>
      </div>
    );
  }

  const { overview, subjects, weakTopics, strongTopics, weeklyActivity, complexityDist, recentDoubts } = data;
  const maxWeekly = Math.max(...weeklyActivity.map(w => w.count), 1);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Learning Report</h1>
          <p className="text-muted text-sm mt-1">
            Track your progress and identify areas for improvement
          </p>
        </div>
        {overview.streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-bold text-orange-700">{overview.streak}-day streak!</span>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<BookOpen />} label="Total Doubts" value={overview.total} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={<Target />} label="Resolved" value={`${overview.resolutionRate}%`} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={<ThumbsUp />} label="Satisfaction" value={`${overview.satisfactionRate}%`} color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={<Clock />} label="Avg Response" value={`${(overview.avgResponseTime / 1000).toFixed(1)}s`} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MiniStat label="Today" value={overview.todayCount} icon={<Calendar className="w-3.5 h-3.5" />} />
        <MiniStat label="This Week" value={overview.weekCount} icon={<TrendingUp className="w-3.5 h-3.5" />} />
        <MiniStat label="This Month" value={overview.monthCount} icon={<BarChart3 className="w-3.5 h-3.5" />} />
        <MiniStat label="Voice" value={overview.voiceCount} icon={<Mic className="w-3.5 h-3.5" />} />
        <MiniStat label="Text" value={overview.textCount} icon={<MessageSquare className="w-3.5 h-3.5" />} />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Weekly Activity</h3>
          <div className="flex items-end gap-2 h-40">
            {weeklyActivity.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted font-medium">{w.count}</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/60 transition-all"
                  style={{ height: `${Math.max((w.count / maxWeekly) * 100, 4)}%` }}
                />
                <span className="text-[10px] text-muted">{w.week}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Complexity Distribution */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4">Difficulty Levels</h3>
          <div className="space-y-3">
            {[
              { key: "easy", label: "Easy", color: "bg-green-500", textColor: "text-green-700" },
              { key: "medium", label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-700" },
              { key: "hard", label: "Hard", color: "bg-orange-500", textColor: "text-orange-700" },
              { key: "expert", label: "Expert", color: "bg-red-500", textColor: "text-red-700" },
            ].map(({ key, label, color, textColor }) => {
              const count = complexityDist[key] || 0;
              const pct = overview.total > 0 ? (count / overview.total) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`font-medium ${textColor}`}>{label}</span>
                    <span className="text-muted">{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject Performance & Topics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Subject Performance
          </h3>
          {subjects.length === 0 ? (
            <p className="text-muted text-sm py-4 text-center">No subjects yet</p>
          ) : (
            <div className="space-y-3">
              {subjects.map(s => (
                <div key={s.subject} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{s.subject}</span>
                      <span className="text-muted text-xs">{s.total} doubts</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.avgConfidence}%`,
                          background: s.avgConfidence >= 70
                            ? "linear-gradient(90deg, #22c55e, #16a34a)"
                            : s.avgConfidence >= 40
                            ? "linear-gradient(90deg, #eab308, #ca8a04)"
                            : "linear-gradient(90deg, #ef4444, #dc2626)",
                        }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${
                    s.avgConfidence >= 70 ? "text-green-600" : s.avgConfidence >= 40 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {s.avgConfidence}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strong & Weak Topics */}
        <div className="space-y-4">
          {/* Strong Topics */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              Strong Areas
            </h3>
            {strongTopics.length === 0 ? (
              <p className="text-muted text-xs py-2 text-center">Keep learning to identify strengths!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {strongTopics.map(t => (
                  <span
                    key={t.topic}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-100"
                  >
                    {t.topic} <span className="text-green-500">({t.avgConfidence}%)</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Weak Topics */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Focus Areas
            </h3>
            {weakTopics.length === 0 ? (
              <p className="text-muted text-xs py-2 text-center">No weak areas detected — great job!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weakTopics.map(t => (
                  <span
                    key={t.topic}
                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-100"
                  >
                    {t.topic} <span className="text-red-400">({t.avgConfidence}%)</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Doubts */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Recent Doubts
          </h3>
          <Link href="/student/history" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {recentDoubts.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">No doubts asked yet. Start asking!</p>
        ) : (
          <div className="space-y-2">
            {recentDoubts.map(d => (
              <Link
                key={d.id}
                href={`/student/doubt/${d.id}`}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  d.inputMode === "voice" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                }`}>
                  {d.inputMode === "voice" ? <Mic className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">{d.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {d.subject && <span className="text-[10px] px-2 py-0.5 bg-primary/5 text-primary rounded-full">{d.subject}</span>}
                    {d.topic && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{d.topic}</span>}
                    {d.rating === "helpful" && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  </div>
                </div>
                <div className="text-[10px] text-muted whitespace-nowrap">
                  {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/student"
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/15 rounded-2xl hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ask a Doubt</p>
            <p className="text-xs text-muted">Get instant AI help</p>
          </div>
        </Link>
        <Link
          href="/student/voice"
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-100 rounded-2xl hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <Mic className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Voice Tutor</p>
            <p className="text-xs text-muted">Talk to AI tutor</p>
          </div>
        </Link>
        <Link
          href="/student/history"
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-100 rounded-2xl hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">My History</p>
            <p className="text-xs text-muted">Review past doubts</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl border border-border px-3 py-2.5">
      <span className="text-muted">{icon}</span>
      <div>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted">{label}</p>
      </div>
    </div>
  );
}
