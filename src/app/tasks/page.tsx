"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isDatePastKST } from "@/lib/timezone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckSquare,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

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

const statusIcons: Record<string, React.ElementType> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  categoryId: string;
  category: Category;
  createdAt: string;
}

const defaultForm = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  categoryId: "",
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useSWR<Task[]>(
    "/api/tasks",
    fetcher
  );
  const { data: categories = [] } = useSWR<Category[]>(
    "/api/categories",
    fetcher
  );

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (categoryFilter !== "all" && task.categoryId !== categoryFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  const openCreateDialog = () => {
    setEditingTask(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate
        ? format(new Date(task.dueDate), "yyyy-MM-dd")
        : "",
      categoryId: task.categoryId,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (task: Task) => {
    setDeletingTask(task);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }
    if (!form.categoryId) {
      toast.error("카테고리를 선택해주세요");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...(editingTask ? { id: editingTask.id } : {}),
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        categoryId: form.categoryId,
        ...(editingTask ? { status: editingTask.status } : {}),
      };

      const res = await fetch("/api/tasks", {
        method: editingTask ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("요청 실패");

      toast.success(editingTask ? "할 일이 수정되었습니다" : "할 일이 추가되었습니다");
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingTask(null);
      mutate("/api/tasks");
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    try {
      const res = await fetch(`/api/tasks?id=${deletingTask.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");

      toast.success("할 일이 삭제되었습니다");
      setDeleteDialogOpen(false);
      setDeletingTask(null);
      mutate("/api/tasks");
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  const cycleStatus = async (task: Task) => {
    const order = ["todo", "in_progress", "done"];
    const nextIdx = (order.indexOf(task.status) + 1) % order.length;
    const nextStatus = order[nextIdx];

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("상태 변경 실패");

      toast.success(`상태: ${statusLabels[nextStatus]}`);
      mutate("/api/tasks");
    } catch {
      toast.error("상태 변경에 실패했습니다");
    }
  };

  const tabCounts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">할 일</h1>
          <p className="text-muted-foreground">작업을 관리하고 진행 상황을 추적하세요</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          새 할 일
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={setStatusFilter}
        className="w-full"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">전체 ({tabCounts.all})</TabsTrigger>
            <TabsTrigger value="todo">대기 ({tabCounts.todo})</TabsTrigger>
            <TabsTrigger value="in_progress">
              진행중 ({tabCounts.in_progress})
            </TabsTrigger>
            <TabsTrigger value="done">완료 ({tabCounts.done})</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 우선순위</SelectItem>
                <SelectItem value="urgent">긴급</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task list is same across all tab values */}
        {["all", "todo", "in_progress", "done"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {tasksLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <CheckSquare className="mb-3 h-12 w-12" />
                <p className="text-lg font-medium">할 일이 없습니다</p>
                <p className="mt-1 text-sm">새 할 일을 추가해보세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const StatusIcon = statusIcons[task.status] || Circle;
                  const isOverdue =
                    task.dueDate &&
                    task.status !== "done" &&
                    isDatePastKST(task.dueDate);

                  return (
                    <Card
                      key={task.id}
                      className={`transition-colors hover:bg-accent/30 ${
                        task.status === "done" ? "opacity-60" : ""
                      }`}
                    >
                      <CardContent className="flex items-start gap-3 py-4">
                        {/* Status Toggle */}
                        <button
                          onClick={() => cycleStatus(task)}
                          className="mt-0.5 shrink-0 transition-colors hover:text-primary"
                          title={`상태 변경: ${statusLabels[task.status]}`}
                        >
                          <StatusIcon
                            className={`h-5 w-5 ${
                              task.status === "done"
                                ? "text-green-500"
                                : task.status === "in_progress"
                                ? "text-blue-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={`font-medium ${
                                task.status === "done"
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {task.title}
                            </h3>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(task)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(task)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-xs ${priorityColors[task.priority]}`}
                            >
                              {priorityLabels[task.priority]}
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

                            {task.dueDate && (
                              <span
                                className={`flex items-center gap-1 text-xs ${
                                  isOverdue
                                    ? "font-medium text-red-500"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isOverdue && (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                {format(new Date(task.dueDate), "M월 d일 (EEE)", {
                                  locale: ko,
                                })}
                                {isOverdue && " 지남"}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "할 일 수정" : "새 할 일"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="할 일 제목을 입력하세요"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="상세 설명 (선택사항)"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>우선순위</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, priority: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">긴급</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">마감일</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingTask ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>할 일 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deletingTask?.title}&rdquo;을(를) 삭제하시겠습니까? 이 작업은
            되돌릴 수 없습니다.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
