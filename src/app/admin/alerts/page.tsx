"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Bell, AlertTriangle, Shield, Activity, RotateCcw,
  CheckCircle, Eye, EyeOff, User, BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AlertsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alerts");
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: true }),
      });
      fetchAlerts();
    } catch { toast.error("Failed to update alert"); }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "all" }),
      });
      fetchAlerts();
      toast.success("All alerts marked as read");
    } catch { toast.error("Failed to update alerts"); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data) return <p>Failed to load alerts</p>;

  const severityIcons: Record<string, { icon: React.ReactNode; bg: string; border: string }> = {
    critical: { icon: <AlertTriangle className="w-5 h-5 text-red-500" />, bg: "bg-red-50", border: "border-red-200" },
    high: { icon: <Shield className="w-5 h-5 text-orange-500" />, bg: "bg-orange-50", border: "border-orange-200" },
    medium: { icon: <Activity className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50", border: "border-amber-200" },
    low: { icon: <Bell className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50", border: "border-blue-200" },
  };

  const typeIcons: Record<string, React.ReactNode> = {
    inactivity: <User className="w-4 h-4" />,
    high_risk: <AlertTriangle className="w-4 h-4" />,
    confusion_spike: <BookOpen className="w-4 h-4" />,
    repeated_doubt: <RotateCcw className="w-4 h-4" />,
  };

  const filtered = filter === "all"
    ? data.alerts
    : filter === "unread"
    ? data.alerts.filter((a: any) => !a.isRead)
    : data.alerts.filter((a: any) => a.severity === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Alerts
            {data.unreadCount > 0 && (
              <span className="text-sm px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full">{data.unreadCount} unread</span>
            )}
          </h1>
          <p className="text-muted mt-1">System-generated alerts for student and concept monitoring</p>
        </div>
        {data.unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50"
          >
            <CheckCircle className="w-4 h-4" /> Mark All Read
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["critical", "high", "medium", "low"] as const).map((severity) => {
          const style = severityIcons[severity];
          return (
            <button
              key={severity}
              onClick={() => setFilter(filter === severity ? "all" : severity)}
              className={`p-3 rounded-xl border text-left transition-all ${style.bg} ${style.border} ${filter === severity ? "ring-2 ring-offset-1 ring-current" : ""}`}
            >
              <div className="flex items-center justify-between">
                {style.icon}
                <span className="text-xl font-bold">{data.summary[severity] || 0}</span>
              </div>
              <p className="text-xs font-medium capitalize mt-1">{severity}</p>
            </button>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {["all", "unread", "critical", "high", "medium", "low"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? "bg-primary text-white" : "bg-gray-100 text-muted hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium">No alerts in this category</p>
          </div>
        ) : (
          filtered.map((alert: any) => {
            const style = severityIcons[alert.severity] || severityIcons.low;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-5 transition-all ${
                  alert.isRead ? "bg-white border-border opacity-70" : `${style.bg} ${style.border}`
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {style.icon}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{alert.title}</h3>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          alert.severity === "critical" ? "bg-red-100 text-red-700" :
                          alert.severity === "high" ? "bg-orange-100 text-orange-700" :
                          alert.severity === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>{alert.severity}</span>
                        <span className="text-xs text-muted flex items-center gap-1">
                          {typeIcons[alert.type]} {alert.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-muted mt-1">{alert.message}</p>
                      <p className="text-xs text-muted mt-2">
                        {format(new Date(alert.createdAt), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                  {!alert.isRead && (
                    <button
                      onClick={() => markRead(alert.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted hover:text-foreground border border-border rounded-lg hover:bg-white transition-colors flex-shrink-0"
                    >
                      <Eye className="w-3 h-3" /> Read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
