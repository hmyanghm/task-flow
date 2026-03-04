import { WebClient } from "@slack/web-api";
import { prisma } from "./prisma";

let slackClient: WebClient | null = null;

async function getSlackClient(): Promise<WebClient | null> {
  if (slackClient) return slackClient;

  const config = await prisma.slackConfig.findFirst({
    where: { isActive: true },
  });

  if (!config) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token || token.startsWith("xoxb-your")) return null;
    slackClient = new WebClient(token);
    return slackClient;
  }

  slackClient = new WebClient(config.botToken);
  return slackClient;
}

export async function sendSlackMessage(
  channel: string,
  text: string,
  blocks?: unknown[]
) {
  const client = await getSlackClient();
  if (!client) {
    console.warn("Slack not configured. Message:", text);
    return null;
  }

  try {
    const result = await client.chat.postMessage({
      channel,
      text,
      blocks: blocks as never[],
    });
    return result;
  } catch (error) {
    console.error("Slack message failed:", error);
    return null;
  }
}

export async function sendTaskReminder(
  task: { title: string; dueDate: Date | null; priority: string },
  channel?: string
) {
  const targetChannel =
    channel || process.env.SLACK_DEFAULT_CHANNEL || "#general";
  const dueStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("ko-KR")
    : "미정";
  const priorityEmoji =
    {
      urgent: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢",
    }[task.priority] || "⚪";

  return sendSlackMessage(targetChannel, `${priorityEmoji} *${task.title}*`, [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${priorityEmoji} *할 일 리마인더*\n*${task.title}*\n마감일: ${dueStr} | 우선순위: ${task.priority}`,
      },
    },
  ]);
}

export async function sendDailySummary(
  tasks: { title: string; status: string; priority: string }[],
  channel?: string
) {
  const targetChannel =
    channel || process.env.SLACK_DEFAULT_CHANNEL || "#general";
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress"
  ).length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const taskList = tasks
    .filter((t) => t.status !== "done")
    .slice(0, 10)
    .map((t) => {
      const emoji =
        t.status === "in_progress" ? "🔄" : t.priority === "urgent" ? "🔴" : "📋";
      return `${emoji} ${t.title}`;
    })
    .join("\n");

  return sendSlackMessage(
    targetChannel,
    `📊 오늘의 할 일 요약: ${todoCount}개 대기, ${inProgressCount}개 진행중, ${doneCount}개 완료`,
    [
      {
        type: "header",
        text: { type: "plain_text", text: "📊 오늘의 할 일 요약" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*대기:* ${todoCount}개 | *진행중:* ${inProgressCount}개 | *완료:* ${doneCount}개`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: taskList || "모든 할 일을 완료했습니다! 🎉",
        },
      },
    ]
  );
}

export async function sendEventReminder(
  event: { title: string; startTime: Date; location?: string | null },
  minutesBefore: number,
  channel?: string
) {
  const targetChannel =
    channel || process.env.SLACK_DEFAULT_CHANNEL || "#general";
  const timeStr = new Date(event.startTime).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return sendSlackMessage(
    targetChannel,
    `⏰ ${minutesBefore}분 후 일정: ${event.title}`,
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⏰ *${minutesBefore}분 후 일정이 있습니다*\n\n*${event.title}*\n시간: ${timeStr}${event.location ? `\n장소: ${event.location}` : ""}`,
        },
      },
    ]
  );
}

export function resetSlackClient() {
  slackClient = null;
}
