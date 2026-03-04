export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  createdAt: string;
  _count?: { tasks: number; memos: number; events: number };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string | null;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface Memo {
  id: string;
  title: string;
  content: string;
  tags?: string | null;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  color?: string | null;
  type: "event" | "focus_time" | "meeting" | "reminder";
  categoryId?: string | null;
  category?: Category | null;
  isRecurring: boolean;
  recurrence?: string | null;
}

export interface Schedule {
  id: string;
  name: string;
  cronExpr: string;
  type: string;
  targetId?: string | null;
  targetType?: string | null;
  slackChannel?: string | null;
  message?: string | null;
  isActive: boolean;
  taskId?: string | null;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  createdAt: string;
}

export interface MeetingSlot {
  id: string;
  title: string;
  description?: string | null;
  duration: number;
  slots: string;
  bookingLink: string;
  isActive: boolean;
}

export interface MeetingBooking {
  id: string;
  meetingSlotId: string;
  bookerName: string;
  bookerEmail: string;
  startTime: string;
  endTime: string;
  status: string;
}
