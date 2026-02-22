"use client";

import { useState, useEffect } from "react";
import { Mic, MessageSquare, Volume2, BarChart3, CheckCircle, Clock, ThumbsUp } from "lucide-react";

export default function VoiceAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/voice-analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}</div>
      </div>
    );
  }

  if (!data) return <p>Failed to load voice analytics</p>;

  const { overview, performance } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mic className="w-6 h-6 text-fuchsia-500" /> Voice Analytics Dashboard
        </h1>
        <p className="text-muted mt-1">Voice vs text interaction analysis and performance comparison</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-6">
          <p className="text-sm text-muted font-medium">Total Interactions</p>
          <p className="text-3xl font-bold mt-1">{overview.totalDoubts}</p>
        </div>
        <div className="bg-fuchsia-50 rounded-xl border border-fuchsia-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-5 h-5 text-fuchsia-600" />
            <p className="text-sm font-medium text-fuchsia-700">Voice</p>
          </div>
          <p className="text-3xl font-bold text-fuchsia-700">{overview.voiceDoubts}</p>
          <p className="text-sm text-fuchsia-600 mt-1">{overview.voicePercent}% of total</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-700">Text</p>
          </div>
          <p className="text-3xl font-bold text-blue-700">{overview.textDoubts}</p>
          <p className="text-sm text-blue-600 mt-1">{overview.textPercent}% of total</p>
        </div>
      </div>

      {/* Voice vs Text Usage Bar */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4">Voice vs Text Split</h2>
        <div className="flex rounded-full overflow-hidden h-10">
          <div
            className="bg-gradient-to-r from-fuchsia-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold transition-all duration-700"
            style={{ width: `${Math.max(overview.voicePercent, 5)}%` }}
          >
            {overview.voicePercent > 10 && `${overview.voicePercent}% Voice`}
          </div>
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold transition-all duration-700"
            style={{ width: `${Math.max(overview.textPercent, 5)}%` }}
          >
            {overview.textPercent > 10 && `${overview.textPercent}% Text`}
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-6">Performance Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted">Metric</th>
                <th className="text-left py-3 px-4 font-medium text-fuchsia-600">
                  <span className="flex items-center gap-1"><Mic className="w-4 h-4" /> Voice</span>
                </th>
                <th className="text-left py-3 px-4 font-medium text-blue-600">
                  <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Text</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted" /> Total Queries</td>
                <td className="py-3 px-4 font-bold">{performance.voice.total}</td>
                <td className="py-3 px-4 font-bold">{performance.text.total}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-muted" /> Resolution Rate</td>
                <td className="py-3 px-4 font-bold text-green-600">{performance.voice.resolutionRate}%</td>
                <td className="py-3 px-4 font-bold text-green-600">{performance.text.resolutionRate}%</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 flex items-center gap-2"><Clock className="w-4 h-4 text-muted" /> Avg Response Time</td>
                <td className="py-3 px-4 font-bold">{(performance.voice.avgResponseMs / 1000).toFixed(1)}s</td>
                <td className="py-3 px-4 font-bold">{(performance.text.avgResponseMs / 1000).toFixed(1)}s</td>
              </tr>
              <tr>
                <td className="py-3 px-4 flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-muted" /> Satisfaction Rate</td>
                <td className="py-3 px-4 font-bold">{performance.voice.satisfactionRate}%</td>
                <td className="py-3 px-4 font-bold">{performance.text.satisfactionRate}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
