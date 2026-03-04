import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // Seed default categories if none exist
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: [
        { name: "개인", color: "#3B82F6", icon: "user" },
        { name: "회사", color: "#EF4444", icon: "briefcase" },
        { name: "사이드프로젝트", color: "#10B981", icon: "code" },
        { name: "학습", color: "#F59E0B", icon: "book" },
      ],
    });
  }

  // Seed default notification settings if none exist
  const notifCount = await prisma.notificationSetting.count();
  if (notifCount === 0) {
    await prisma.notificationSetting.createMany({
      data: [
        { type: "before_event", minutesBefore: 30, isActive: true },
        { type: "before_event", minutesBefore: 10, isActive: true },
        {
          type: "daily_summary",
          minutesBefore: 0,
          cronExpr: "0 9 * * *",
          isActive: true,
        },
      ],
    });
  }

  // Seed default focus time settings if none exist
  const focusCount = await prisma.focusTimeSetting.count();
  if (focusCount === 0) {
    await prisma.focusTimeSetting.create({
      data: {
        minDuration: 60,
        preferredStart: "09:00",
        preferredEnd: "18:00",
        excludeWeekends: true,
        isActive: true,
      },
    });
  }

  return NextResponse.json({ success: true, message: "초기 데이터가 생성되었습니다." });
}
