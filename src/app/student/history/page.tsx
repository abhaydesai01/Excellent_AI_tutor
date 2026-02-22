"use client";

import { useState, useEffect } from "react";
import { History, Filter, Search } from "lucide-react";
import DoubtCard from "@/components/DoubtCard";

const SUBJECTS = ["All", "Mathematics", "Physics", "Chemistry", "Biology"];
const STATUSES = ["All", "resolved", "unresolved", "pending"];

export default function DoubtHistory() {
  const [doubts, setDoubts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("All");
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchDoubts();
  }, [subject, status]);

  const fetchDoubts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (subject !== "All") params.set("subject", subject);
      if (status !== "All") params.set("status", status);
      params.set("limit", "100");

      const res = await fetch(`/api/doubts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDoubts(data.doubts);
        setTotal(data.total);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const filtered = doubts.filter((d) =>
    search ? d.question.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Doubt History
        </h1>
        <p className="text-muted mt-1">Browse all your past questions and AI responses</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Subjects" : s}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted">{filtered.length} of {total} doubts</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Filter className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="font-medium">No doubts found</p>
          <p className="text-sm text-muted mt-1">Try adjusting your filters or ask a new doubt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doubt) => (
            <DoubtCard key={doubt.id} doubt={doubt} />
          ))}
        </div>
      )}
    </div>
  );
}
