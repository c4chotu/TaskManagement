import { useMemo, useRef, useState } from "react";
import { format, addDays, differenceInDays, startOfDay, isToday, isBefore, isAfter } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CalendarRange } from "lucide-react";
import type { Task, CustomTaskStatus } from "@/lib/types";
import { findUser } from "@/lib/mock-data";
import { Link } from "@tanstack/react-router";

interface GanttChartProps {
  tasks: Task[];
  statuses: CustomTaskStatus[];
  projects?: { id: string; name: string }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  FRONTEND: "from-violet-500 to-purple-500",
  BACKEND: "from-blue-500 to-indigo-500",
  INFRA: "from-slate-500 to-slate-600",
  DESIGN: "from-pink-500 to-rose-500",
  QA: "from-amber-500 to-yellow-500",
  SECURITY: "from-red-500 to-orange-500",
  DOCS: "from-teal-500 to-cyan-500",
  RESEARCH: "from-lime-500 to-green-500",
  BUG: "from-red-600 to-red-400",
  FEATURE: "from-emerald-500 to-green-500",
};

const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 56;

export function GanttChart({ tasks, statuses, projects = [] }: GanttChartProps) {
  const [zoom, setZoom] = useState(1); // 0.5 = compressed, 1 = normal, 2 = expanded
  const [offsetDays, setOffsetDays] = useState(-7); // days from today to start
  const scrollRef = useRef<HTMLDivElement>(null);

  const DAY_WIDTH = Math.round(40 * zoom);
  const VISIBLE_DAYS = Math.round(30 / zoom) + 7;

  const startDate = useMemo(() => addDays(startOfDay(new Date()), offsetDays), [offsetDays]);
  const days = useMemo(() => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(startDate, i)), [startDate, VISIBLE_DAYS]);

  const ganttTasks = useMemo(() => {
    return tasks.filter(t => t.taskType === "TASK" && t.dueDate);
  }, [tasks]);

  const getTaskBar = (task: Task) => {
    const start = task.createdAt ? startOfDay(new Date(task.createdAt)) : startDate;
    const end = task.dueDate ? startOfDay(new Date(task.dueDate)) : addDays(start, 3);

    const startOffset = differenceInDays(start, startDate);
    const duration = Math.max(differenceInDays(end, start), 1);

    const left = startOffset * DAY_WIDTH;
    const width = duration * DAY_WIDTH;
    const pct = task.estimatedHours && task.loggedHours
      ? Math.min(Math.round((task.loggedHours / task.estimatedHours) * 100), 100)
      : task.statusId === "s-done" ? 100 : 0;

    return { left, width, pct, start, end };
  };

  const todayOffset = differenceInDays(startOfDay(new Date()), startDate) * DAY_WIDTH;
  const status = (id: string) => statuses.find(s => s.id === id);
  const project = (id: string) => projects.find(p => p.id === id);

  return (
    <div className="flex flex-col rounded-2xl border border-emerald-500/15 bg-card/60 backdrop-blur-sm shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">Gantt Timeline</span>
          <Badge variant="outline" className="text-[10px] font-mono">{ganttTasks.length} tasks</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOffsetDays(d => d - 14)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOffsetDays(-7)}>
            Today
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOffsetDays(d => d + 14)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border/60 mx-1" />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.min(z + 0.25, 2))} title="Zoom In">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex overflow-hidden">
        {/* Left sidebar: task names */}
        <div className="shrink-0 w-60 border-r border-border/50 flex flex-col">
          {/* Sidebar header */}
          <div
            className="flex items-center px-4 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-muted/30"
            style={{ height: HEADER_HEIGHT }}
          >
            Task
          </div>
          {/* Task rows */}
          <div className="overflow-y-auto">
            {ganttTasks.map(task => {
              const st = status(task.statusId);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 px-3 border-b border-border/30 hover:bg-muted/20 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: st?.color ?? "#ccc" }} />
                  <div className="flex-1 min-w-0">
                    <Link to="/tasks/$id" params={{ id: task.id }} className="text-xs font-medium text-foreground hover:text-primary truncate block">
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5">
                      {task.category && (
                        <span className="text-[9px] text-muted-foreground font-mono uppercase">{task.category}</span>
                      )}
                      {task.priority && (
                        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[task.priority] ?? "bg-muted"}`} />
                      )}
                    </div>
                  </div>
                  {task.assigneeIds[0] && (
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                        {findUser(task.assigneeIds[0])?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: timeline area */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ width: VISIBLE_DAYS * DAY_WIDTH, minWidth: "100%" }}>
            {/* Day headers */}
            <div className="flex border-b border-border/50 bg-muted/20 sticky top-0 z-10" style={{ height: HEADER_HEIGHT }}>
              {days.map((day, i) => {
                const isSat = day.getDay() === 6;
                const isSun = day.getDay() === 0;
                const today = isToday(day);
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center text-center shrink-0 border-r border-border/20 ${
                      today ? "bg-emerald-500/10" : isSat || isSun ? "bg-muted/40" : ""
                    }`}
                    style={{ width: DAY_WIDTH }}
                  >
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${today ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {format(day, "EEE")}
                    </span>
                    <span className={`text-[11px] font-mono mt-0.5 ${today ? "text-emerald-600 font-bold" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    {i === 0 || day.getDate() === 1 ? (
                      <span className="text-[8px] text-muted-foreground">{format(day, "MMM")}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Task bar rows */}
            <div className="relative">
              {/* Today vertical line */}
              {todayOffset >= 0 && todayOffset <= VISIBLE_DAYS * DAY_WIDTH && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-500/60 z-20 pointer-events-none"
                  style={{ left: todayOffset + DAY_WIDTH / 2 }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              )}

              {ganttTasks.map((task, rowIdx) => {
                const { left, width, pct } = getTaskBar(task);
                const st = status(task.statusId);
                const gradKey = task.category ?? "FEATURE";
                const gradient = CATEGORY_COLORS[gradKey] ?? "from-emerald-500 to-teal-500";
                const isDone = task.statusId === "s-done";
                const isBlocked = task.statusId === "s-blocked";

                return (
                  <div
                    key={task.id}
                    className="relative border-b border-border/20 hover:bg-muted/10 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Vertical grid lines */}
                    {days.map((day, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 border-r border-border/10 ${
                          day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/20" : ""
                        }`}
                        style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                      />
                    ))}

                    {/* Task bar */}
                    {left + width > 0 && left < VISIBLE_DAYS * DAY_WIDTH && (
                      <Link
                        to="/tasks/$id"
                        params={{ id: task.id }}
                        className={`absolute top-1/2 -translate-y-1/2 rounded-lg h-7 flex items-center overflow-hidden cursor-pointer group transition-all hover:scale-y-110 hover:shadow-lg z-10 ${
                          isDone ? "opacity-60" : ""
                        }`}
                        style={{ left: Math.max(left, 0), width: Math.min(width, VISIBLE_DAYS * DAY_WIDTH - left) }}
                      >
                        {/* Bar gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-90 ${isBlocked ? "animate-pulse" : ""}`} />
                        {/* Progress overlay */}
                        <div
                          className="absolute inset-y-0 left-0 bg-black/20"
                          style={{ width: `${pct}%` }}
                        />
                        {/* Text */}
                        <div className="relative z-10 flex items-center gap-1.5 px-2 min-w-0">
                          {task.displayId && (
                            <span className="text-[8px] font-mono text-white/70 shrink-0">{task.displayId}</span>
                          )}
                          <span className="text-[10px] font-semibold text-white truncate">{task.title}</span>
                          {task.storyPoints && (
                            <span className="shrink-0 bg-white/20 rounded px-1 text-[8px] text-white font-bold">{task.storyPoints}pt</span>
                          )}
                        </div>
                        {/* Progress indicator tail */}
                        {pct > 0 && pct < 100 && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/90 z-20 shrink-0">
                            {pct}%
                          </div>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}

              {ganttTasks.length === 0 && (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  No tasks with due dates found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-t border-border/40 bg-muted/10">
        {Object.entries(CATEGORY_COLORS).slice(0, 6).map(([cat, grad]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-5 rounded-sm bg-gradient-to-r ${grad}`} />
            <span className="text-[9px] font-mono text-muted-foreground uppercase">{cat}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><div className="h-2 w-0.5 bg-emerald-500 rounded" /> Today</span>
          <span className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-black/20 bg-gradient-to-r from-emerald-500/60 to-teal-500/60" /> Progress</span>
        </div>
      </div>
    </div>
  );
}
