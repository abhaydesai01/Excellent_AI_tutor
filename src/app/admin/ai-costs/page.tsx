"use client";

import { useState, useEffect } from "react";
import {
  DollarSign, TrendingUp, Zap, Clock, BarChart3,
  Activity, Users, ArrowUpRight, ArrowDownRight, Cpu,
} from "lucide-react";

export default function AiCostsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai-costs")
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}</div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!data) return <p className="text-muted">Failed to load data</p>;

  const { summary, costByModel, costByService, costByProvider, dailyTrend, topSpenders, recentLogs } = data;

  const maxDailyCost = Math.max(...dailyTrend.map((d: any) => d.cost), 0.001);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" /> AI Cost Dashboard
        </h1>
        <p className="text-muted text-sm mt-1">Real-time AI spending tracker for the CEO</p>
      </div>

      {/* Top-line metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CostCard
          label="Total Spend"
          value={`$${summary.totalCost.toFixed(4)}`}
          sub={`${summary.totalRequests} API calls`}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-primary"
          bg="bg-primary/10"
        />
        <CostCard
          label="Today"
          value={`$${summary.todayCost.toFixed(4)}`}
          sub="Last 24 hours"
          icon={<Clock className="w-5 h-5" />}
          color="text-blue-600"
          bg="bg-blue-100"
        />
        <CostCard
          label="This Week"
          value={`$${summary.weekCost.toFixed(4)}`}
          sub="Last 7 days"
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-green-600"
          bg="bg-green-100"
        />
        <CostCard
          label="This Month"
          value={`$${summary.monthCost.toFixed(4)}`}
          sub={`Avg $${summary.avgCostPerRequest.toFixed(6)}/req`}
          icon={<BarChart3 className="w-5 h-5" />}
          color="text-amber-600"
          bg="bg-amber-100"
        />
      </div>

      {/* Token summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Total Tokens Used" value={formatNumber(summary.totalTokens)} />
        <MiniStat label="Avg Tokens/Request" value={formatNumber(summary.avgTokensPerRequest)} />
        <MiniStat label="Total API Calls" value={summary.totalRequests.toString()} />
        <MiniStat label="Avg Cost/Request" value={`$${summary.avgCostPerRequest.toFixed(6)}`} />
      </div>

      {/* Daily Cost Trend */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Daily Cost Trend (30 days)
        </h2>
        <div className="flex items-end gap-[3px] h-40">
          {dailyTrend.map((d: any, i: number) => {
            const height = maxDailyCost > 0 ? (d.cost / maxDailyCost) * 100 : 0;
            const isToday = i === dailyTrend.length - 1;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-foreground text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                  {d.date}: ${d.cost.toFixed(4)} ({d.requests} reqs)
                </div>
                <div
                  className={`w-full rounded-t transition-all duration-300 min-h-[2px] ${
                    isToday ? "bg-primary" : d.cost > 0 ? "bg-primary/40" : "bg-gray-200"
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-2">
          <span>{dailyTrend[0]?.date}</span>
          <span>Today</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Model */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-500" /> Cost by Model
          </h2>
          {costByModel.length === 0 ? (
            <p className="text-sm text-muted">No data yet</p>
          ) : (
            <div className="space-y-4">
              {costByModel.map((m: any) => {
                const maxCost = costByModel[0]?.cost || 1;
                return (
                  <div key={m.model}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium">{m.model}</span>
                        <span className="text-xs text-muted ml-2">{m.requests} calls</span>
                      </div>
                      <span className="text-sm font-bold text-primary">${m.cost.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="h-full gradient-bg rounded-full transition-all duration-700"
                        style={{ width: `${(m.cost / maxCost) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-1 text-[11px] text-muted">
                      <span>Input: {formatNumber(m.inputTokens)} tokens</span>
                      <span>Output: {formatNumber(m.outputTokens)} tokens</span>
                      <span>Avg: ${m.avgCostPerRequest.toFixed(6)}/req</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cost by Service */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Cost by Service
          </h2>
          {costByService.length === 0 ? (
            <p className="text-sm text-muted">No data yet</p>
          ) : (
            <div className="space-y-3">
              {costByService.map((s: any) => {
                const label: Record<string, string> = {
                  chat: "Doubt Resolution (Chat)",
                  followup: "Follow-up Questions",
                  "whisper-stt": "Voice Transcription (STT)",
                  tts: "Text-to-Speech (TTS)",
                };
                const colors: Record<string, string> = {
                  chat: "bg-blue-500",
                  followup: "bg-purple-500",
                  "whisper-stt": "bg-green-500",
                  tts: "bg-amber-500",
                };
                const totalCost = costByService.reduce((a: number, b: any) => a + b.cost, 0);
                const pct = totalCost > 0 ? (s.cost / totalCost) * 100 : 0;
                return (
                  <div key={s.service} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${colors[s.service] || "bg-gray-400"}`} />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{label[s.service] || s.service}</span>
                        <span className="text-sm font-bold">${s.cost.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted mt-0.5">
                        <span>{s.requests} requests</span>
                        <span>{pct.toFixed(1)}% of total</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Provider */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4">Cost by Provider</h2>
          {costByProvider.length === 0 ? (
            <p className="text-sm text-muted">No data yet</p>
          ) : (
            <div className="space-y-3">
              {costByProvider.map((p: any) => (
                <div key={p.provider} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-base font-bold capitalize">{p.provider}</span>
                    <p className="text-xs text-muted">{p.requests} API calls &middot; {formatNumber(p.tokens)} tokens</p>
                  </div>
                  <span className="text-lg font-bold text-primary">${p.cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Spenders (students) */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Top Students by AI Cost
          </h2>
          {topSpenders.length === 0 ? (
            <p className="text-sm text-muted">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topSpenders.map((s: any, i: number) => (
                <div key={s.id || i} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-medium">{s.name || "Unknown"}</span>
                      {s.batch && <span className="text-xs text-muted ml-2">{s.batch}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">${s.cost.toFixed(4)}</span>
                    <p className="text-[11px] text-muted">{s.requests} reqs</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent API Calls */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-4">Recent API Calls</h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted">No API calls logged yet. Costs will appear here as students use the platform.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-3 font-medium text-muted">Time</th>
                  <th className="py-2 px-3 font-medium text-muted">Service</th>
                  <th className="py-2 px-3 font-medium text-muted">Model</th>
                  <th className="py-2 px-3 font-medium text-muted">Input</th>
                  <th className="py-2 px-3 font-medium text-muted">Output</th>
                  <th className="py-2 px-3 font-medium text-muted">Cost</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((l: any) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-xs text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        l.service === "chat" ? "bg-blue-100 text-blue-700" :
                        l.service === "whisper-stt" ? "bg-green-100 text-green-700" :
                        l.service === "tts" ? "bg-amber-100 text-amber-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {l.service}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs font-medium">{l.model}</td>
                    <td className="py-2 px-3 text-xs">{formatNumber(l.inputTokens)}</td>
                    <td className="py-2 px-3 text-xs">{formatNumber(l.outputTokens)}</td>
                    <td className="py-2 px-3 text-xs font-bold text-primary">${l.costUsd.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CostCard({ label, value, sub, icon, color, bg }: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted">{label}</span>
        <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
