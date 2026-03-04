"use client";

import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Hash,
  MessageSquare,
  Power,
  PowerOff,
  Timer,
  CalendarClock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Schedule } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CRON_PRESETS = [
  { label: "매일 오전 9시", value: "0 9 * * *" },
  { label: "매일 오후 6시", value: "0 18 * * *" },
  { label: "매주 월요일 오전 9시", value: "0 9 * * 1" },
  { label: "매주 금요일 오후 5시", value: "0 17 * * 5" },
  { label: "평일 오전 9시", value: "0 9 * * 1-5" },
  { label: "매시간", value: "0 * * * *" },
  { label: "30분마다", value: "*/30 * * * *" },
  { label: "매월 1일 오전 9시", value: "0 9 1 * *" },
  { label: "직접 입력", value: "custom" },
];

const TYPE_CONFIG: Record<
  string,
  { label: string; badge: "default" | "secondary" | "outline"; description: string }
> = {
  slack_notify: {
    label: "Slack 알림",
    badge: "default",
    description: "지정된 Slack 채널에 메시지를 전송합니다.",
  },
  doc_generate: {
    label: "문서 생성",
    badge: "secondary",
    description: "설정된 템플릿으로 문서를 자동 생성합니다.",
  },
  reminder: {
    label: "리마인더",
    badge: "outline",
    description: "설정된 시간에 리마인더를 전송합니다.",
  },
};

function describeCron(expr: string): string {
  const parts = expr.split(" ");
  if (parts.length !== 5) return expr;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const dayNames: Record<string, string> = {
    "0": "일요일",
    "1": "월요일",
    "2": "화요일",
    "3": "수요일",
    "4": "목요일",
    "5": "금요일",
    "6": "토요일",
    "7": "일요일",
    "1-5": "평일",
  };

  if (minute.startsWith("*/")) {
    return `${minute.slice(2)}분마다`;
  }
  if (hour === "*" && minute === "0") {
    return "매시간";
  }

  const timeStr =
    hour !== "*" && minute !== "*"
      ? `${parseInt(hour) < 12 ? "오전" : "오후"} ${
          parseInt(hour) > 12 ? parseInt(hour) - 12 : hour
        }시 ${minute !== "0" ? `${minute}분` : ""}`
      : "";

  if (dayOfMonth !== "*" && month === "*") {
    return `매월 ${dayOfMonth}일 ${timeStr}`.trim();
  }
  if (dayOfWeek !== "*") {
    const dayLabel = dayNames[dayOfWeek] || `(${dayOfWeek})`;
    return `매주 ${dayLabel} ${timeStr}`.trim();
  }
  if (
    dayOfMonth === "*" &&
    month === "*" &&
    dayOfWeek === "*" &&
    hour !== "*"
  ) {
    return `매일 ${timeStr}`.trim();
  }

  return expr;
}

function getNextRun(cronExpr: string): string {
  try {
    const parts = cronExpr.split(" ");
    if (parts.length !== 5) return "알 수 없음";

    const [minute, hour, dayOfMonth, , dayOfWeek] = parts;
    const now = new Date();
    const next = new Date(now);

    if (minute.startsWith("*/")) {
      const interval = parseInt(minute.slice(2));
      const currentMinute = now.getMinutes();
      const nextMinute =
        Math.ceil((currentMinute + 1) / interval) * interval;
      if (nextMinute >= 60) {
        next.setHours(next.getHours() + 1);
        next.setMinutes(nextMinute - 60);
      } else {
        next.setMinutes(nextMinute);
      }
      next.setSeconds(0);
      return formatNextRun(next);
    }

    if (hour !== "*" && minute !== "*") {
      next.setHours(parseInt(hour));
      next.setMinutes(parseInt(minute));
      next.setSeconds(0);

      if (dayOfWeek !== "*") {
        const targetDays = dayOfWeek.includes("-")
          ? expandRange(dayOfWeek)
          : [parseInt(dayOfWeek)];
        let currentDay = now.getDay();
        let daysToAdd = 0;
        for (let i = 0; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (targetDays.includes(checkDay)) {
            if (i === 0 && next <= now) continue;
            daysToAdd = i;
            break;
          }
        }
        next.setDate(now.getDate() + daysToAdd);
      } else if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      return formatNextRun(next);
    }

    if (hour === "*" && minute === "0") {
      next.setMinutes(0);
      next.setSeconds(0);
      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }
      return formatNextRun(next);
    }

    return "계산 중...";
  } catch {
    return "알 수 없음";
  }
}

