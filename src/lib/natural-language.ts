import {
  parse,
  addDays,
  addWeeks,
  setHours,
  setMinutes,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
} from "date-fns";

interface ParsedEvent {
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  allDay: boolean;
}

const DAY_MAP: Record<string, (date: Date) => Date> = {
  월요일: nextMonday,
  화요일: nextTuesday,
  수요일: nextWednesday,
  목요일: nextThursday,
  금요일: nextFriday,
  토요일: nextSaturday,
  일요일: nextSunday,
};

export function parseNaturalLanguage(input: string): ParsedEvent | null {
  try {
    let text = input.trim();
    let startTime = new Date();
    let endTime = new Date();
    let location: string | undefined;
    let allDay = false;
    let title = text;
    let foundDate = false;
    let foundTime = false;

    // Extract location (after @ or 장소:)
    const locationMatch = text.match(/(?:@|장소[:\s])\s*(.+?)(?:\s*$|\s+(?:오전|오후|\d))/);
    if (locationMatch) {
      location = locationMatch[1].trim();
      text = text.replace(locationMatch[0], " ").trim();
    }

    // "다음주 X요일" pattern
    const nextWeekDayMatch = text.match(/다음\s*주\s*(월|화|수|목|금|토|일)요일/);
    if (nextWeekDayMatch) {
      const dayFn = DAY_MAP[nextWeekDayMatch[1] + "요일"];
      if (dayFn) {
        const nextWeekDay = dayFn(new Date());
        startTime = addWeeks(nextWeekDay, 0);
        // If the "next" day is within this week, push to next week
        const today = new Date();
        if (startTime <= addDays(today, 7)) {
          startTime = addDays(startTime, 7);
        }
        foundDate = true;
        text = text.replace(nextWeekDayMatch[0], "").trim();
      }
    }

    // "이번주 X요일" pattern
    if (!foundDate) {
      const thisWeekDayMatch = text.match(/이번\s*주?\s*(월|화|수|목|금|토|일)요일/);
      if (thisWeekDayMatch) {
        const dayFn = DAY_MAP[thisWeekDayMatch[1] + "요일"];
        if (dayFn) {
          startTime = dayFn(new Date());
          foundDate = true;
          text = text.replace(thisWeekDayMatch[0], "").trim();
        }
      }
    }

    // "X요일" pattern (next occurrence)
    if (!foundDate) {
      const dayMatch = text.match(/(월|화|수|목|금|토|일)요일/);
      if (dayMatch) {
        const dayFn = DAY_MAP[dayMatch[1] + "요일"];
        if (dayFn) {
          startTime = dayFn(new Date());
          foundDate = true;
          text = text.replace(dayMatch[0], "").trim();
        }
      }
    }

    // "내일" pattern
    if (!foundDate && text.includes("내일")) {
      startTime = addDays(new Date(), 1);
      foundDate = true;
      text = text.replace("내일", "").trim();
    }

    // "모레" pattern
    if (!foundDate && text.includes("모레")) {
      startTime = addDays(new Date(), 2);
      foundDate = true;
      text = text.replace("모레", "").trim();
    }

    // "오늘" pattern
    if (!foundDate && text.includes("오늘")) {
      startTime = new Date();
      foundDate = true;
      text = text.replace("오늘", "").trim();
    }

    // Date pattern: MM월 DD일 or MM/DD
    if (!foundDate) {
      const dateMatch = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1;
        const day = parseInt(dateMatch[2]);
        startTime = new Date(startTime.getFullYear(), month, day);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (startTime < now) {
          startTime.setFullYear(startTime.getFullYear() + 1);
        }
        foundDate = true;
        text = text.replace(dateMatch[0], "").trim();
      }
    }

    // Time pattern: 오후 2시 30분, 오전 10시, 14:00, 2시
    const timeMatch = text.match(/(오전|오후)?\s*(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[2]);
      const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0;

      if (timeMatch[1] === "오후" && hour < 12) hour += 12;
      if (timeMatch[1] === "오전" && hour === 12) hour = 0;
      if (!timeMatch[1] && hour < 7) hour += 12; // Assume PM for small hours

      startTime = setHours(setMinutes(startTime, minute), hour);
      foundTime = true;
      text = text.replace(timeMatch[0], "").trim();
    }

    // 24h time pattern: 14:00, 09:30
    if (!foundTime) {
      const time24Match = text.match(/(\d{1,2}):(\d{2})/);
      if (time24Match) {
        const hour = parseInt(time24Match[1]);
        const minute = parseInt(time24Match[2]);
        startTime = setHours(setMinutes(startTime, minute), hour);
        foundTime = true;
        text = text.replace(time24Match[0], "").trim();
      }
    }

    if (!foundTime) {
      allDay = true;
      startTime = setHours(setMinutes(startTime, 0), 0);
    }

    // Duration pattern
    const durationMatch = text.match(/(\d+)\s*시간/);
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
      text = text.replace(durationMatch[0], "").trim();
    } else {
      endTime = allDay
        ? setHours(setMinutes(startTime, 59), 23)
        : new Date(startTime.getTime() + 60 * 60 * 1000); // default 1 hour
    }

    // Clean up title
    title = text
      .replace(/\s+/g, " ")
      .replace(/^[\s,]+|[\s,]+$/g, "")
      .trim();

    if (!title || !foundDate) return null;

    return { title, startTime, endTime, location, allDay };
  } catch {
    return null;
  }
}
