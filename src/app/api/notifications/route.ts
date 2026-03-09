import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth-guard";

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const settings = await prisma.notificationSetting.findMany({
    where: { userId },
  });
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const setting = await prisma.notificationSetting.create({
    data: {
      type: body.type,
      minutesBefore: body.minutesBefore || 30,
      slackChannel: body.slackChannel,
      isActive: body.isActive ?? true,
      cronExpr: body.cronExpr,
      userId,
    },
  });
  return NextResponse.json(setting, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const setting = await prisma.notificationSetting.update({
    where: { id: body.id, userId },
    data: {
      minutesBefore: body.minutesBefore,
      slackChannel: body.slackChannel,
      isActive: body.isActive,
      cronExpr: body.cronExpr,
    },
  });
  return NextResponse.json(setting);
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.notificationSetting.delete({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
