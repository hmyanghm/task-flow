"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  parseISO,
  addYears,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarRange, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarEvent } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

const EVENT_COLORS: Record<string, { dot: string }> = {
  event: { dot: "bg-blue-500" },
  focus_time: { dot: "bg-green-500" },
  meeting: { dot: "bg-purple-500" },
  reminder: { dot: "bg-orange-500" },
};

const TYPE_LABELS: Record<string, string> = {
  event: "일정",
  focus_time: "포커스 타임",
  meeting: "미팅",
  reminder: "리마인더",
};

export default function YearlyCalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const yearStart = useMemo(() => startOfYear(new Date(year, 0, 1)), [year]);
  const yearEnd = useMemo(() => endOfYear(new Date(year, 0, 1)), [year]);

  const eventsUrl = `/api/events?start=${yearStart.toISOString()}&end=${yearEnd.toISOString()}`;
  const { data: events = [], isLoading } = useSWR<CalendarEvent[]>(eventsUrl, fetcher);

  // Build a Map<"YYYY-MM-DD", CalendarEvent[]> for O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(parseISO(event.startTime), "yyyy-MM-dd");
      const existing = map.get(key);
      if (existing) {
        existing.push(event);
      } else {
        map.set(key, [event]);
      }
    }
    return map;
  }, [events]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)),
    [year]
  );

  const getMonthDays = useCallback((monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  }, []);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

  // Expanded month: helper to get events for a specific day sorted by time
  const getEventsForDay = useCallback(
    (day: Date) => {
      const key = format(day, "yyyy-MM-dd");
      return (eventsByDate.get(key) || []).sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    },
    [eventsByDate]
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">
            {expandedMonth !== null
              ? format(new Date(year, expandedMonth, 1), "yyyy년 M월", { locale: ko })
              : "연간 달력"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {expandedMonth !== null ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (expandedMonth === 0) {
                    setYear((y) => y - 1);
                    setExpandedMonth(11);
                  } else {
                    setExpandedMonth((m) => m! - 1);
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpandedMonth(null)}>
                연간 보기
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (expandedMonth === 11) {
                    setYear((y) => y + 1);
                    setExpandedMonth(0);
                  } else {
                    setExpandedMonth((m) => m! + 1);
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setYear(new Date().getFullYear())}>
                올해
              </Button>
              <span className="min-w-[4.5rem] text-center text-lg font-semibold">{year}년</span>
              <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expanded single month view */}
      {expandedMonth !== null ? (
        (() => {
          const monthDate = new Date(year, expandedMonth, 1);
          const days = getMonthDays(monthDate);
          return (
            <Card>
              <CardContent className="p-4 md:p-6">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b">
                  {DAY_HEADERS.map((d, i) => (
                    <div
                      key={d}
                      className={`py-2 text-center text-sm font-semibold ${
                        i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day grid */}
                <div className="grid grid-cols-7">
                  {days.map((day) => {
                    const inMonth = isSameMonth(day, monthDate);
                    const today = isToday(day);
                    const dayOfWeek = day.getDay();
                    const dayEvents = inMonth ? getEventsForDay(day) : [];
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => inMonth && handleDateClick(day)}
                        disabled={!inMonth}
                        className={`relative min-h-[90px] border-b border-r p-1.5 text-left transition-colors last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                          !inMonth
                            ? "bg-muted/30 text-muted-foreground/30"
                            : today
                            ? "bg-primary/5"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                            today
                              ? "bg-primary text-primary-foreground"
                              : !inMonth
                              ? ""
                              : dayOfWeek === 0
                              ? "text-red-500"
                              : dayOfWeek === 6
                              ? "text-blue-500"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {/* Event list in cell */}
                        {inMonth && hasEvents && (
                          <div className="mt-0.5 space-y-0.5">
                            {dayEvents.slice(0, 3).map((event) => {
                              const dotColor = event.category?.color;
                              const classDot = dotColor
                                ? ""
                                : EVENT_COLORS[event.type]?.dot || EVENT_COLORS.event.dot;
                              return (
                                <div
                                  key={event.id}
                                  className="flex items-center gap-1 rounded px-1 py-0.5"
                                >
                                  <span
                                    className={`block h-1.5 w-1.5 shrink-0 rounded-full ${classDot}`}
                                    style={dotColor ? { backgroundColor: dotColor } : undefined}
                                  />
                                  <span className="truncate text-[10px] leading-tight text-foreground">
                                    {event.title}
                                  </span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <span className="block px-1 text-[10px] text-muted-foreground">
                                +{dayEvents.length - 3}개 더
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="mb-3 h-5 w-16 rounded bg-muted" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }, (_, j) => (
                    <div key={j} className="h-5 rounded bg-muted" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {months.map((monthDate) => {
            const days = getMonthDays(monthDate);
            return (
              <Card key={monthDate.getMonth()} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <button
                    className="mb-2 text-sm font-semibold hover:text-primary transition-colors w-full text-left"
                    onClick={() => setExpandedMonth(monthDate.getMonth())}
                  >
                    {format(monthDate, "M월", { locale: ko })}
                  </button>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-0">
                    {DAY_HEADERS.map((d, i) => (
                      <div
                        key={d}
                        className={`py-1 text-center text-[10px] font-medium ${
                          i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
                        }`}
                      >
                        {d}
                      </div>
                    ))}

                    {/* Day cells */}
                    {days.map((day) => {
                      const inMonth = isSameMonth(day, monthDate);
                      const today = isToday(day);
                      const dayOfWeek = day.getDay();
                      const dateKey = format(day, "yyyy-MM-dd");
                      const dayEvents = eventsByDate.get(dateKey);
                      const hasEvents = !!dayEvents && dayEvents.length > 0;

                      // Collect unique dot colors (max 3)
                      const dots = hasEvents
                        ? [...new Set(dayEvents.map((e) => {
                            if (e.category?.color) return e.category.color;
                            return EVENT_COLORS[e.type]?.dot || EVENT_COLORS.event.dot;
                          }))].slice(0, 3)
                        : [];

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => inMonth && handleDateClick(day)}
                          disabled={!inMonth}
                          className={`relative flex flex-col items-center py-0.5 text-[11px] leading-tight transition-colors ${
                            !inMonth
                              ? "text-transparent cursor-default"
                              : today
                              ? "font-bold"
                              : dayOfWeek === 0
                              ? "text-red-500"
                              : dayOfWeek === 6
                              ? "text-blue-500"
                              : "text-foreground"
                          } ${inMonth ? "hover:bg-accent rounded" : ""}`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full ${
                              today ? "bg-primary text-primary-foreground" : ""
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          {/* Event dots */}
                          {inMonth && hasEvents && (
                            <div className="flex gap-[2px]">
                              {dots.map((color, i) => (
                                <span
                                  key={i}
                                  className={`block h-1 w-1 rounded-full ${
                                    color.startsWith("bg-") ? color : ""
                                  }`}
                                  style={
                                    !color.startsWith("bg-")
                                      ? { backgroundColor: color }
                                      : undefined
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Day events dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </DialogTitle>
            <DialogDescription>
              {selectedDateEvents.length > 0
                ? `${selectedDateEvents.length}개의 일정`
                : "일정이 없습니다"}
            </DialogDescription>
          </DialogHeader>
          {selectedDateEvents.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {selectedDateEvents.map((event) => {
                  const dotColor = event.category?.color
                    ? undefined
                    : EVENT_COLORS[event.type]?.dot || EVENT_COLORS.event.dot;
                  return (
                    <div
                      key={event.id}
                      className="rounded-lg border p-3 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`block h-2.5 w-2.5 shrink-0 rounded-full ${dotColor || ""}`}
                          style={
                            event.category?.color
                              ? { backgroundColor: event.category.color }
                              : undefined
                          }
                        />
                        <span className="font-medium text-sm">{event.title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(event.startTime), "a h:mm", { locale: ko })}
                          {" - "}
                          {format(parseISO(event.endTime), "a h:mm", { locale: ko })}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {TYPE_LABELS[event.type]}
                        </Badge>
                        {event.category && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{
                              borderColor: event.category.color,
                              color: event.category.color,
                            }}
                          >
                            {event.category.name}
                          </Badge>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              이 날에는 일정이 없습니다.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
