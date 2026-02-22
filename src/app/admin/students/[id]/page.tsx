"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft, User, BookOpen, Brain, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Shield, Clock, Zap, CheckCircle, XCircle, Mic,
  MessageSquare, Download, ChevronDown, ChevronUp,
} from "lucide-react";
import MarkdownMath from "@/components/MarkdownMath";

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAllDoubts, setShowAllDoubts] = useState(false);
  const [expandedDoubtId, setExpandedDoubtId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "doubts" | "timeline">("overview");

  useEffect(() => {
    fetch(`/api/admin/students/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data?.student) return <p>Student not found</p>;

  const { student, overview, weakness, riskAssessment, trends, subjectDistribution, topicDistribution, recentDoubts, timeline, allDoubts } = data;

  const riskColors: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
    high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
    medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
    low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-300" },
  };

  const rc = riskColors[riskAssessment.riskLevel] || riskColors.low;

  const trendIcon = trends.learningTrend === "improving"
    ? <TrendingUp className="w-5 h-5 text-green-600" />
    : trends.learningTrend === "declining"
    ? <TrendingDown className="w-5 h-5 text-red-600" />
    : <Minus className="w-5 h-5 text-amber-600" />;

  const trendLabel = trends.learningTrend === "improving" ? "Improving" : trends.learningTrend === "declining" ? "Declining" : "Stagnant";
  const trendColor = trends.learningTrend === "improving" ? "text-green-600" : trends.learningTrend === "declining" ? "text-red-600" : "text-amber-600";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link
          href={`/api/admin/export?type=doubts&studentId=${id}&format=csv`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Export Student Report
        </Link>
      </div>

      {/* Student Header + Risk Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-xl">
              {student.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{student.name}</h1>
              <p className="text-muted text-sm">{student.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {student.batch && <span className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">{student.batch}</span>}
                <span className="text-xs text-muted">Last active: {student.lastActive ? format(new Date(student.lastActive), "MMM d, yyyy") : "Never"}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <MiniStat label="Total Doubts" value={overview.totalDoubts} />
            <MiniStat label="This Week" value={overview.doubtsThisWeek} />
            <MiniStat label="Resolved" value={overview.resolvedCount} />
            <MiniStat label="Voice / Text" value={`${overview.voiceDoubts} / ${overview.textDoubts}`} />
          </div>
        </div>

        {/* Risk Score Card */}
        <div className={`rounded-xl border-2 p-6 ${rc.bg} ${rc.border}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted">Risk Score</span>
            <Shield className={`w-5 h-5 ${rc.text}`} />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className={`text-4xl font-bold ${rc.text}`}>{riskAssessment.riskScore}%</span>
            <span className={`text-sm font-medium uppercase ${rc.text}`}>{riskAssessment.riskLevel}</span>
          </div>
          {riskAssessment.needsIntervention && (
            <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Needs Intervention
            </p>
          )}
          <div className="space-y-1 mt-3">
            {riskAssessment.factors.map((f: string, i: number) => (
              <p key={i} className="text-xs flex items-start gap-1.5">
                <span className="mt-0.5">•</span> {f}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["overview", "doubts", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-white shadow-sm text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Weakness Detection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Weak Subjects
              </h2>
              {weakness.weakSubjects.length === 0 ? (
                <p className="text-sm text-muted">No significant weaknesses detected</p>
              ) : (
                <div className="space-y-3">
                  {weakness.weakSubjects.map((s: any) => (
                    <div key={s.subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{s.subject}</span>
                        <span className="font-bold text-amber-600">{s.confusionPercent}% confusion</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${s.confusionPercent}%`,
                            background: s.confusionPercent >= 70 ? "#ef4444" : s.confusionPercent >= 50 ? "#f59e0b" : "#22c55e",
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted mt-0.5">{s.totalDoubts} doubts</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" /> Weak Topics
              </h2>
              {weakness.weakTopics.length === 0 ? (
                <p className="text-sm text-muted">No weak topics detected</p>
              ) : (
                <div className="space-y-2">
                  {weakness.weakTopics.slice(0, 8).map((t: any) => (
                    <div key={t.topic} className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <div>
                        <span className="text-sm font-medium">{t.topic}</span>
                        <span className="text-xs text-muted ml-2">({t.subject})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">{t.totalDoubts} doubts</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          t.confusionPercent >= 70 ? "bg-red-100 text-red-700" :
                          t.confusionPercent >= 50 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>{t.confusionPercent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Repeated Doubts + Learning Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Repeated Doubts</h2>
              {weakness.repeatedDoubts.length === 0 ? (
                <p className="text-sm text-muted">No repeated doubt patterns</p>
              ) : (
                <div className="space-y-2">
                  {weakness.repeatedDoubts.map((r: any) => (
                    <div key={r.topic} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium">{r.topic}</span>
                      <span className="text-sm font-bold text-red-600">{r.count}x repeated</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold text-lg mb-4">Learning Trend</h2>
              <div className="flex items-center gap-3 mb-4">
                {trendIcon}
                <span className={`text-lg font-bold ${trendColor}`}>{trendLabel}</span>
              </div>
              <p className="text-sm text-muted mb-4">
                Overall confusion: <span className="font-bold text-foreground">{weakness.overallConfusion}%</span>
              </p>
              {trends.confusionTrend.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted">Weekly confusion trend:</p>
                  <div className="flex items-end gap-1 h-24">
                    {trends.confusionTrend.map((w: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t transition-all duration-500"
                          style={{
                            height: `${Math.max(w.confusionPercent, 4)}%`,
                            background: w.confusionPercent >= 60 ? "#ef4444" : w.confusionPercent >= 40 ? "#f59e0b" : "#22c55e",
                          }}
                        />
                        <span className="text-[10px] text-muted">{w.confusionPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subject Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold mb-4">Doubts per Subject</h2>
              <div className="space-y-3">
                {subjectDistribution.map((s: any) => (
                  <div key={s.subject} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.subject}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="h-full gradient-bg rounded-full" style={{ width: `${(s.totalDoubts / overview.totalDoubts) * 100}%` }} />
                      </div>
                      <span className="text-sm text-muted w-8 text-right">{s.totalDoubts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold mb-4">Top Topics</h2>
              <div className="space-y-2">
                {topicDistribution.slice(0, 8).map((t: any) => (
                  <div key={t.topic} className="flex items-center justify-between py-1">
                    <span className="text-sm">{t.topic}</span>
                    <span className="text-sm font-medium px-2.5 py-0.5 bg-gray-100 rounded-full">{t.totalDoubts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "doubts" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Doubts</h2>
          <div className="space-y-3">
            {(showAllDoubts ? allDoubts : recentDoubts).map((d: any) => {
              const isExpanded = expandedDoubtId === d.id;
              return (
                <div key={d.id} className="bg-white rounded-xl border border-border overflow-hidden transition-shadow hover:shadow-md">
                  <button
                    onClick={() => setExpandedDoubtId(isExpanded ? null : d.id)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isExpanded ? "" : "truncate"}`}>{d.question}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-muted">{format(new Date(d.createdAt), "MMM d, yyyy h:mm a")}</span>
                        {d.subject && <span className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{d.subject}</span>}
                        {d.topic && <span className="text-[11px] px-2 py-0.5 bg-gray-100 rounded-full">{d.topic}</span>}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          d.inputMode === "voice" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {d.inputMode === "voice" ? "🎙 Voice" : "💬 Text"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {d.confidenceScore != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          d.confidenceScore < 0.4 ? "bg-red-100 text-red-700" : d.confidenceScore < 0.7 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                        }`}>
                          {Math.round(d.confidenceScore * 100)}%
                        </span>
                      )}
                      {d.status === "resolved" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Metadata strip */}
                      <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                        {d.modelUsed && (
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Model: <strong className="text-foreground">{d.modelUsed}</strong></span>
                        )}
                        {d.complexityLevel && (
                          <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Complexity: <strong className="text-foreground capitalize">{d.complexityLevel}</strong></span>
                        )}
                        {d.responseTimeMs != null && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Response: <strong className="text-foreground">{d.responseTimeMs < 1000 ? `${d.responseTimeMs}ms` : `${(d.responseTimeMs / 1000).toFixed(1)}s`}</strong></span>
                        )}
                        {d.difficultyScore != null && (
                          <span>Difficulty: <strong className="text-foreground">{Math.round(d.difficultyScore * 100)}%</strong></span>
                        )}
                        {d.rating && (
                          <span>Rating: <strong className={d.rating === "helpful" ? "text-green-600" : "text-red-600"}>
                            {d.rating === "helpful" ? "👍 Helpful" : "👎 Not Helpful"}
                          </strong></span>
                        )}
                        {d.subTopic && (
                          <span>Sub-topic: <strong className="text-foreground">{d.subTopic}</strong></span>
                        )}
                      </div>

                      {/* Conversation trail */}
                      <div className="px-5 py-4 space-y-4">
                        {/* Student question */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 bg-blue-50 rounded-xl rounded-tl-none p-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-blue-700">Student</span>
                              <span className="text-[10px] text-muted">{format(new Date(d.createdAt), "h:mm a")}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{d.question}</p>
                          </div>
                        </div>

                        {/* AI response */}
                        {d.aiResponse && (
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                              <Brain className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none p-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-purple-700">AI Tutor</span>
                                {d.modelUsed && <span className="text-[10px] text-muted">{d.modelUsed}</span>}
                              </div>
                              <MarkdownMath content={d.aiResponse} className="text-sm" />
                            </div>
                          </div>
                        )}

                        {/* Follow-up messages */}
                        {d.followUps && d.followUps.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 pt-2">
                              <div className="flex-1 border-t border-dashed border-border" />
                              <span className="text-[11px] font-medium text-muted">Follow-ups ({d.followUps.length})</span>
                              <div className="flex-1 border-t border-dashed border-border" />
                            </div>
                            {d.followUps.map((f: any) => (
                              <div key={f.id} className="space-y-4">
                                {/* Follow-up question */}
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 bg-blue-50 rounded-xl rounded-tl-none p-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-blue-700">Student Follow-up</span>
                                      <span className="text-[10px] text-muted">{format(new Date(f.createdAt), "h:mm a")}</span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{f.question}</p>
                                  </div>
                                </div>
                                {/* Follow-up answer */}
                                {f.answer && (
                                  <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                                      <Brain className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none p-4">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-purple-700">AI Tutor</span>
                                        <span className="text-[10px] text-muted">{format(new Date(f.createdAt), "h:mm a")}</span>
                                      </div>
                                      <div className="text-sm prose prose-sm max-w-none whitespace-pre-wrap">{f.answer}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        )}

                        {/* No follow-ups indicator */}
                        {(!d.followUps || d.followUps.length === 0) && d.aiResponse && (
                          <p className="text-xs text-center text-muted py-2">No follow-up questions on this doubt</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {allDoubts.length > 10 && (
            <button
              onClick={() => setShowAllDoubts(!showAllDoubts)}
              className="flex items-center gap-1 mx-auto text-sm text-primary hover:text-primary-dark"
            >
              {showAllDoubts ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Show All {allDoubts.length} Doubts</>}
            </button>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Student Timeline
          </h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {timeline.map((entry: any, i: number) => {
                const isRepeated = i > 0 && timeline[i - 1]?.topic === entry.topic;
                const isTimelineExpanded = expandedDoubtId === `tl-${entry.id}`;
                return (
                  <div key={entry.id} className="relative flex gap-4 pl-2">
                    <div className={`w-3 h-3 rounded-full mt-1.5 z-10 flex-shrink-0 ${
                      entry.status === "unresolved" ? "bg-red-500" : isRepeated ? "bg-amber-500" : "bg-green-500"
                    }`} style={{ marginLeft: "18px" }} />
                    <div className={`flex-1 rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${isRepeated ? "border-amber-200" : "border-border"}`}>
                      <button
                        onClick={() => setExpandedDoubtId(isTimelineExpanded ? null : `tl-${entry.id}`)}
                        className={`w-full text-left p-4 ${isRepeated ? "bg-amber-50/30" : "bg-white"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {isTimelineExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
                            <span className="text-xs text-muted">{format(new Date(entry.date), "MMM d, yyyy h:mm a")}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {entry.subject && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{entry.subject}</span>}
                            {entry.topic && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{entry.topic}</span>}
                          </div>
                        </div>
                        <p className={`text-sm font-medium ${isTimelineExpanded ? "" : "truncate"}`}>{entry.question}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                          {entry.complexity && <span className="capitalize">{entry.complexity}</span>}
                          {entry.modelUsed && <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{entry.modelUsed}</span>}
                          {entry.confidenceScore != null && (
                            <span className={entry.confidenceScore < 0.4 ? "text-red-600 font-bold" : ""}>
                              Conf: {Math.round(entry.confidenceScore * 100)}%
                            </span>
                          )}
                          {entry.followUps?.length > 0 && (
                            <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {entry.followUps.length} follow-up{entry.followUps.length > 1 ? "s" : ""}</span>
                          )}
                          {entry.status === "unresolved" && <span className="text-red-600 font-bold">UNRESOLVED</span>}
                          {isRepeated && <span className="text-amber-600 font-bold">⚠ REPEATED TOPIC</span>}
                        </div>
                      </button>

                      {isTimelineExpanded && (
                        <div className="border-t border-border">
                          <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                            {entry.modelUsed && (
                              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Model: <strong className="text-foreground">{entry.modelUsed}</strong></span>
                            )}
                            {entry.complexity && (
                              <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Complexity: <strong className="text-foreground capitalize">{entry.complexity}</strong></span>
                            )}
                            {entry.responseTimeMs != null && (
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Response: <strong className="text-foreground">{entry.responseTimeMs < 1000 ? `${entry.responseTimeMs}ms` : `${(entry.responseTimeMs / 1000).toFixed(1)}s`}</strong></span>
                            )}
                            {entry.rating && (
                              <span>Rating: <strong className={entry.rating === "helpful" ? "text-green-600" : "text-red-600"}>
                                {entry.rating === "helpful" ? "👍 Helpful" : "👎 Not Helpful"}
                              </strong></span>
                            )}
                            {entry.inputMode && (
                              <span>Input: <strong className="text-foreground capitalize">{entry.inputMode}</strong></span>
                            )}
                          </div>

                          <div className="px-5 py-4 space-y-4 bg-white">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 bg-blue-50 rounded-xl rounded-tl-none p-4">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-blue-700">Student</span>
                                  <span className="text-[10px] text-muted">{format(new Date(entry.date), "h:mm a")}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{entry.question}</p>
                              </div>
                            </div>

                            {entry.aiResponse && (
                              <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                                  <Brain className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none p-4">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-purple-700">AI Tutor</span>
                                    {entry.modelUsed && <span className="text-[10px] text-muted">{entry.modelUsed}</span>}
                                  </div>
                                  <MarkdownMath content={entry.aiResponse} className="text-sm" />
                                </div>
                              </div>
                            )}

                            {entry.followUps && entry.followUps.length > 0 && (
                              <>
                                <div className="flex items-center gap-2 pt-2">
                                  <div className="flex-1 border-t border-dashed border-border" />
                                  <span className="text-[11px] font-medium text-muted">Follow-ups ({entry.followUps.length})</span>
                                  <div className="flex-1 border-t border-dashed border-border" />
                                </div>
                                {entry.followUps.map((f: any) => (
                                  <div key={f.id} className="space-y-4">
                                    <div className="flex gap-3">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div className="flex-1 bg-blue-50 rounded-xl rounded-tl-none p-4">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-semibold text-blue-700">Student Follow-up</span>
                                          <span className="text-[10px] text-muted">{format(new Date(f.createdAt), "h:mm a")}</span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{f.question}</p>
                                      </div>
                                    </div>
                                    {f.answer && (
                                      <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                                          <Brain className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none p-4">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold text-purple-700">AI Tutor</span>
                                            <span className="text-[10px] text-muted">{format(new Date(f.createdAt), "h:mm a")}</span>
                                          </div>
                                          <div className="text-sm prose prose-sm max-w-none whitespace-pre-wrap">{f.answer}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}

                            {(!entry.followUps || entry.followUps.length === 0) && entry.aiResponse && (
                              <p className="text-xs text-center text-muted py-2">No follow-up questions on this doubt</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
