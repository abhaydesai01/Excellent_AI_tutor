import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { rating } = await req.json();

    if (!["helpful", "not_helpful"].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const doubt = await prisma.doubt.update({
      where: { id },
      data: { rating },
    });

    await logActivity(session.user.id, "doubt_rated", `Rated ${rating}`, { doubtId: id, rating });

    return NextResponse.json(doubt);
  } catch (error) {
    console.error("Rating error:", error);
    return NextResponse.json({ error: "Failed to rate doubt" }, { status: 500 });
  }
}
