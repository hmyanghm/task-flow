"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Video,
  Plus,
  Copy,
  Check,
  Loader2,
  Clock,
  Mail,
  User,
  Link2,
  CalendarDays,
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import type { MeetingSlot } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AvailableSlot {
  date: string;
  times: { time: string; score: number }[];
}

interface SlotWithAvailability extends MeetingSlot {
  availableSlots?: AvailableSlot[];
}

export default function MeetingsPage() {
  const { data: slots, isLoading } = useSWR<MeetingSlot[]>(
    "/api/meetings",
    fetcher
  );
  const [selectedSlot, setSelectedSlot] = useState<MeetingSlot | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");

  // Booking dialog state
  const [showBooking, setShowBooking] = useState(false);
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [bookerName, setBookerName] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [booking, setBooking] = useState(false);

  // Fetch slot detail with availability
  const { data: slotDetail } = useSWR<SlotWithAvailability>(
    selectedSlot ? `/api/meetings?link=${selectedSlot.bookingLink}` : null,
    fetcher
  );

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_slot",
          title,
          description: description || undefined,
          duration: parseInt(duration),
        }),
      });
      if (res.ok) {
        mutate("/api/meetings");
        setTitle("");
        setDescription("");
        setDuration("30");
        setShowCreateForm(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (slot: MeetingSlot) => {
    const link = `${window.location.origin}/book/${slot.bookingLink}`;
    navigator.clipboard.writeText(link);
    setCopiedId(slot.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBook = async () => {
    if (!bookingTime || !bookerName.trim() || !bookerEmail.trim()) return;
    setBooking(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book",
          bookingLink: selectedSlot?.bookingLink,
          startTime: bookingTime,
          bookerName,
          bookerEmail,
        }),
      });
      if (res.ok) {
        setShowBooking(false);
        setBookerName("");
        setBookerEmail("");
        setBookingTime(null);
        mutate(
          selectedSlot
            ? `/api/meetings?link=${selectedSlot.bookingLink}`
            : null
        );
      }
    } finally {
      setBooking(false);
    }
  };

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">미팅 예약</h1>
          {slots && (
            <Badge variant="secondary" className="ml-1">
              {slots.length}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          미팅 슬롯 만들기
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Slot list (left) */}
        <div className="w-80 flex-shrink-0 border-r">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {/* Create form */}
              {showCreateForm && (
                <Card className="mb-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      새 미팅 슬롯 만들기
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">제목</Label>
                      <Input
                        placeholder="예: 1:1 미팅"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">설명 (선택)</Label>
                      <Textarea
                        placeholder="미팅에 대한 설명..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">소요 시간</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15분</SelectItem>
                          <SelectItem value="30">30분</SelectItem>
                          <SelectItem value="45">45분</SelectItem>
                          <SelectItem value="60">60분</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleCreate}
                        disabled={!title.trim() || creating}
                      >
                        {creating && (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        )}
                        만들기
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                      >
                        취소
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !slots || slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Video className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    미팅 슬롯이 없습니다
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    새 미팅 슬롯을 만들어 예약 링크를 공유하세요
                  </p>
                </div>
              ) : (
                slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full rounded-lg p-3 text-left transition-colors ${
                      selectedSlot?.id === slot.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {slot.title}
                        </p>
                        {slot.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {slot.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Clock className="mr-1 h-2.5 w-2.5" />
                            {slot.duration}분
                          </Badge>
                          {slot.isActive ? (
                            <Badge
                              variant="default"
                              className="text-[10px] px-1.5 py-0"
                            >
                              활성
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              비활성
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(slot);
                        }}
                      >
                        {copiedId === slot.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Slot detail (right) */}
        <div className="flex-1 overflow-hidden">
          {selectedSlot && slotDetail ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Slot info */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">{slotDetail.title}</h2>
                  {slotDetail.description && (
                    <p className="mt-1 text-muted-foreground">
                      {slotDetail.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <Badge variant="outline">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {slotDetail.duration}분
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(selectedSlot)}
                    >
                      {copiedId === selectedSlot.id ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          예약 링크 복사
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Available times */}
                <h3 className="mb-4 text-lg font-semibold">예약 가능한 시간</h3>

                {slotDetail.availableSlots &&
                slotDetail.availableSlots.length > 0 ? (
                  <div className="space-y-3">
                    {slotDetail.availableSlots.map((daySlot) => {
                      const isExpanded = expandedDays[daySlot.date] !== false;
                      const topTimes = daySlot.times.slice(0, 3);
                      const restTimes = daySlot.times.slice(3);

                      return (
                        <Card key={daySlot.date}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                <CardTitle className="text-sm">
                                  {format(
                                    new Date(daySlot.date + "T00:00:00"),
                                    "M월 d일 (EEEE)",
                                    { locale: ko }
                                  )}
                                </CardTitle>
                                <Badge variant="secondary" className="text-[10px]">
                                  {daySlot.times.length}개 슬롯
                                </Badge>
                              </div>
                              {restTimes.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleDay(daySlot.date)}
                                  className="h-7 text-xs"
                                >
                                  {isExpanded ? (
                                    <>
                                      접기
                                      <ChevronUp className="ml-1 h-3 w-3" />
                                    </>
                                  ) : (
                                    <>
                                      +{restTimes.length}개 더보기
                                      <ChevronDown className="ml-1 h-3 w-3" />
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {topTimes.map((t) => (
                                <Button
                                  key={t.time}
                                  size="sm"
                                  variant="outline"
                                  className="relative"
                                  onClick={() => {
                                    setBookingTime(t.time);
                                    setShowBooking(true);
                                  }}
                                >
                                  {format(new Date(t.time), "HH:mm")}
                                  {t.score >= 90 && (
                                    <Badge className="ml-1.5 bg-amber-500 text-[9px] px-1 py-0 hover:bg-amber-500">
                                      BEST
                                    </Badge>
                                  )}
                                </Button>
                              ))}
                              {isExpanded &&
                                restTimes.map((t) => (
                                  <Button
                                    key={t.time}
                                    size="sm"
                                    variant="outline"
                                    className="relative"
                                    onClick={() => {
                                      setBookingTime(t.time);
                                      setShowBooking(true);
                                    }}
                                  >
                                    {format(new Date(t.time), "HH:mm")}
                                    {t.score >= 90 && (
                                      <Badge className="ml-1.5 bg-amber-500 text-[9px] px-1 py-0 hover:bg-amber-500">
                                        BEST
                                      </Badge>
                                    )}
                                  </Button>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-3 text-sm text-muted-foreground">
                      예약 가능한 시간이 없습니다
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Video className="h-16 w-16 text-muted-foreground/30" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                미팅 슬롯을 선택하세요
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                왼쪽 목록에서 슬롯을 선택하면 예약 가능한 시간을 확인할 수
                있습니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Booking dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>미팅 예약</DialogTitle>
            <DialogDescription>
              {selectedSlot?.title} -{" "}
              {bookingTime &&
                format(new Date(bookingTime), "M월 d일 (EEEE) HH:mm", {
                  locale: ko,
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="홍길동"
                  value={bookerName}
                  onChange={(e) => setBookerName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="hong@example.com"
                  value={bookerEmail}
                  onChange={(e) => setBookerEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>선택한 시간</Label>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {bookingTime &&
                    format(new Date(bookingTime), "yyyy년 M월 d일 (EEEE)", {
                      locale: ko,
                    })}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  {bookingTime && format(new Date(bookingTime), "HH:mm")} -{" "}
                  {bookingTime &&
                    selectedSlot &&
                    format(
                      new Date(
                        new Date(bookingTime).getTime() +
                          selectedSlot.duration * 60000
                      ),
                      "HH:mm"
                    )}
                  <span className="text-muted-foreground">
                    ({selectedSlot?.duration}분)
                  </span>
                </div>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleBook}
              disabled={!bookerName.trim() || !bookerEmail.trim() || booking}
            >
              {booking && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              예약 확정
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
