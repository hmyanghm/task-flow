"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  CalendarDays,
  BarChart3,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Document } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const sourceTypeLabels: Record<string, string> = {
  daily_summary: "일일 요약",
  weekly_report: "주간 리포트",
  category_report: "카테고리 리포트",
};

const sourceTypeBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  daily_summary: "default",
  weekly_report: "secondary",
  category_report: "outline",
};

export default function DocsPage() {
  const { data: docs, isLoading } = useSWR<Document[]>("/api/docs", fetcher);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: selectedDoc } = useSWR<Document>(
    selectedId ? `/api/docs?id=${selectedId}` : null,
    fetcher
  );

  const handleGenerate = async (
    sourceType: "daily_summary" | "weekly_report" | "category_report"
  ) => {
    setGenerating(sourceType);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType }),
      });
      if (res.ok) {
        const newDoc = await res.json();
        mutate("/api/docs");
        setSelectedId(newDoc.id);
      }
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/docs?id=${id}`, { method: "DELETE" });
      if (selectedId === id) setSelectedId(null);
      mutate("/api/docs");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">문서</h1>
          {docs && (
            <Badge variant="secondary" className="ml-1">
              {docs.length}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleGenerate("daily_summary")}
            disabled={generating !== null}
          >
            {generating === "daily_summary" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="mr-1.5 h-4 w-4" />
            )}
            일일 요약
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleGenerate("weekly_report")}
            disabled={generating !== null}
          >
            {generating === "weekly_report" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-1.5 h-4 w-4" />
            )}
            주간 리포트
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleGenerate("category_report")}
            disabled={generating !== null}
          >
            {generating === "category_report" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="mr-1.5 h-4 w-4" />
            )}
            카테고리 리포트
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document list (left) */}
        <div className="w-80 flex-shrink-0 border-r">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !docs || docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    문서가 없습니다
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    위 버튼으로 문서를 생성하세요
                  </p>
                </div>
              ) : (
                docs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full rounded-lg p-3 text-left transition-colors ${
                      selectedId === doc.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {doc.title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge
                            variant={
                              sourceTypeBadgeVariant[doc.sourceType] ||
                              "secondary"
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {sourceTypeLabels[doc.sourceType] || doc.sourceType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(doc.createdAt), "M월 d일", {
                              locale: ko,
                            })}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        disabled={deleting === doc.id}
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Document content (right) */}
        <div className="flex-1 overflow-hidden">
          {selectedDoc ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">{selectedDoc.title}</h2>
                  <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                    <Badge
                      variant={
                        sourceTypeBadgeVariant[selectedDoc.sourceType] ||
                        "secondary"
                      }
                    >
                      {sourceTypeLabels[selectedDoc.sourceType] ||
                        selectedDoc.sourceType}
                    </Badge>
                    <span>
                      {format(
                        new Date(selectedDoc.createdAt),
                        "yyyy년 M월 d일 HH:mm",
                        { locale: ko }
                      )}
                    </span>
                  </div>
                </div>
                <Separator className="mb-6" />
                <article className="prose prose-neutral dark:prose-invert max-w-none">
                  <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                </article>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FileText className="h-16 w-16 text-muted-foreground/30" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                문서를 선택하세요
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                왼쪽 목록에서 문서를 선택하거나 새 문서를 생성하세요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
