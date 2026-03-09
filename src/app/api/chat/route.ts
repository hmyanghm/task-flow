import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth-guard";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "get_events",
    description: "특정 기간의 일정을 조회합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: { type: "string", description: "조회 시작일 (ISO 8601, KST)" },
        endDate: { type: "string", description: "조회 종료일 (ISO 8601, KST)" },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "check_conflicts",
    description: "특정 시간에 겹치는 일정이 있는지 확인합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        startTime: { type: "string", description: "시작 시간 (ISO 8601, KST)" },
        endTime: { type: "string", description: "종료 시간 (ISO 8601, KST)" },
      },
      required: ["startTime", "endTime"],
    },
  },
  {
    name: "create_event",
    description: "새 일정을 캘린더에 등록합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "일정 제목" },
        startTime: { type: "string", description: "시작 시간 (ISO 8601, KST)" },
        endTime: { type: "string", description: "종료 시간 (ISO 8601, KST)" },
        location: { type: "string", description: "장소 (선택)" },
        allDay: { type: "boolean", description: "종일 일정 여부" },
      },
      required: ["title", "startTime", "endTime"],
    },
  },
  {
    name: "get_tasks",
    description: "할 일 목록을 조회합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["all", "todo", "in_progress", "done"],
          description: "필터링할 상태",
        },
      },
      required: [],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>, userId: string) {
  if (name === "get_events") {
    const events = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: new Date(input.startDate as string) },
        endTime: { lte: new Date(input.endDate as string) },
      },
      include: { category: true },
      orderBy: { startTime: "asc" },
    });
    return JSON.stringify(events);
  }

  if (name === "check_conflicts") {
    const conflicts = await prisma.event.findMany({
      where: {
        userId,
        OR: [
          {
            startTime: { lt: new Date(input.endTime as string) },
            endTime: { gt: new Date(input.startTime as string) },
          },
        ],
      },
      orderBy: { startTime: "asc" },
    });
    return JSON.stringify({ hasConflicts: conflicts.length > 0, conflicts });
  }

  if (name === "create_event") {
    const event = await prisma.event.create({
      data: {
        title: input.title as string,
        startTime: new Date(input.startTime as string),
        endTime: new Date(input.endTime as string),
        location: input.location as string | undefined,
        allDay: (input.allDay as boolean) || false,
        type: "event",
        userId,
      },
    });
    return JSON.stringify(event);
  }

  if (name === "get_tasks") {
    const where: Record<string, unknown> = { userId };
    if (input.status && input.status !== "all") {
      where.status = input.status as string;
    }
    const tasks = await prisma.task.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return JSON.stringify(tasks);
  }

  return JSON.stringify({ error: "Unknown tool" });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { messages } = await req.json();

  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const kstString = kstNow.toISOString().replace("Z", "+09:00");

  const systemPrompt = `당신은 개인 비서 AI입니다. 사용자의 일정과 할 일을 관리해드립니다.

현재 시각 (KST): ${kstString}

역할:
- 일정 등록 요청 시 먼저 check_conflicts로 겹치는 일정 확인
- 겹치면 어떤 일정과 겹치는지 알려주고 그래도 등록할지 물어봄
- 겹치지 않으면 create_event로 등록하고 확인 메시지
- 일정/할 일 조회 요청 시 get_events 또는 get_tasks 사용
- 자연스러운 한국어로 대화
- 간결하고 친근하게 답변`;

  const anthropicMessages: Anthropic.MessageParam[] = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })
  );

  // Tool use loop
  let currentMessages = [...anthropicMessages];

  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return NextResponse.json({ reply: text?.text ?? "" });
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

      currentMessages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          if (block.type !== "tool_use") return null!;
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            userId
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: result,
          };
        })
      );

      currentMessages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  return NextResponse.json({ reply: "응답을 생성할 수 없습니다." });
}