function expandRange(range: string): number[] {
  const [start, end] = range.split("-").map(Number);
  const result: number[] = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
}

function formatNextRun(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const diffMinutes = Math.floor(diff / 60000);
  const diffHours = Math.floor(diff / 3600000);

  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

  if (diffMinutes < 1) return "곧 실행";
  if (diffMinutes < 60) return `${diffMinutes}분 후 (${timeStr})`;
  if (diffHours < 24) return `${diffHours}시간 후 (${timeStr})`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day} ${timeStr}`;
}

export default function SchedulerPage() {
  const { data: schedules = [], isLoading } = useSWR<Schedule[]>(
    "/api/scheduler",
    fetcher
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("slack_notify");
  const [formCronPreset, setFormCronPreset] = useState("0 9 * * *");
  const [formCronCustom, setFormCronCustom] = useState("");
  const [formSlackChannel, setFormSlackChannel] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const activeSchedules = schedules.filter((s) => s.isActive);
  const inactiveSchedules = schedules.filter((s) => !s.isActive);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormType("slack_notify");
    setFormCronPreset("0 9 * * *");
    setFormCronCustom("");
    setFormSlackChannel("");
    setFormMessage("");
    setFormIsActive(true);
    setEditingSchedule(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormName(schedule.name);
    setFormType(schedule.type);
    setFormSlackChannel(schedule.slackChannel || "");
    setFormMessage(schedule.message || "");
    setFormIsActive(schedule.isActive);

    const matchingPreset = CRON_PRESETS.find(
      (p) => p.value === schedule.cronExpr
    );
    if (matchingPreset) {
      setFormCronPreset(schedule.cronExpr);
      setFormCronCustom("");
    } else {
      setFormCronPreset("custom");
      setFormCronCustom(schedule.cronExpr);
    }

    setDialogOpen(true);
  }, []);

  const getCronValue = useCallback((): string => {
    if (formCronPreset === "custom") return formCronCustom;
    return formCronPreset;
  }, [formCronPreset, formCronCustom]);

  const handleSubmit = useCallback(async () => {
    const cronExpr = getCronValue();
    if (!formName || !cronExpr) {
      alert("이름과 Cron 표현식은 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...(editingSchedule ? { id: editingSchedule.id } : {}),
        name: formName,
        type: formType,
        cronExpr,
        slackChannel: formType === "slack_notify" ? formSlackChannel : undefined,
        message: formMessage || undefined,
        isActive: formIsActive,
      };

      const res = await fetch("/api/scheduler", {
        method: editingSchedule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert("스케줄 저장에 실패했습니다.");
        return;
      }

      setDialogOpen(false);
      resetForm();
      mutate("/api/scheduler");
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [
    editingSchedule,
    formName,
    formType,
    formSlackChannel,
    formMessage,
    formIsActive,
    getCronValue,
    resetForm,
  ]);

  const handleToggleActive = useCallback(
    async (schedule: Schedule) => {
      try {
        await fetch("/api/scheduler", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: schedule.id,
            isActive: !schedule.isActive,
          }),
        });
        mutate("/api/scheduler");
      } catch {
        alert("상태 변경에 실패했습니다.");
      }
    },
    []
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/scheduler?id=${id}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      mutate("/api/scheduler");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }, []);

  const renderScheduleCard = (schedule: Schedule) => {
    const typeConfig = TYPE_CONFIG[schedule.type] || {
      label: schedule.type,
      badge: "outline" as const,
      description: "",
    };
    const nextRun = schedule.isActive
      ? getNextRun(schedule.cronExpr)
      : "비활성 상태";

    return (
      <Card
        key={schedule.id}
        className={`transition-opacity ${
          !schedule.isActive ? "opacity-60" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{schedule.name}</h3>
                <Badge variant={typeConfig.badge}>{typeConfig.label}</Badge>
                {schedule.isActive ? (
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                  >
                    활성
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    비활성
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{describeCron(schedule.cronExpr)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" />
                  <span>다음 실행: {nextRun}</span>
                </div>
              </div>

              {schedule.slackChannel && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span>{schedule.slackChannel}</span>
                </div>
              )}

              {schedule.message && (
                <div className="flex items-start gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{schedule.message}</span>
                </div>
              )}

              <div className="text-xs font-mono text-muted-foreground/70">
                cron: {schedule.cronExpr}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleToggleActive(schedule)}
                title={schedule.isActive ? "비활성화" : "활성화"}
              >
                {schedule.isActive ? (
                  <Power className="h-4 w-4 text-green-600" />
                ) : (
                  <PowerOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openEditDialog(schedule)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteConfirmId(schedule.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">스케줄러</h1>
          <Badge variant="secondary" className="ml-1">
            {schedules.length}개
          </Badge>
        </div>
        <Button size="sm" className="gap-1" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          새 스케줄
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{schedules.length}</p>
              <p className="text-xs text-muted-foreground">전체 스케줄</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-950">
              <Power className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSchedules.length}</p>
              <p className="text-xs text-muted-foreground">활성 스케줄</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-muted p-2">
              <PowerOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inactiveSchedules.length}</p>
              <p className="text-xs text-muted-foreground">비활성 스케줄</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule List */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            활성
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
              {activeSchedules.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-1.5">
            비활성
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
              {inactiveSchedules.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            전체
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
              {schedules.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 pt-2">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">로딩 중...</p>
              </CardContent>
            </Card>
          ) : activeSchedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 p-8">
                <Power className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  활성화된 스케줄이 없습니다.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreateDialog}
                  className="mt-2"
                >
                  스케줄 만들기
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeSchedules.map(renderScheduleCard)
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-3 pt-2">
          {inactiveSchedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 p-8">
                <PowerOff className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  비활성화된 스케줄이 없습니다.
                </p>
              </CardContent>
            </Card>
          ) : (
            inactiveSchedules.map(renderScheduleCard)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 pt-2">
          {schedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 p-8">
                <CalendarClock className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  스케줄이 없습니다. 새 스케줄을 만들어보세요.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreateDialog}
                  className="mt-2"
                >
                  스케줄 만들기
                </Button>
              </CardContent>
            </Card>
          ) : (
            schedules.map(renderScheduleCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "스케줄 수정" : "새 스케줄 만들기"}
            </DialogTitle>
            <DialogDescription>
              {editingSchedule
                ? "스케줄 설정을 수정합니다."
                : "자동으로 실행할 스케줄을 설정하세요."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="schedule-name">이름</Label>
              <Input
                id="schedule-name"
                placeholder="스케줄 이름"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>유형</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack_notify">Slack 알림</SelectItem>
                  <SelectItem value="doc_generate">문서 생성</SelectItem>
                  <SelectItem value="reminder">리마인더</SelectItem>
                </SelectContent>
              </Select>
              {TYPE_CONFIG[formType] && (
                <p className="text-xs text-muted-foreground">
                  {TYPE_CONFIG[formType].description}
                </p>
              )}
            </div>

            {/* Cron Expression */}
            <div className="space-y-2">
              <Label>실행 주기</Label>
              <Select value={formCronPreset} onValueChange={setFormCronPreset}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {formCronPreset === "custom" && (
                <div className="space-y-1.5">
                  <Input
                    placeholder="Cron 표현식 (예: 0 9 * * 1-5)"
                    value={formCronCustom}
                    onChange={(e) => setFormCronCustom(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    형식: 분 시 일 월 요일 (예: 0 9 * * 1-5 = 평일 오전 9시)
                  </p>
                </div>
              )}

              {getCronValue() && formCronPreset !== "custom" && (
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {getCronValue()}
                  </span>
                </div>
              )}
            </div>

            {/* Slack Channel (for slack_notify type) */}
            {formType === "slack_notify" && (
              <div className="space-y-2">
                <Label htmlFor="slack-channel">Slack 채널</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#</span>
                  <Input
                    id="slack-channel"
                    placeholder="채널명 (예: general)"
                    value={formSlackChannel}
                    onChange={(e) => setFormSlackChannel(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="schedule-message">메시지</Label>
              <Textarea
                id="schedule-message"
                placeholder={
                  formType === "slack_notify"
                    ? "Slack에 전송할 메시지"
                    : formType === "reminder"
                    ? "리마인더 메시지"
                    : "문서 생성 시 포함할 내용"
                }
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="schedule-active" className="cursor-pointer">
                  활성 상태
                </Label>
                <p className="text-xs text-muted-foreground">
                  비활성화하면 스케줄이 실행되지 않습니다.
                </p>
              </div>
              <Switch
                id="schedule-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formName || !getCronValue()}
            >
              {submitting
                ? "저장 중..."
                : editingSchedule
                ? "수정"
                : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>스케줄 삭제</DialogTitle>
            <DialogDescription>
              이 스케줄을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
