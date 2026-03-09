import { prisma } from "./prisma";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { ko } from "date-fns/locale";

export async function generateDocument(
  sourceType: string,
  dateRange?: { start: Date; end: Date },
  userId?: string
) {
  const now = new Date();
  let start: Date;
  let end: Date;
  let title: string;

  switch (sourceType) {
    case "daily_summary":
      start = startOfDay(now);
      end = endOfDay(now);
      title = `일일 요약 - ${format(now, "yyyy년 MM월 dd일", { locale: ko })}`;
      break;
    case "weekly_report":
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      title = `주간 리포트 - ${format(start, "MM/dd")} ~ ${format(end, "MM/dd")}`;
      break;
    case "category_report":
      start = dateRange?.start || startOfWeek(now, { weekStartsOn: 1 });
      end = dateRange?.end || endOfWeek(now, { weekStartsOn: 1 });
      title = `카테고리별 리포트 - ${format(start, "MM/dd")} ~ ${format(end, "MM/dd")}`;
      break;
    default:
      start = startOfDay(now);
      end = endOfDay(now);
      title = `요약 - ${format(now, "yyyy년 MM월 dd일", { locale: ko })}`;
  }

  const userFilter = userId ? { userId } : {};

  const [tasks, memos, events] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...userFilter,
        OR: [
          { createdAt: { gte: start, lte: end } },
          { updatedAt: { gte: start, lte: end } },
        ],
      },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.memo.findMany({
      where: { ...userFilter, createdAt: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({
      where: { ...userFilter, startTime: { gte: start, lte: end } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  let content = `# ${title}\n\n`;
  content += `> 생성일시: ${format(now, "yyyy-MM-dd HH:mm", { locale: ko })}\n\n`;

  // Tasks section
  content += `## 할 일 현황\n\n`;
  const statusGroups = {
    done: tasks.filter((t) => t.status === "done"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    todo: tasks.filter((t) => t.status === "todo"),
  };

  content += `| 상태 | 개수 |\n|------|------|\n`;
  content += `| ✅ 완료 | ${statusGroups.done.length} |\n`;
  content += `| 🔄 진행중 | ${statusGroups.in_progress.length} |\n`;
  content += `| 📋 대기 | ${statusGroups.todo.length} |\n\n`;

  if (statusGroups.in_progress.length > 0) {
    content += `### 진행중인 할 일\n\n`;
    for (const task of statusGroups.in_progress) {
      const due = task.dueDate
        ? format(task.dueDate, "MM/dd")
        : "";
      content += `- **${task.title}** [${task.category.name}]${due ? ` (마감: ${due})` : ""}\n`;
    }
    content += `\n`;
  }

  if (statusGroups.done.length > 0) {
    content += `### 완료된 할 일\n\n`;
    for (const task of statusGroups.done) {
      content += `- ~~${task.title}~~ [${task.category.name}]\n`;
    }
    content += `\n`;
  }

  // Events section
  if (events.length > 0) {
    content += `## 일정\n\n`;
    for (const event of events) {
      const timeStr = event.allDay
        ? "종일"
        : `${format(event.startTime, "HH:mm")} - ${format(event.endTime, "HH:mm")}`;
      const typeEmoji =
        { event: "📅", focus_time: "🎯", meeting: "👥", reminder: "⏰" }[
          event.type
        ] || "📅";
      content += `- ${typeEmoji} **${event.title}** (${timeStr})${event.location ? ` @ ${event.location}` : ""}\n`;
    }
    content += `\n`;
  }

  // Memos section
  if (memos.length > 0) {
    content += `## 메모\n\n`;
    for (const memo of memos) {
      content += `### ${memo.title} [${memo.category.name}]\n\n`;
      content += `${memo.content.substring(0, 200)}${memo.content.length > 200 ? "..." : ""}\n\n`;
    }
  }

  // Category breakdown
  if (sourceType === "category_report" || sourceType === "weekly_report") {
    const categories = await prisma.category.findMany({
      where: userFilter,
      include: {
        tasks: {
          where: { updatedAt: { gte: start, lte: end } },
        },
        memos: {
          where: { createdAt: { gte: start, lte: end } },
        },
      },
    });

    content += `## 카테고리별 활동\n\n`;
    for (const cat of categories) {
      if (cat.tasks.length === 0 && cat.memos.length === 0) continue;
      content += `### ${cat.name}\n`;
      content += `- 할 일: ${cat.tasks.length}건 (완료: ${cat.tasks.filter((t) => t.status === "done").length}건)\n`;
      content += `- 메모: ${cat.memos.length}건\n\n`;
    }
  }

  const doc = await prisma.document.create({
    data: { title, content, sourceType, userId },
  });

  return doc;
}
