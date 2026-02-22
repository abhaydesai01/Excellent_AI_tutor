"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, User, BookOpen, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function RisksPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/risks")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p>Failed to load risk data</p>;

  const filtered = filter === "all"
    ? data.riskStudents
    : data.riskStudents.filter((s: any) => s.riskLevel === filter);

  const riskStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    high: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: <ShieldAlert className="w-5 h-5 text-red-500" /> },
    medium: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: <Shield className="w-5 h-5 text-amber-500" /> },
    low: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: <ShieldCheck className="w-5 h-5 text-blue-500" /> },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-warning" />
          Risk Detection
        </h1>
        <p className="text-muted mt-1">Students flagged for potential learning difficulties</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === "high" ? "all" : "high")}
          className={`p-4 rounded-xl border text-left transition-all ${filter === "high" ? "ring-2 ring-red-500" : ""} bg-red-50 border-red-200`}
        >
          <div className="flex items-center justify-between">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span className="text-2xl font-bold text-red-700">{data.summary.high}</span>
          </div>
          <p className="text-sm font-medium text-red-700 mt-2">High Risk</p>
          <p className="text-xs text-red-600/70">Immediate attention needed</p>
        </button>

        <button
          onClick={() => setFilter(filter === "medium" ? "all" : "medium")}
          className={`p-4 rounded-xl border text-left transition-all ${filter === "medium" ? "ring-2 ring-amber-500" : ""} bg-amber-50 border-amber-200`}
        >
          <div className="flex items-center justify-between">
            <Shield className="w-6 h-6 text-amber-500" />
            <span className="text-2xl font-bold text-amber-700">{data.summary.medium}</span>
          </div>
          <p className="text-sm font-medium text-amber-700 mt-2">Medium Risk</p>
          <p className="text-xs text-amber-600/70">Monitor closely</p>
        </button>

        <button
          onClick={() => setFilter(filter === "low" ? "all" : "low")}
          className={`p-4 rounded-xl border text-left transition-all ${filter === "low" ? "ring-2 ring-blue-500" : ""} bg-blue-50 border-blue-200`}
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            <span className="text-2xl font-bold text-blue-700">{data.summary.low}</span>
          </div>
          <p className="text-sm font-medium text-blue-700 mt-2">Low Risk</p>
          <p className="text-xs text-blue-600/70">Minor concerns</p>
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="font-medium">No students flagged in this category</p>
          </div>
        ) : (
          filtered.map((student: any) => {
            const style = riskStyles[student.riskLevel] || riskStyles.low;
            return (
              <Link
                key={student.id}
                href={`/admin/students/${student.id}`}
                className={`block rounded-xl border p-5 hover:shadow-md transition-all ${style.bg}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {style.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{student.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase ${style.text} bg-white/50`}>
                          {student.riskLevel} risk
                        </span>
                      </div>
                      <p className="text-sm text-muted mt-0.5">{student.email}</p>
                      {student.batch && (
                        <span className="inline-block text-xs mt-1 px-2 py-0.5 bg-white/50 rounded">
                          {student.batch}
                        </span>
                      )}

                      <div className="mt-3 space-y-1">
                        {student.riskReasons.map((reason: string, i: number) => (
                          <p key={i} className="text-sm flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            {reason}
                          </p>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {student.totalDoubts} total doubts
                        </span>
                        {student.lastActive && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last active: {format(new Date(student.lastActive), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted flex-shrink-0" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
