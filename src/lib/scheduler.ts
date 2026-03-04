import * as cron from "node-cron";
import { prisma } from "./prisma";
import { sendTaskReminder, sendDailySummary, sendEventReminder } from "./slack";

type ScheduledTask = ReturnType<typeof cron.schedule>;
const activeJobs = new Map<string, ScheduledTask>();

export function startScheduler() {
  // Daily summary at 9 AM
  const dailySummary = cron.schedule("0 9 * * *", async () => {
    try {
      const tasks = await prisma.task.findMany({
        where: { status: { not: "done" } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      });
      await sendDailySummary(tasks);
    } catch (err) {
      console.error("Daily summary failed:", err);
    }
  });
  activeJobs.set("daily_summary", dailySummary);

  // Task due reminders - check every 30 minutes
  const taskReminder = cron.schedule("*/30 * * * *", async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const dueTasks = await prisma.task.findMany({
        where: {
          status: { not: "done" },
          dueDate: { lte: tomorrow, gte: now },
        },
      });

      for (const task of dueTasks) {
        await sendTaskReminder(task);
      }
    } catch (err) {
      console.error("Task reminder failed:", err);
    }
  });
  activeJobs.set("task_reminder", taskReminder);

  // Event reminders - check every minute
  const eventReminder = cron.schedule("* * * * *", async () => {
    try {
      const settings = await prisma.notificationSetting.findMany({
        where: { type: "before_event", isActive: true },
      });

      for (const setting of settings) {
        const now = new Date();
        const targetTime = new Date(
          now.getTime() + setting.minutesBefore * 60 * 1000
        );
        const windowStart = new Date(targetTime.getTime() - 30000);
        const windowEnd = new Date(targetTime.getTime() + 30000);

        const events = await prisma.event.findMany({
          where: {
            startTime: { gte: windowStart, lte: windowEnd },
            type: { not: "focus_time" },
          },
        });

        for (const event of events) {
          await sendEventReminder(
            event,
            setting.minutesBefore,
            setting.slackChannel || undefined
          );
        }
      }
    } catch (err) {
      console.error("Event reminder failed:", err);
    }
  });
  activeJobs.set("event_reminder", eventReminder);

  // Load custom schedules from DB
  loadCustomSchedules();

  console.log("Scheduler started with default jobs");
}

async function loadCustomSchedules() {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { isActive: true },
    });

    for (const schedule of schedules) {
      if (!cron.validate(schedule.cronExpr)) continue;

      const job = cron.schedule(schedule.cronExpr, async () => {
        if (schedule.type === "slack_notify" && schedule.slackChannel) {
          const { sendSlackMessage } = await import("./slack");
          await sendSlackMessage(
            schedule.slackChannel,
            schedule.message || schedule.name
          );
        } else if (schedule.type === "doc_generate") {
          const { generateDocument } = await import("./documents");
          await generateDocument("daily_summary");
        }
      });

      activeJobs.set(schedule.id, job);
    }
  } catch (err) {
    console.error("Failed to load custom schedules:", err);
  }
}

export function addScheduleJob(id: string, cronExpr: string, callback: () => void) {
  if (!cron.validate(cronExpr)) return false;
  const job = cron.schedule(cronExpr, callback);
  activeJobs.set(id, job);
  return true;
}

export function removeScheduleJob(id: string) {
  const job = activeJobs.get(id);
  if (job) {
    job.stop();
    activeJobs.delete(id);
    return true;
  }
  return false;
}

export function stopScheduler() {
  for (const [id, job] of activeJobs) {
    job.stop();
    activeJobs.delete(id);
  }
}
