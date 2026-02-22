import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateDoubtResponse } from "@/lib/ai/generate-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const doubt = await prisma.doubt.findUnique({
      where: { id },
      include: { followUps: { orderBy: { createdAt: "asc" } } },
    });

    if (!doubt) {
      return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
    }

    return NextResponse.json(doubt);
  } catch (error) {
    console.error("Fetch doubt error:", error);
    return NextResponse.json(
      { error: "Failed to fetch doubt" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    const doubt = await prisma.doubt.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(doubt);
  } catch (error) {
    console.error("Update doubt error:", error);
    return NextResponse.json(
      { error: "Failed to update doubt" },
      { status: 500 }
    );
  }
}
