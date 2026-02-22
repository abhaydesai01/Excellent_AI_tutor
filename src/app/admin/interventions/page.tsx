"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, AlertTriangle, Users, BookOpen, Brain, Lightbulb,
  ChevronRight, MessageSquare, Calendar, UserPlus,
} from "lucide-react";

export default function InterventionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/interventions")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
      </div>
    );
  }

  if (!data) return <p>Failed to load interventions</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-500" /> Intervention & Action Center
        </h1>
        <p className="text-muted mt-1">Proactive student support and concept-level recommendations</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span className="text-3xl font-bold text-red-700">{data.summary.critical}</span>
          </div>
          <p className="font-medium text-red-700 mt-2">Critical Risk</p>
          <p className="text-xs text-red-600/70">Immediate intervention needed</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <Shield className="w-6 h-6 text-orange-500" />
            <span className="text-3xl font-bold text-orange-700">{data.summary.high}</span>
          </div>
          <p className="font-medium text-orange-700 mt-2">High Risk</p>
          <p className="text-xs text-orange-600/70">Schedule mentoring session</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <Users className="w-6 h-6 text-amber-500" />
            <span className="text-3xl font-bold text-amber-700">{data.summary.medium}</span>
          </div>
          <p className="font-medium text-amber-700 mt-2">Medium Risk</p>
          <p className="text-xs text-amber-600/70">Monitor closely</p>
        </div>
      </div>

      {/* AI Suggestions */}
      {data.aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-purple-500" /> AI Suggested Actions
          </h2>
          <div className="space-y-3">
            {data.aiSuggestions.map((s: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{s.suggestion}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted">Risk: <span className="font-bold text-red-600">{s.riskScore}%</span></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Needing Attention */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Students Needing Attention
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted">Student</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Risk Score</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Weak Subject</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Weak Topics</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Doubts</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.studentsNeedingAttention.map((s: any) => {
                const riskColor = s.riskLevel === "critical" ? "text-red-600 bg-red-100" :
                                  s.riskLevel === "high" ? "text-orange-600 bg-orange-100" :
                                  "text-amber-600 bg-amber-100";
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link href={`/admin/students/${s.id}`} className="font-medium text-primary hover:underline">{s.name}</Link>
                      <p className="text-xs text-muted">{s.batch}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${riskColor}`}>
                        {s.riskScore}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.weakSubject ? <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">{s.weakSubject}</span> : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {s.weakTopics.map((t: string) => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 rounded">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">{s.totalDoubts}</td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/students/${s.id}`} className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-0.5">
                        View Profile <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Concept Intervention Recommendations */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" /> Concept Intervention Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.conceptRecommendations.map((c: any) => (
            <div key={`${c.subject}-${c.topic}`} className="border border-border rounded-xl p-4 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{c.topic}</h3>
                  <p className="text-xs text-muted">{c.subject}</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {c.studentsStruggling} students
                </span>
              </div>
              <p className="text-sm text-muted mt-2">
                {c.studentsStruggling} students struggling with {c.totalDoubts} total doubts
              </p>
              <div className="flex gap-2 mt-3">
                <button className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  <Calendar className="w-3 h-3" /> Schedule Class
                </button>
                <button className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                  <MessageSquare className="w-3 h-3" /> Send Material
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
