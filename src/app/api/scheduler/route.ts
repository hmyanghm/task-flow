import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const schedules = await prisma.schedule.findMany({
    include: { task: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const schedule = await prisma.schedule.create({
    data: {
      name: body.name,
      cronExpr: body.cronExpr,
      type: body.type,
      targetId: body.targetId,
      targetType: body.targetType,
      slackChannel: body.slackChannel,
      message: body.message,
      isActive: body.isActive ?? true,
      taskId: body.taskId,
    },
  });
  return NextResponse.json(schedule, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const schedule = await prisma.schedule.update({
    where: { id: body.id },
    data: {
      name: body.name,
      cronExpr: body.cronExpr,
      type: body.type,
      slackChannel: body.slackChannel,
      message: body.message,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(schedule);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.schedule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
