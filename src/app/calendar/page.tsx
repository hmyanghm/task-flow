"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  eachDayOfInterval,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  differenceInMinutes,
  parseISO,
  addHours,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Clock,
  MapPin,
  Zap,
  CalendarDays,
  Trash2,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import type { CalendarEvent, Category } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  event: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-l-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  focus_time: {
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-l-green-500",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
  },
  meeting: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-l-purple-500",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  reminder: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-l-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
};

const TYPE_LABELS: Record<string, string> = {
  event: "일정",
  focus_time: "포커스 타임",
  meeting: "미팅",
  reminder: "리마인더",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"manual" | "natural">("manual");
  const [isGeneratingFocus, setIsGeneratingFocus] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formType, setFormType] = useState<string>("event");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [naturalInput, setNaturalInput] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(["all"]));

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const eventsUrl = `/api/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`;
  const { data: events = [], isLoading } = useSWR<CalendarEvent[]>(eventsUrl, fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const navigateWeek = useCallback(
    (direction: number) => {
      setCurrentDate((prev) => addWeeks(prev, direction));
    },
    []
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }, []);

  const handleMiniCalendarSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCurrentDate(date);
    }
  }, []);

  const openCreateDialog = useCallback(
    (day?: Date, hour?: number) => {
      const targetDate = day || new Date();
      const dateStr = format(targetDate, "yyyy-MM-dd");
      setFormStartDate(dateStr);
      setFormEndDate(dateStr);
      if (hour !== undefined) {
        setFormStartTime(`${String(hour).padStart(2, "0")}:00`);
        setFormEndTime(`${String(hour + 1).padStart(2, "0")}:00`);
      } else {
        setFormStartTime("09:00");
        setFormEndTime("10:00");
      }
      setFormTitle("");
      setFormDescription("");
      setFormLocation("");
      setFormType("event");
      setFormCategoryId("");
      setNaturalInput("");
      setCreateDialogOpen(true);
    },
    []
  );

  const handleCreateEvent = useCallback(async () => {
    setFormSubmitting(true);
    try {
      if (inputMode === "natural") {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ naturalLanguage: naturalInput }),
        });
        if (!res.ok) {
          const error = await res.json();
          alert(error.error || "일정 생성에 실패했습니다.");
          return;
        }
      } else {
        const startTime = new Date(`${formStartDate}T${formStartTime}:00`);
        const endTime = new Date(`${formEndDate}T${formEndTime}:00`);
        if (endTime <= startTime) {
          alert("종료 시간은 시작 시간보다 늦어야 합니다.");
          return;
        }
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            description: formDescription || undefined,
            location: formLocation || undefined,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            type: formType,
            categoryId: formCategoryId || undefined,
            allDay: false,
          }),
        });
        if (!res.ok) {
          alert("일정 생성에 실패했습니다.");
          return;
        }
      }
      setCreateDialogOpen(false);
      mutate(eventsUrl);
    } catch {
      alert("일정 생성 중 오류가 발생했습니다.");
    } finally {
      setFormSubmitting(false);
    }
  }, [
    inputMode,
    naturalInput,
    formTitle,
    formDescription,
    formLocation,
    formType,
    formCategoryId,
    formStartDate,
    formStartTime,
    formEndDate,
    formEndTime,
    eventsUrl,
  ]);

  const handleAutoFocusTime = useCallback(async () => {
    setIsGeneratingFocus(true);
    try {
      const res = await fetch("/api/focus-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      if (res.ok) {
        mutate(eventsUrl);
      } else {
        alert("포커스 타임 배치에 실패했습니다.");
      }
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setIsGeneratingFocus(false);
    }
  }, [eventsUrl]);

  const toggleCategory = useCallback((categoryId: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (categoryId === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(categoryId)) {
        next.delete(categoryId);
        if (next.size === 0) return new Set(["all"]);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const filteredEvents = useMemo(() => {
    if (activeCategories.has("all")) return events;
    return events.filter((e) => e.categoryId && activeCategories.has(e.categoryId));
  }, [events, activeCategories]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events?id=${selectedEvent.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDetailDialogOpen(false);
        setSelectedEvent(null);
        mutate(eventsUrl);
      } else {
        alert("일정 삭제에 실패했습니다.");
      }
    } catch {
      alert("일정 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedEvent, eventsUrl]);

  const getEventsForDay = useCallback(
    (day: Date) =>
      filteredEvents.filter((event) => {
        const eventStart = parseISO(event.startTime);
        return isSameDay(eventStart, day);
      }),
    [filteredEvents]
  );

  const getEventStyle = useCallback((event: CalendarEvent) => {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const durationMinutes = differenceInMinutes(end, start);
    const topOffset = (startHour - 7) * 64; // 64px per hour
    const height = Math.max((durationMinutes / 60) * 64, 24);
    return { top: `${topOffset}px`, height: `${height}px` };
  }, []);

  const getCurrentTimePosition = useCallback(() => {
    const hours = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (hours < 7 || hours > 21) return null;
    return (hours - 7) * 64;
  }, [currentTime]);

  const currentTimePos = getCurrentTimePosition();

  return (
    <div className="flex gap-4 p-4 md:p-6">
      {/* Left sidebar: mini calendar + legend */}
      <div className="hidden w-72 shrink-0 space-y-4 lg:block">
        {/* Mini Calendar */}
        <Card>
          <CardContent className="p-2">
            <MiniCalendar
              mode="single"
              selected={selectedDate}
              onSelect={handleMiniCalendarSelect}
              locale={ko}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Category Filter */}
        {categories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Filter className="h-3.5 w-3.5" />
                카테고리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={activeCategories.has("all")}
                  onCheckedChange={() => toggleCategory("all")}
                />
                <span className="text-sm">전체</span>
              </label>
              {categories.map((cat) => (
                <label key={cat.id} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={activeCategories.has("all") || activeCategories.has(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm">{cat.name}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일정 유형</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(EVENT_COLORS).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${colors.dot}`} />
                <span className="text-sm text-muted-foreground">
                  {TYPE_LABELS[type]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Focus Time Button */}
        <Button
          className="w-full gap-2"
          variant="outline"
          onClick={handleAutoFocusTime}
          disabled={isGeneratingFocus}
        >
          <Zap className="h-4 w-4" />
          {isGeneratingFocus ? "배치 중..." : "포커스 타임 자동 배치"}
        </Button>
      </div>

      {/* Main Calendar View */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">캘린더</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile focus time button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 lg:hidden"
              onClick={handleAutoFocusTime}
              disabled={isGeneratingFocus}
            >
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">포커스 타임</span>
            </Button>

            <Button
              size="sm"
              className="gap-1"
              onClick={() => openCreateDialog()}
            >
              <Plus className="h-4 w-4" />
              새 일정
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                오늘
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateWeek(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {format(weekStart, "yyyy년 M월 d일", { locale: ko })} -{" "}
              {format(weekEnd, "M월 d일", { locale: ko })}
            </h2>
          </CardContent>
        </Card>

        {/* Week Grid */}
        <Card className="overflow-hidden">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="min-w-[800px]">
              {/* Day Headers */}
              <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(7,1fr)] border-b bg-card">
                <div className="border-r p-2" />
                {weekDays.map((day) => {
                  const dayOfWeek = day.getDay();
                  const dayName = DAY_NAMES[dayOfWeek];
                  const today = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`border-r p-2 text-center last:border-r-0 ${
                        today ? "bg-primary/5" : ""
                      }`}
                    >
                      <div
                        className={`text-xs font-medium ${
                          dayOfWeek === 0
                            ? "text-red-500"
                            : dayOfWeek === 6
                            ? "text-blue-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {dayName}
                      </div>
                      <div
                        className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          today
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
                {/* Hour Labels */}
                <div className="border-r">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex h-16 items-start justify-end border-b pr-2 pt-0"
                    >
                      <span className="relative -top-2 text-xs text-muted-foreground">
                        {hour < 12
                          ? `오전 ${hour}시`
                          : hour === 12
                          ? "오후 12시"
                          : `오후 ${hour - 12}시`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const today = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative border-r last:border-r-0 ${
                        today ? "bg-primary/[0.02]" : ""
                      }`}
                    >
                      {/* Hour grid lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="h-16 border-b transition-colors hover:bg-accent/30 cursor-pointer"
                          onClick={() => openCreateDialog(day, hour)}
                        />
                      ))}

                      {/* Current time indicator */}
                      {today && currentTimePos !== null && (
                        <div
                          className="absolute left-0 right-0 z-10 flex items-center"
                          style={{ top: `${currentTimePos}px` }}
                        >
                          <div className="h-2.5 w-2.5 -ml-[5px] rounded-full bg-red-500" />
                          <div className="h-[2px] flex-1 bg-red-500" />
                        </div>
                      )}

                      {/* Event blocks */}
                      {dayEvents.map((event) => {
                        const style = getEventStyle(event);
                        const colors =
                          EVENT_COLORS[event.type] || EVENT_COLORS.event;
                        const isFocus = event.type === "focus_time";
                        const catColor = event.category?.color;
                        return (
                          <TooltipProvider key={event.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute inset-x-1 z-10 cursor-pointer overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-xs shadow-sm transition-shadow hover:shadow-md ${
                                    catColor ? "" : colors.bg
                                  } ${catColor ? "" : colors.border} ${catColor ? "" : colors.text} ${
                                    isFocus
                                      ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(34,197,94,0.08)_4px,rgba(34,197,94,0.08)_8px)]"
                                      : ""
                                  }`}
                                  style={{
                                    ...style,
                                    ...(catColor
                                      ? {
                                          backgroundColor: `${catColor}15`,
                                          borderLeftColor: catColor,
                                          color: catColor,
                                        }
                                      : {}),
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                >
                                  <div className="flex items-center gap-1">
                                    {isFocus && (
                                      <Sparkles className="h-3 w-3 shrink-0" />
                                    )}
                                    <span className="truncate font-medium">
                                      {event.title}
                                    </span>
                                  </div>
                                  {parseInt(style.height) > 40 && (
                                    <div className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                                      <Clock className="h-2.5 w-2.5" />
                                      {format(
                                        parseISO(event.startTime),
                                        "HH:mm"
                                      )}{" "}
                                      -{" "}
                                      {format(
                                        parseISO(event.endTime),
                                        "HH:mm"
                                      )}
                                    </div>
                                  )}
                                  {parseInt(style.height) > 56 &&
                                    event.location && (
                                      <div className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                                        <MapPin className="h-2.5 w-2.5" />
                                        <span className="truncate">
                                          {event.location}
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    {event.title}
                                  </p>
                                  <p className="text-xs">
                                    {format(
                                      parseISO(event.startTime),
                                      "a h:mm",
                                      { locale: ko }
                                    )}{" "}
                                    -{" "}
                                    {format(
                                      parseISO(event.endTime),
                                      "a h:mm",
                                      { locale: ko }
                                    )}
                                  </p>
                                  {event.location && (
                                    <p className="text-xs">{event.location}</p>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="text-[10px]">
                                      {TYPE_LABELS[event.type]}
                                    </Badge>
                                    {event.category && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px]"
                                        style={{ borderColor: event.category.color, color: event.category.color }}
                                      >
                                        {event.category.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent && (
                <span className="mt-1 flex items-center gap-1">
                  <Badge variant="secondary">
                    {TYPE_LABELS[selectedEvent.type]}
                  </Badge>
                  {selectedEvent.category && (
                    <Badge
                      variant="outline"
                      style={{ borderColor: selectedEvent.category.color, color: selectedEvent.category.color }}
                    >
                      {selectedEvent.category.name}
                    </Badge>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(parseISO(selectedEvent.startTime), "yyyy년 M월 d일 (EEE) a h:mm", { locale: ko })}
                  {" - "}
                  {format(parseISO(selectedEvent.endTime), "a h:mm", { locale: ko })}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.description}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={isDeleting}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>새 일정 추가</DialogTitle>
            <DialogDescription>
              직접 입력하거나 자연어로 일정을 추가하세요.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={inputMode}
            onValueChange={(v) => setInputMode(v as "manual" | "natural")}
          >
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1">
                직접 입력
              </TabsTrigger>
              <TabsTrigger value="natural" className="flex-1">
                자연어 입력
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  placeholder="일정 제목"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">유형</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">일정</SelectItem>
                    <SelectItem value="meeting">미팅</SelectItem>
                    <SelectItem value="focus_time">포커스 타임</SelectItem>
                    <SelectItem value="reminder">리마인더</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="카테고리 선택 (선택)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>시작 시간</Label>
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>종료일</Label>
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>종료 시간</Label>
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">장소</Label>
                <Input
                  id="location"
                  placeholder="장소 (선택)"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  placeholder="설명 (선택)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="natural" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="natural">자연어 입력</Label>
                <Textarea
                  id="natural"
                  placeholder={`예시:\n"내일 오후 2시 팀 미팅"\n"금요일 오전 10시-12시 프로젝트 리뷰"\n"다음주 월요일 오후 3시 서울 강남 카페에서 클라이언트 미팅"`}
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  날짜, 시간, 제목을 포함하여 자연스럽게 입력하세요. 장소가 있다면
                  함께 적어주세요.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={
                formSubmitting ||
                (inputMode === "manual" && !formTitle) ||
                (inputMode === "natural" && !naturalInput)
              }
            >
              {formSubmitting ? "생성 중..." : "일정 추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
