import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getAuthUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "인증이 필요합니다" },
      { status: 401 }
    );
  }
  return session.user.id;
}
