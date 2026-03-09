import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDocument } from "@/lib/documents";
import { getAuthUserId } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const doc = await prisma.document.findUnique({ where: { id, userId } });
    return NextResponse.json(doc);
  }

  const docs = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, sourceType: true, createdAt: true },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const doc = await generateDocument(
    body.sourceType || "daily_summary",
    body.dateRange
      ? {
          start: new Date(body.dateRange.start),
          end: new Date(body.dateRange.end),
        }
      : undefined,
    userId
  );
  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.document.delete({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
