import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }
  if (tag) {
    where.tags = { contains: tag };
  }

  const memos = await prisma.memo.findMany({
    where,
    include: { category: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(memos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const memo = await prisma.memo.create({
    data: {
      title: body.title,
      content: body.content,
      tags: body.tags,
      categoryId: body.categoryId,
    },
    include: { category: true },
  });
  return NextResponse.json(memo, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const memo = await prisma.memo.update({
    where: { id: body.id },
    data: {
      title: body.title,
      content: body.content,
      tags: body.tags,
      categoryId: body.categoryId,
    },
    include: { category: true },
  });
  return NextResponse.json(memo);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.memo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
