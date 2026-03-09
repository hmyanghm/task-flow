import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackMessage, resetSlackClient } from "@/lib/slack";
import { getAuthUserId } from "@/lib/auth-guard";

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const config = await prisma.slackConfig.findFirst({
    where: { userId },
  });
  if (!config) {
    return NextResponse.json({
      configured: false,
      hasEnvToken: !!process.env.SLACK_BOT_TOKEN,
    });
  }
  return NextResponse.json({
    configured: true,
    defaultChannel: config.defaultChannel,
    isActive: config.isActive,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();

  if (body.action === "test") {
    const result = await sendSlackMessage(
      body.channel || process.env.SLACK_DEFAULT_CHANNEL || "#general",
      "🧪 TaskFlow 테스트 메시지입니다! 연결이 성공적으로 완료되었습니다."
    );
    return NextResponse.json({ success: !!result });
  }

  if (body.action === "configure") {
    const existing = await prisma.slackConfig.findFirst({
      where: { userId },
    });
    if (existing) {
      await prisma.slackConfig.update({
        where: { id: existing.id },
        data: {
          botToken: body.botToken,
          defaultChannel: body.defaultChannel,
          isActive: body.isActive ?? true,
        },
      });
    } else {
      await prisma.slackConfig.create({
        data: {
          botToken: body.botToken,
          defaultChannel: body.defaultChannel,
          isActive: true,
          userId,
        },
      });
    }
    resetSlackClient();
    return NextResponse.json({ success: true });
  }

  if (body.action === "send") {
    const result = await sendSlackMessage(body.channel, body.message);
    return NextResponse.json({ success: !!result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
