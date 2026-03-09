import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth-guard";

export async function POST() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  // Seed default categories if none exist for this user
  const count = await prisma.category.count({ where: { userId } });
  if (count === 0) {
    await prisma.category.createMany({
      data: [
        { name: "개인", color: "#3B82F6", icon: "user", userId },
        { name: "회사", color: "#EF4444", icon: "briefcase", userId },
        { name: "사이드프로젝트", color: "#10B981", icon: "code", userId },
        { name: "학습", color: "#F59E0B", icon: "book", userId },
      ],
    });
  }

  // Seed default notification settings if none exist for this user
  const notifCount = await prisma.notificationSetting.count({ where: { userId } });
  if (notifCount === 0) {
    await prisma.notificationSetting.createMany({
      data: [
        { type: "before_event", minutesBefore: 30, isActive: true, userId },
        { type: "before_event", minutesBefore: 10, isActive: true, userId },
        {
          type: "daily_summary",
          minutesBefore: 0,
          cronExpr: "0 9 * * *",
          isActive: true,
          userId,
        },
      ],
    });
  }

  // Seed default focus time settings if none exist for this user
  const focusCount = await prisma.focusTimeSetting.count({ where: { userId } });
  if (focusCount === 0) {
    await prisma.focusTimeSetting.create({
      data: {
        minDuration: 60,
        preferredStart: "09:00",
        preferredEnd: "18:00",
        excludeWeekends: true,
        isActive: true,
        userId,
      },
    });
  }

  return NextResponse.json({ success: true, message: "초기 데이터가 생성되었습니다." });
}
