import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, setHours, setMinutes, startOfDay, isWeekend } from "date-fns";
import { getAuthUserId } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingLink = searchParams.get("link");

  // Public: lookup by booking link
  if (bookingLink) {
    const slot = await prisma.meetingSlot.findUnique({
      where: { bookingLink },
    });
    if (!slot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate available time slots
    const availableSlots = await generateAvailableSlots(slot.duration);
    return NextResponse.json({ ...slot, availableSlots });
  }

  // Auth required: list own slots
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const slots = await prisma.meetingSlot.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Auth required: create slot
  if (body.action === "create_slot") {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;

    const slot = await prisma.meetingSlot.create({
      data: {
        title: body.title,
        description: body.description,
        duration: body.duration || 30,
        slots: JSON.stringify(body.slots || []),
        isActive: true,
        userId,
      },
    });
    return NextResponse.json(slot, { status: 201 });
  }

  // Public: book a slot
  if (body.action === "book") {
    const slot = await prisma.meetingSlot.findUnique({
      where: { bookingLink: body.bookingLink },
    });
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(
      startTime.getTime() + slot.duration * 60 * 1000
    );

    // Check for conflicts
    const conflict = await prisma.event.findFirst({
      where: {
        OR: [
          { startTime: { gte: startTime, lt: endTime } },
          { endTime: { gt: startTime, lte: endTime } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "이 시간은 이미 예약되어 있습니다" },
        { status: 409 }
      );
    }

    const [booking] = await Promise.all([
      prisma.meetingBooking.create({
        data: {
          meetingSlotId: slot.id,
          bookerName: body.bookerName,
          bookerEmail: body.bookerEmail,
          startTime,
          endTime,
        },
      }),
      prisma.event.create({
        data: {
          title: `${slot.title} - ${body.bookerName}`,
          description: `예약자: ${body.bookerName} (${body.bookerEmail})`,
          startTime,
          endTime,
          type: "meeting",
          color: "#8B5CF6",
          userId: slot.userId,
        },
      }),
    ]);

    return NextResponse.json(booking, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function generateAvailableSlots(duration: number) {
  const slots: { date: string; times: { time: string; score: number }[] }[] = [];

  for (let i = 1; i <= 14; i++) {
    const date = addDays(new Date(), i);
    if (isWeekend(date)) continue;

    const dayStart = setMinutes(setHours(startOfDay(date), 9), 0);
    const dayEnd = setMinutes(setHours(startOfDay(date), 18), 0);

    const events = await prisma.event.findMany({
      where: {
        startTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startTime: "asc" },
    });

    const times: { time: string; score: number }[] = [];
    let current = new Date(dayStart);

    while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      const hasConflict = events.some(
        (e) =>
          new Date(e.startTime) < slotEnd && new Date(e.endTime) > current
      );

      if (!hasConflict) {
        const hour = current.getHours();
        let score = 50;
        if (hour === 10 || hour === 14) score = 100;
        else if (hour === 11 || hour === 15) score = 80;
        else if (hour === 9 || hour === 16) score = 60;

        times.push({
          time: current.toISOString(),
          score,
        });
      }

      current = new Date(current.getTime() + 30 * 60000);
    }

    if (times.length > 0) {
      slots.push({
        date: date.toISOString().split("T")[0],
        times: times.sort((a, b) => b.score - a.score),
      });
    }
  }

  return slots;
}
