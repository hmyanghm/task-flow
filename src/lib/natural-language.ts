import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface ParsedEvent {
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  allDay: boolean;
}

export async function parseNaturalLanguage(
  input: string
): Promise<ParsedEvent | null> {
  const now = new Date();
  // KST (UTC+9)
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstString = kstNow.toISOString().replace("Z", "+09:00");

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: `You are a calendar event parser. Extract event information from Korean or English natural language text.

Current datetime (KST): ${kstString}

Return ONLY a JSON object with these fields:
- title: string (event name only, remove conversational filler words like 있어/있어요/이야/에요/해요/할게/예정이야 and Korean particles like 이/가/은/는/을/를 attached to the title)
- startTime: string (ISO 8601 in KST, e.g. "2026-03-05T18:30:00+09:00")
- endTime: string (ISO 8601 in KST)
- location: string or null
- allDay: boolean (true only if no specific time is mentioned)

Rules:
- If only start time is given, set endTime to startTime + 1 hour
- If a time range is given (e.g. "6시부터 9시까지" or "6시~9시"), parse both times correctly
- 오전 = AM, 오후 = PM
- 오늘 = today, 내일 = tomorrow, 모레 = day after tomorrow
- If parsing fails, return {"error": "cannot parse"}

Return only the JSON object, no other text.`,
      messages: [{ role: "user", content: input }],
    });

    const text =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : null;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) return null;

    return {
      title: parsed.title,
      startTime: new Date(parsed.startTime),
      endTime: new Date(parsed.endTime),
      location: parsed.location || undefined,
      allDay: parsed.allDay || false,
    };
  } catch (error) {
    console.error("[parseNaturalLanguage] error:", error);
    return null;
  }
}

export async function parseImageEvent(
  imageBase64: string,
  mimeType: string
): Promise<ParsedEvent[]> {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstString = kstNow.toISOString().replace("Z", "+09:00");

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `You are a calendar event parser. Extract all event information from the image.

Current datetime (KST): ${kstString}

Return ONLY a JSON array of event objects. Each object:
- title: string (event name)
- startTime: string (ISO 8601 in KST, e.g. "2026-03-05T18:30:00+09:00")
- endTime: string (ISO 8601 in KST)
- location: string or null
- allDay: boolean (true only if no specific time is mentioned)

Rules:
- Extract ALL events visible in the image
- If only start time is given, set endTime to startTime + 1 hour
- If no date is specified, assume today or the nearest upcoming date
- Return [] if no events found

Return only the JSON array, no other text.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          { type: "text", text: "이미지에서 일정을 추출해주세요." },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : null;
  if (!text) return [];

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.map((e: { title: string; startTime: string; endTime: string; location?: string; allDay?: boolean }) => ({
    title: e.title,
    startTime: new Date(e.startTime),
    endTime: new Date(e.endTime),
    location: e.location || undefined,
    allDay: e.allDay || false,
  }));
}
