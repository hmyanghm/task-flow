"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Settings,
  Tag,
  MessageSquare,
  Bell,
  Clock,
  Info,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Check,
  Zap,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Category } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ICON_OPTIONS = [
  "work", "personal", "health", "finance", "study",
  "travel", "food", "music", "sports", "code",
];

const COLOR_PRESETS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

// ============================================================
// Categories Tab
// ============================================================
function CategoriesTab() {
  const { data: categories, isLoading } = useSWR<Category[]>(
    "/api/categories",
    fetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const openCreate = () => {
    setEditingCategory(null);
    setName("");
    setColor("#3B82F6");
    setIcon("");
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await fetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCategory.id,
            name,
            color,
            icon: icon || null,
          }),
        });
      } else {
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color, icon: icon || null }),
        });
      }
      mutate("/api/categories");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      mutate("/api/categories");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">카테고리 관리</h3>
          <p className="text-sm text-muted-foreground">
            할 일, 메모, 일정을 분류할 카테고리를 관리합니다
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !categories || categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Tag className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              카테고리가 없습니다
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon ? cat.icon.slice(0, 2).toUpperCase() : cat.name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cat._count && (
                        <span className="text-[11px] text-muted-foreground">
                          할 일 {cat._count.tasks} / 메모 {cat._count.memos} / 일정{" "}
                          {cat._count.events}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(cat.id)}
                    disabled={deleting === cat.id}
                  >
                    {deleting === cat.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "카테고리 수정" : "새 카테고리"}
            </DialogTitle>
            <DialogDescription>
              카테고리의 이름, 색상, 아이콘을 설정하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input
                placeholder="카테고리 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    className={`h-8 w-8 rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs text-muted-foreground shrink-0">
                  직접 입력
                </Label>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-14 p-1 cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-28 font-mono text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>아이콘 (선택)</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((ic) => (
                  <Button
                    key={ic}
                    size="sm"
                    variant={icon === ic ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setIcon(icon === ic ? "" : ic)}
                  >
                    {ic}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: color }}
              >
                {icon ? icon.slice(0, 2).toUpperCase() : name.slice(0, 1) || "?"}
              </div>
              <div>
                <p className="text-sm font-medium">{name || "미리보기"}</p>
                <p className="text-xs text-muted-foreground">{color}</p>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!name.trim() || saving}
            >
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editingCategory ? "수정" : "추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Slack Tab
// ============================================================
function SlackTab() {
  const { data: slackConfig, isLoading } = useSWR("/api/slack", fetcher);
  const [botToken, setBotToken] = useState("");
  const [defaultChannel, setDefaultChannel] = useState("#general");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [configuring, setConfiguring] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          channel: defaultChannel || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data.success);
    } catch {
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  const handleConfigure = async () => {
    setConfiguring(true);
    try {
      await fetch("/api/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure",
          botToken,
          defaultChannel,
        }),
      });
      mutate("/api/slack");
    } finally {
      setConfiguring(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Slack 연동</h3>
        <p className="text-sm text-muted-foreground">
          Slack 봇을 연결하여 알림을 받으세요
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">연결 상태</span>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : slackConfig?.configured ? (
              <Badge variant="default" className="bg-green-600">
                연결됨
              </Badge>
            ) : (
              <Badge variant="secondary">미연결</Badge>
            )}
          </div>
          {slackConfig?.configured && slackConfig.defaultChannel && (
            <p className="mt-2 text-xs text-muted-foreground">
              기본 채널: {slackConfig.defaultChannel}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">봇 설정</CardTitle>
          <CardDescription>
            Slack Bot Token과 기본 채널을 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <Input
              type="password"
              placeholder="xoxb-..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>기본 채널</Label>
            <Input
              placeholder="#general"
              value={defaultChannel}
              onChange={(e) => setDefaultChannel(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : testResult === true ? (
                <Check className="mr-1.5 h-4 w-4 text-green-500" />
              ) : testResult === false ? (
                <X className="mr-1.5 h-4 w-4 text-red-500" />
              ) : (
                <Zap className="mr-1.5 h-4 w-4" />
              )}
              연결 테스트
            </Button>
            <Button
              size="sm"
              onClick={handleConfigure}
              disabled={!botToken.trim() || configuring}
            >
              {configuring && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              저장
            </Button>
          </div>
          {testResult === true && (
            <p className="text-xs text-green-600">
              연결 성공! 테스트 메시지가 전송되었습니다.
            </p>
          )}
          {testResult === false && (
            <p className="text-xs text-red-500">
              연결 실패. Bot Token과 채널을 확인하세요.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Notifications Tab
// ============================================================
interface NotificationSetting {
  id: string;
  type: string;
  minutesBefore: number;
  slackChannel?: string | null;
  isActive: boolean;
  cronExpr?: string | null;
}

function NotificationsTab() {
  const { data: settings, isLoading } = useSWR<NotificationSetting[]>(
    "/api/notifications",
    fetcher
  );
  const [saving, setSaving] = useState(false);

  const beforeEvent = settings?.find((s) => s.type === "before_event");
  const dailySummary = settings?.find((s) => s.type === "daily_summary");

  const [minutesBefore, setMinutesBefore] = useState("30");
  const [beforeEventActive, setBeforeEventActive] = useState(true);
  const [dailySummaryActive, setDailySummaryActive] = useState(false);

  // Sync state when data loads
  const syncedRef = useState(false);
  if (settings && !syncedRef[0]) {
    if (beforeEvent) {
      setMinutesBefore(String(beforeEvent.minutesBefore));
      setBeforeEventActive(beforeEvent.isActive);
    }
    if (dailySummary) {
      setDailySummaryActive(dailySummary.isActive);
    }
    syncedRef[1](true);
  }

  const handleSaveBeforeEvent = async () => {
    setSaving(true);
    try {
      if (beforeEvent) {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: beforeEvent.id,
            minutesBefore: parseInt(minutesBefore),
            isActive: beforeEventActive,
          }),
        });
      } else {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "before_event",
            minutesBefore: parseInt(minutesBefore),
            isActive: beforeEventActive,
          }),
        });
      }
      mutate("/api/notifications");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDailySummary = async (active: boolean) => {
    setDailySummaryActive(active);
    if (dailySummary) {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dailySummary.id, isActive: active }),
      });
    } else {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "daily_summary",
          isActive: active,
          cronExpr: "0 9 * * *",
        }),
      });
    }
    mutate("/api/notifications");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">알림 설정</h3>
        <p className="text-sm text-muted-foreground">
          일정 알림과 요약 알림을 설정합니다
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Before event notification */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">일정 전 알림</CardTitle>
                  <CardDescription>
                    일정 시작 전 Slack으로 알림을 받습니다
                  </CardDescription>
                </div>
                <Switch
                  checked={beforeEventActive}
                  onCheckedChange={setBeforeEventActive}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>알림 시간</Label>
                <Select
                  value={minutesBefore}
                  onValueChange={setMinutesBefore}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5분 전</SelectItem>
                    <SelectItem value="10">10분 전</SelectItem>
                    <SelectItem value="15">15분 전</SelectItem>
                    <SelectItem value="30">30분 전</SelectItem>
                    <SelectItem value="60">1시간 전</SelectItem>
                    <SelectItem value="120">2시간 전</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleSaveBeforeEvent}
                disabled={saving}
              >
                {saving && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                저장
              </Button>
            </CardContent>
          </Card>

          {/* Daily summary */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">일일 요약 알림</p>
                  <p className="text-xs text-muted-foreground">
                    매일 오전 9시에 오늘의 일정과 할 일을 요약하여 알림을
                    보냅니다
                  </p>
                </div>
                <Switch
                  checked={dailySummaryActive}
                  onCheckedChange={handleToggleDailySummary}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// Focus Time Tab
// ============================================================
interface FocusTimeSettings {
  id?: string;
  minDuration: number;
  preferredStart: string;
  preferredEnd: string;
  excludeWeekends: boolean;
  isActive: boolean;
}

function FocusTimeTab() {
  const { data: settings, isLoading } = useSWR<FocusTimeSettings>(
    "/api/focus-time",
    fetcher
  );
  const [minDuration, setMinDuration] = useState("60");
  const [preferredStart, setPreferredStart] = useState("09:00");
  const [preferredEnd, setPreferredEnd] = useState("18:00");
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Sync state when data loads
  const syncedRef = useState(false);
  if (settings && settings.isActive && !syncedRef[0]) {
    setMinDuration(String(settings.minDuration));
    setPreferredStart(settings.preferredStart);
    setPreferredEnd(settings.preferredEnd);
    setExcludeWeekends(settings.excludeWeekends);
    syncedRef[1](true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/focus-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settings",
          minDuration: parseInt(minDuration),
          preferredStart,
          preferredEnd,
          excludeWeekends,
          isActive: true,
        }),
      });
      mutate("/api/focus-time");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch("/api/focus-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", days: 5 }),
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">포커스 타임</h3>
        <p className="text-sm text-muted-foreground">
          집중 시간 블록을 자동으로 생성합니다
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">포커스 타임 설정</CardTitle>
              <CardDescription>
                집중 시간의 최소 길이와 선호 시간대를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>최소 집중 시간</Label>
                <Select value={minDuration} onValueChange={setMinDuration}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30분</SelectItem>
                    <SelectItem value="45">45분</SelectItem>
                    <SelectItem value="60">1시간</SelectItem>
                    <SelectItem value="90">1시간 30분</SelectItem>
                    <SelectItem value="120">2시간</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>선호 시작 시간</Label>
                  <Input
                    type="time"
                    value={preferredStart}
                    onChange={(e) => setPreferredStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>선호 종료 시간</Label>
                  <Input
                    type="time"
                    value={preferredEnd}
                    onChange={(e) => setPreferredEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">주말 제외</p>
                  <p className="text-xs text-muted-foreground">
                    토요일, 일요일에는 포커스 타임을 생성하지 않습니다
                  </p>
                </div>
                <Switch
                  checked={excludeWeekends}
                  onCheckedChange={setExcludeWeekends}
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  )}
                  설정 저장
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-1.5 h-4 w-4" />
                  )}
                  포커스 타임 생성
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// General Tab
// ============================================================
function GeneralTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">일반</h3>
        <p className="text-sm text-muted-foreground">
          앱 정보와 기본 설정
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
              TF
            </div>
            <div>
              <h4 className="text-lg font-bold">TaskFlow</h4>
              <p className="text-sm text-muted-foreground">
                버전 0.1.0
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">프레임워크</span>
              <span className="font-medium">Next.js 16</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">데이터베이스</span>
              <span className="font-medium">MySQL + Prisma</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UI</span>
              <span className="font-medium">shadcn/ui + Tailwind CSS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">알림</span>
              <span className="font-medium">Slack Integration</span>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            할 일, 메모, 일정을 한 곳에서 관리하세요. 자연어 입력, 자동 스케줄링,
            Slack 알림, 문서 생성, 미팅 예약 등 다양한 기능을 제공합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Main Settings Page
// ============================================================
export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">설정</h1>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-6">
          <Tabs defaultValue="categories">
            <TabsList className="mb-6 w-full grid grid-cols-5">
              <TabsTrigger value="categories" className="text-xs">
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                카테고리
              </TabsTrigger>
              <TabsTrigger value="slack" className="text-xs">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Slack
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs">
                <Bell className="mr-1.5 h-3.5 w-3.5" />
                알림
              </TabsTrigger>
              <TabsTrigger value="focus" className="text-xs">
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                포커스 타임
              </TabsTrigger>
              <TabsTrigger value="general" className="text-xs">
                <Info className="mr-1.5 h-3.5 w-3.5" />
                일반
              </TabsTrigger>
            </TabsList>

            <TabsContent value="categories">
              <CategoriesTab />
            </TabsContent>
            <TabsContent value="slack">
              <SlackTab />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsTab />
            </TabsContent>
            <TabsContent value="focus">
              <FocusTimeTab />
            </TabsContent>
            <TabsContent value="general">
              <GeneralTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
