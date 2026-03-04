"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  StickyNote,
  Search,
  X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Memo {
  id: string;
  title: string;
  content: string;
  tags?: string;
  categoryId: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

const defaultForm = {
  title: "",
  content: "",
  tags: "",
  categoryId: "",
};

export default function MemosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [deletingMemo, setDeletingMemo] = useState<Memo | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: memos = [], isLoading: memosLoading } = useSWR<Memo[]>(
    "/api/memos",
    fetcher
  );
  const { data: categories = [] } = useSWR<Category[]>(
    "/api/categories",
    fetcher
  );

  // Filter memos client-side for instant feedback
  const filteredMemos = useMemo(() => {
    return memos.filter((memo) => {
      // Category filter
      if (categoryFilter !== "all" && memo.categoryId !== categoryFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = memo.title.toLowerCase().includes(query);
        const matchContent = memo.content.toLowerCase().includes(query);
        const matchTags = memo.tags?.toLowerCase().includes(query);
        if (!matchTitle && !matchContent && !matchTags) return false;
      }
      return true;
    });
  }, [memos, categoryFilter, searchQuery]);

  const openCreateDialog = () => {
    setEditingMemo(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (memo: Memo) => {
    setEditingMemo(memo);
    setForm({
      title: memo.title,
      content: memo.content,
      tags: memo.tags || "",
      categoryId: memo.categoryId,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (memo: Memo) => {
    setDeletingMemo(memo);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }
    if (!form.content.trim()) {
      toast.error("내용을 입력해주세요");
      return;
    }
    if (!form.categoryId) {
      toast.error("카테고리를 선택해주세요");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...(editingMemo ? { id: editingMemo.id } : {}),
        title: form.title,
        content: form.content,
        tags: form.tags || undefined,
        categoryId: form.categoryId,
      };

      const res = await fetch("/api/memos", {
        method: editingMemo ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("요청 실패");

      toast.success(
        editingMemo ? "메모가 수정되었습니다" : "메모가 추가되었습니다"
      );
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingMemo(null);
      mutate("/api/memos");
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMemo) return;
    try {
      const res = await fetch(`/api/memos?id=${deletingMemo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("삭제 실패");

      toast.success("메모가 삭제되었습니다");
      setDeleteDialogOpen(false);
      setDeletingMemo(null);
      mutate("/api/memos");
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">메모</h1>
          <p className="text-muted-foreground">아이디어와 메모를 기록하세요</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          새 메모
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="메모 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
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
      </div>

      {/* Results count */}
      {(searchQuery || categoryFilter !== "all") && (
        <p className="text-sm text-muted-foreground">
          {filteredMemos.length}개의 메모
        </p>
      )}

      {/* Memo Grid */}
      {memosLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMemos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <StickyNote className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">
            {searchQuery || categoryFilter !== "all"
              ? "검색 결과가 없습니다"
              : "메모가 없습니다"}
          </p>
          <p className="mt-1 text-sm">
            {searchQuery || categoryFilter !== "all"
              ? "다른 검색어나 필터를 시도해보세요"
              : "새 메모를 작성해보세요"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMemos.map((memo) => (
            <Card
              key={memo.id}
              className="group relative transition-colors hover:bg-accent/30"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug line-clamp-2">
                    {memo.title}
                  </CardTitle>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(memo)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(memo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {memo.content.slice(0, 100)}
                  {memo.content.length > 100 && "..."}
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
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

                <p className="text-xs text-muted-foreground">
                  {format(new Date(memo.updatedAt), "yyyy년 M월 d일 HH:mm", {
                    locale: ko,
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingMemo ? "메모 수정" : "새 메모"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memo-title">제목</Label>
              <Input
                id="memo-title"
                placeholder="메모 제목을 입력하세요"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo-content">내용</Label>
              <Textarea
                id="memo-content"
                placeholder="메모 내용을 작성하세요"
                rows={6}
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo-tags">태그</Label>
              <Input
                id="memo-tags"
                placeholder="쉼표로 구분하여 입력 (예: 회의,아이디어,중요)"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
              />
              {form.tags && (
                <div className="flex flex-wrap gap-1">
                  {form.tags
                    .split(",")
                    .filter(Boolean)
                    .map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                </div>
              )}
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
                {editingMemo ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>메모 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deletingMemo?.title}&rdquo;을(를) 삭제하시겠습니까? 이 작업은
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
