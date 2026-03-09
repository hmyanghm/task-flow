import { prisma } from "./prisma";
import {
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  addDays,
  isWeekend,
  differenceInMinutes,
} from "date-fns";

interface TimeSlot {
  start: Date;
  end: Date;
}

export async function generateFocusBlocks(date: Date, userId?: string): Promise<TimeSlot[]> {
  const userFilter = userId ? { userId } : {};

  const settings = await prisma.focusTimeSetting.findFirst({
    where: { isActive: true, ...userFilter },
  });

  if (!settings) return [];

  if (settings.excludeWeekends && isWeekend(date)) return [];

  const [startH, startM] = settings.preferredStart.split(":").map(Number);
  const [endH, endM] = settings.preferredEnd.split(":").map(Number);

  const dayStart = setMinutes(setHours(startOfDay(date), startH), startM);
  const dayEnd = setMinutes(setHours(startOfDay(date), endH), endM);

  // Get existing events for the day
  const events = await prisma.event.findMany({
    where: {
      ...userFilter,
      startTime: { gte: startOfDay(date), lte: endOfDay(date) },
      type: { not: "focus_time" },
    },
    orderBy: { startTime: "asc" },
  });

  // Find gaps between events
  const gaps: TimeSlot[] = [];
  let current = dayStart;

  for (const event of events) {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    if (eventStart > current) {
      const gapMinutes = differenceInMinutes(eventStart, current);
      if (gapMinutes >= settings.minDuration) {
        gaps.push({ start: new Date(current), end: new Date(eventStart) });
      }
    }

    if (eventEnd > current) {
      current = eventEnd;
    }
  }

  // Check gap after last event
  if (current < dayEnd) {
    const gapMinutes = differenceInMinutes(dayEnd, current);
    if (gapMinutes >= settings.minDuration) {
      gaps.push({ start: new Date(current), end: new Date(dayEnd) });
    }
  }

  return gaps;
}

export async function autoScheduleFocusTime(daysAhead: number = 5, userId?: string) {
  const userFilter = userId ? { userId } : {};

  // Remove existing auto-generated focus time blocks
  const now = new Date();
  const futureDate = addDays(now, daysAhead);

  await prisma.event.deleteMany({
    where: {
      ...userFilter,
      type: "focus_time",
      startTime: { gte: now, lte: futureDate },
      description: { contains: "[auto]" },
    },
  });

  const results: { date: string; blocks: number }[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(now, i);
    const gaps = await generateFocusBlocks(date, userId);

    for (const gap of gaps) {
      await prisma.event.create({
        data: {
          title: "Focus Time",
          description: "[auto] 자동 생성된 집중 시간 블록",
          startTime: gap.start,
          endTime: gap.end,
          type: "focus_time",
          color: "#10B981",
          userId,
        },
      });
    }

    results.push({
      date: date.toISOString().split("T")[0],
      blocks: gaps.length,
    });
  }

  return results;
}
