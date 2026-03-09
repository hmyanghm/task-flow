"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, isToday, isBefore, startOfDay, endOfDay, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CheckSquare,
  Clock,
  CalendarDays,
  StickyNote,
  Send,
  Loader2,
  AlertCircle,
  ChevronRight,
  ImagePlus,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const priorityLabels: Record<string, string> = {
  urgent: "긴급",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const statusLabels: Record<string, string> = {
  todo: "대기",
  in_progress: "진행중",
  done: "완료",
};

const statusColors: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  done: "bg-green-100 text-green-700 border-green-200",
};

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  categoryId: string;
  category: { id: string; name: string; color: string };
}

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  type: string;
  category?: { id: string; name: string; color: string };
}

interface Memo {
  id: string;
  title: string;
  content: string;
  tags?: string;
  category: { id: string; name: string; color: string };
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [eventInput, setEventInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tasks = [] } = useSWR<Task[]>("/api/tasks", fetcher);
  const { data: events = [] } = useSWR<Event[]>("/api/events", fetcher);
  const { data: memos = [] } = useSWR<Memo[]>("/api/memos", fetcher);

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // Stats
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const dueTodayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    return isToday(new Date(t.dueDate));
  }).length;
  const totalMemos = memos.length;

  // Today's tasks (due today or overdue, not done)
  const todayTasks = tasks.filter((t) => {
    if (t.status === "done") return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return isToday(due) || isBefore(due, todayStart);
  });

  // Upcoming events (next 5 from now)
  const upcomingEvents = events
    .filter((e) => new Date(e.startTime) >= today)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  // Recent memos (last 3)
  const recentMemos = memos.slice(0, 3);

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventInput.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalLanguage: eventInput }),
      });

      if (!res.ok) {
        let errorMessage = "일정 생성 실패";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // 응답 본문이 JSON이 아닌 경우 (DB 연결 오류 등)
          if (res.status === 500) errorMessage = "서버 오류가 발생했습니다. DB 연결을 확인해주세요.";
        }
        throw new Error(errorMessage);
      }

      toast.success("일정이 추가되었습니다");
      setEventInput("");
      mutate("/api/events");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "일정 추가에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "이미지 파싱에 실패했습니다.");
        } else {
          const created = await res.json();
          const count = Array.isArray(created) ? created.length : 1;
          toast.success(`${count}개의 일정이 추가되었습니다`);
          mutate("/api/events");
        }
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("이미지 업로드에 실패했습니다.");
      setIsUploadingImage(false);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const stats = [
    {
      label: "전체 할 일",
      value: totalTasks,
      icon: CheckSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/tasks",
    },
    {
      label: "진행중",
      value: inProgressTasks,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/tasks",
    },
    {
      label: "오늘 마감",
      value: dueTodayTasks,
      icon: CalendarDays,
      color: "text-rose-600",
      bg: "bg-rose-50",
      href: "/tasks",
    },
    {
      label: "전체 메모",
      value: totalMemos,
      icon: StickyNote,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/memos",
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          안녕하세요{session?.user?.name ? `, ${session.user.name}` : ""}님!
        </h1>
        <p className="mt-1 text-muted-foreground">
          {format(today, "yyyy년 M월 d일 EEEE", { locale: ko })}
        </p>
      </div>

      {/* Quick Event Input */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleEventSubmit} className="flex gap-2">
            <Input
              placeholder='자연어로 일정 추가 (예: "내일 오후 2시 팀 미팅")'
              value={eventInput}
              onChange={(e) => setEventInput(e.target.value)}
              className="flex-1"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
              title="이미지로 일정 추가"
            >
              {isUploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
            <Button type="submit" disabled={isSubmitting || !eventInput.trim()}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">추가</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">오늘의 할 일</CardTitle>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                전체 보기
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckSquare className="mb-2 h-8 w-8" />
                <p className="text-sm">오늘 할 일이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task) => {
                  const isOverdue =
                    task.dueDate && isBefore(new Date(task.dueDate), todayStart);
                  return (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{task.title}</p>
                          {isOverdue && (
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-xs ${priorityColors[task.priority]}`}
                          >
                            {priorityLabels[task.priority]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusColors[task.status]}`}
                          >
                            {statusLabels[task.status]}
                          </Badge>
                          {task.category && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: task.category.color,
                                color: task.category.color,
                              }}
                            >
                              {task.category.name}
                            </Badge>
                          )}
                          {isOverdue && task.dueDate && (
                            <span className="text-xs text-red-500">
                              {format(new Date(task.dueDate), "M/d", { locale: ko })} 마감
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">다가오는 일정</CardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                전체 보기
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CalendarDays className="mb-2 h-8 w-8" />
                <p className="text-sm">예정된 일정이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href="/calendar"
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: event.category?.color || "#3B82F6",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(event.startTime), "M월 d일 (EEE)", {
                            locale: ko,
                          })}
                        </span>
                        {!event.allDay && (
                          <span>
                            {format(new Date(event.startTime), "HH:mm")} -{" "}
                            {format(new Date(event.endTime), "HH:mm")}
                          </span>
                        )}
                        {event.allDay && (
                          <Badge variant="secondary" className="text-xs">
                            종일
                          </Badge>
                        )}
                        {event.location && (
                          <span className="truncate">{event.location}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Memos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">최근 메모</CardTitle>
          <Link href="/memos">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              전체 보기
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentMemos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <StickyNote className="mb-2 h-8 w-8" />
              <p className="text-sm">메모가 없습니다</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentMemos.map((memo) => (
                <Link
                  key={memo.id}
                  href="/memos"
                  className="rounded-lg border p-4 transition-colors hover:bg-accent/50 block"
                >
                  <h4 className="font-medium truncate">{memo.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {memo.content.slice(0, 100)}
                    {memo.content.length > 100 && "..."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {memo.category && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: memo.category.color,
                          color: memo.category.color,
                        }}
                      >
                        {memo.category.name}
                      </Badge>
                    )}
                    {memo.tags &&
                      memo.tags
                        .split(",")
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag.trim()}
                          </Badge>
                        ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {format(new Date(memo.updatedAt), "M월 d일 HH:mm", {
                      locale: ko,
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
