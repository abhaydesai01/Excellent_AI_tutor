"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, BookOpen, ChevronRight } from "lucide-react";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/students?${params}`);
      if (res.ok) setStudents(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Students
        </h1>
        <p className="text-muted mt-1">View and analyze individual student performance</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students by name or email..."
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="font-medium">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/admin/students/${student.id}`}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm mb-3">
                    {student.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <h3 className="font-semibold">{student.name}</h3>
                  <p className="text-sm text-muted">{student.email}</p>
                  {student.batch && (
                    <span className="inline-block mt-2 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                      {student.batch}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm text-muted">
                <BookOpen className="w-4 h-4" />
                <span>{student._count.doubts} doubts asked</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
