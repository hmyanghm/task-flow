import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNaturalLanguage } from "@/lib/natural-language";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (start && end) {
    where.startTime = { gte: new Date(start), lte: new Date(end) };
  }
  if (type) where.type = type;

  const events = await prisma.event.findMany({
    where,
    include: { category: true },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Natural language input support
  if (body.naturalLanguage) {
    const parsed = parseNaturalLanguage(body.naturalLanguage);
    if (!parsed) {
      return NextResponse.json(
        { error: "일정을 파싱할 수 없습니다. 예: '내일 오후 2시 팀 미팅'" },
        { status: 400 }
      );
    }
    const event = await prisma.event.create({
      data: {
        title: parsed.title,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        location: parsed.location,
        allDay: parsed.allDay,
        type: "event",
        categoryId: body.categoryId,
      },
    });
    return NextResponse.json(event, { status: 201 });
  }

  const event = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description,
      location: body.location,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      allDay: body.allDay || false,
      color: body.color,
      type: body.type || "event",
      categoryId: body.categoryId,
      isRecurring: body.isRecurring || false,
      recurrence: body.recurrence,
    },
  });
  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const event = await prisma.event.update({
    where: { id: body.id },
    data: {
      title: body.title,
      description: body.description,
      location: body.location,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      allDay: body.allDay,
      color: body.color,
      type: body.type,
      categoryId: body.categoryId,
    },
  });
  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
