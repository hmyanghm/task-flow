import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoScheduleFocusTime, generateFocusBlocks } from "@/lib/focus-time";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (date) {
    const blocks = await generateFocusBlocks(new Date(date));
    return NextResponse.json(blocks);
  }

  const settings = await prisma.focusTimeSetting.findFirst({
    where: { isActive: true },
  });
  return NextResponse.json(settings || { isActive: false });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "generate") {
    const results = await autoScheduleFocusTime(body.days || 5);
    return NextResponse.json(results);
  }

  if (body.action === "settings") {
    const existing = await prisma.focusTimeSetting.findFirst();
    if (existing) {
      const settings = await prisma.focusTimeSetting.update({
        where: { id: existing.id },
        data: {
          minDuration: body.minDuration,
          preferredStart: body.preferredStart,
          preferredEnd: body.preferredEnd,
          excludeWeekends: body.excludeWeekends,
          isActive: body.isActive,
        },
      });
      return NextResponse.json(settings);
    }

    const settings = await prisma.focusTimeSetting.create({
      data: {
        minDuration: body.minDuration || 60,
        preferredStart: body.preferredStart || "09:00",
        preferredEnd: body.preferredEnd || "18:00",
        excludeWeekends: body.excludeWeekends ?? true,
        isActive: true,
      },
    });
    return NextResponse.json(settings, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
