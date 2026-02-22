import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "educator", "mentor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allLogs = await prisma.aiUsageLog.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Totals
    const totalCost = allLogs.reduce((s, l) => s + l.costUsd, 0);
    const totalTokens = allLogs.reduce((s, l) => s + l.totalTokens, 0);
    const totalRequests = allLogs.length;

    const todayLogs = allLogs.filter(l => l.createdAt >= todayStart);
    const weekLogs = allLogs.filter(l => l.createdAt >= weekStart);
    const monthLogs = allLogs.filter(l => l.createdAt >= monthStart);

    const todayCost = todayLogs.reduce((s, l) => s + l.costUsd, 0);
    const weekCost = weekLogs.reduce((s, l) => s + l.costUsd, 0);
    const monthCost = monthLogs.reduce((s, l) => s + l.costUsd, 0);

    // Cost by model
    const modelMap: Record<string, { requests: number; tokens: number; cost: number; inputTokens: number; outputTokens: number }> = {};
    allLogs.forEach(l => {
      if (!modelMap[l.model]) modelMap[l.model] = { requests: 0, tokens: 0, cost: 0, inputTokens: 0, outputTokens: 0 };
      modelMap[l.model].requests++;
      modelMap[l.model].tokens += l.totalTokens;
      modelMap[l.model].cost += l.costUsd;
      modelMap[l.model].inputTokens += l.inputTokens;
      modelMap[l.model].outputTokens += l.outputTokens;
    });

    const costByModel = Object.entries(modelMap)
      .map(([model, data]) => ({ model, ...data, avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0 }))
      .sort((a, b) => b.cost - a.cost);

    // Cost by service
    const serviceMap: Record<string, { requests: number; cost: number; tokens: number }> = {};
    allLogs.forEach(l => {
      if (!serviceMap[l.service]) serviceMap[l.service] = { requests: 0, cost: 0, tokens: 0 };
      serviceMap[l.service].requests++;
      serviceMap[l.service].cost += l.costUsd;
      serviceMap[l.service].tokens += l.totalTokens;
    });

    const costByService = Object.entries(serviceMap)
      .map(([service, data]) => ({ service, ...data }))
      .sort((a, b) => b.cost - a.cost);

    // Cost by provider
    const providerMap: Record<string, { requests: number; cost: number; tokens: number }> = {};
    allLogs.forEach(l => {
      if (!providerMap[l.provider]) providerMap[l.provider] = { requests: 0, cost: 0, tokens: 0 };
      providerMap[l.provider].requests++;
      providerMap[l.provider].cost += l.costUsd;
      providerMap[l.provider].tokens += l.totalTokens;
    });

    const costByProvider = Object.entries(providerMap)
      .map(([provider, data]) => ({ provider, ...data }))
      .sort((a, b) => b.cost - a.cost);

    // Daily cost trend (last 30 days)
    const dailyCosts: Record<string, { date: string; cost: number; requests: number; tokens: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyCosts[key] = { date: key, cost: 0, requests: 0, tokens: 0 };
    }
    allLogs.forEach(l => {
      const key = l.createdAt.toISOString().split("T")[0];
      if (dailyCosts[key]) {
        dailyCosts[key].cost += l.costUsd;
        dailyCosts[key].requests++;
        dailyCosts[key].tokens += l.totalTokens;
      }
    });
    const dailyTrend = Object.values(dailyCosts);

    // Top spending students
    const studentCostMap: Record<string, { cost: number; requests: number }> = {};
    allLogs.forEach(l => {
      if (l.userId) {
        if (!studentCostMap[l.userId]) studentCostMap[l.userId] = { cost: 0, requests: 0 };
        studentCostMap[l.userId].cost += l.costUsd;
        studentCostMap[l.userId].requests++;
      }
    });

    const topStudentIds = Object.entries(studentCostMap)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 10)
      .map(([id]) => id);

    const topStudentUsers = topStudentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topStudentIds } },
          select: { id: true, name: true, email: true, batch: true },
        })
      : [];

    const topSpenders = topStudentIds.map(id => {
      const user = topStudentUsers.find(u => u.id === id);
      const data = studentCostMap[id];
      return { ...user, ...data };
    });

    // Recent logs (last 20)
    const recentLogs = allLogs.slice(0, 20).map(l => ({
      id: l.id,
      service: l.service,
      model: l.model,
      provider: l.provider,
      inputTokens: l.inputTokens,
      outputTokens: l.outputTokens,
      totalTokens: l.totalTokens,
      costUsd: l.costUsd,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      summary: {
        totalCost,
        todayCost,
        weekCost,
        monthCost,
        totalTokens,
        totalRequests,
        avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        avgTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
      },
      costByModel,
      costByService,
      costByProvider,
      dailyTrend,
      topSpenders,
      recentLogs,
    });
  } catch (error) {
    console.error("AI costs error:", error);
    return NextResponse.json({ error: "Failed to fetch AI costs" }, { status: 500 });
  }
}
