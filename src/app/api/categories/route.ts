import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth-guard";

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const categories = await prisma.category.findMany({
    where: { userId },
    include: {
      _count: { select: { tasks: true, memos: true, events: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const category = await prisma.category.create({
    data: {
      name: body.name,
      color: body.color || "#3B82F6",
      icon: body.icon,
      userId,
    },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const category = await prisma.category.update({
    where: { id: body.id, userId },
    data: {
      name: body.name,
      color: body.color,
      icon: body.icon,
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.category.delete({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
