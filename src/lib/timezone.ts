const KST_TIMEZONE = "Asia/Seoul";

/**
 * 현재 날짜를 KST 기준 "YYYY-MM-DD" 문자열로 반환
 */
export function getTodayKST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: KST_TIMEZONE });
}

/**
 * 주어진 날짜를 KST 기준 "YYYY-MM-DD" 문자열로 변환
 */
export function toKSTDateString(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: KST_TIMEZONE });
}

/**
 * 주어진 날짜가 KST 기준 오늘 이전인지 확인 (오늘은 포함하지 않음)
 */
export function isDatePastKST(date: Date | string): boolean {
  return toKSTDateString(date) < getTodayKST();
}

/**
 * "YYYY-MM-DD" 형식의 날짜 문자열을 KST 자정 기준 Date 객체로 파싱
 */
export function parseDateAsKST(dateStr: string): Date {
  // "2026-03-04" → "2026-03-04T00:00:00+09:00"
  return new Date(dateStr + "T00:00:00+09:00");
}

/**
 * KST 기준 현재 시각의 Date 객체 반환
 * (브라우저/서버 타임존에 관계없이 KST 기준으로 동작)
 */
export function nowKST(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: KST_TIMEZONE })
  );
}
