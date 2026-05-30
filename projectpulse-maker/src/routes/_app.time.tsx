import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useCurrentTimesheet,
  useSubmitTimesheet,
  useApproveTimesheet,
  useMyAssignedTasks,
  useBulkLogTime,
  useTimeEntries,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Clock, CheckCircle, ChevronLeft, ChevronRight, Layers, Send, RotateCcw } from "lucide-react";
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from "date-fns";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/_app/time")({
  head: () => ({ meta: [{ title: "Timesheet — TaskFlow Pro" }] }),
  component: TimesheetCalendarPage,
});

type DayHours = Record<string, Record<string, number>>; // taskId → dateStr → hours

function TimesheetCalendarPage() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [hours, setHours] = useState<DayHours>({});
  const [saving, setSaving] = useState(false);

  const { data: timesheet } = useCurrentTimesheet();
  const { data: assignedTasks = [] } = useMyAssignedTasks();
  const { data: entries = [] } = useTimeEntries();
  const submitTimesheet = useSubmitTimesheet();
  const approveTimesheet = useApproveTimesheet();
  const bulkLog = useBulkLogTime();

  const isApprover = (user?.roleLevel ?? 0) >= 3;

  // Build week columns
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 }); // Mon
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Get existing logged hours per task per day from entries
  const loggedMap = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const e of entries) {
      if (!e.taskId) continue;
      const d = format(new Date(e.startTime), "yyyy-MM-dd");
      if (!m[e.taskId]) m[e.taskId] = {};
      m[e.taskId][d] = (m[e.taskId][d] ?? 0) + (e.hours ?? 0);
    }
    return m;
  }, [entries]);

  const setHoursCell = (taskId: string, date: string, val: string) => {
    const n = parseFloat(val);
    setHours((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] ?? {}), [date]: isNaN(n) ? 0 : n },
    }));
  };

  const totalForTask = (task: Task) => {
    const inputSum = Object.values(hours[task.id] ?? {}).reduce((a, b) => a + b, 0);
    const loggedSum = Object.values(loggedMap[task.id] ?? {}).reduce((a, b) => a + b, 0);
    return inputSum + loggedSum;
  };

  const weekTotal = assignedTasks.reduce((sum, t) => sum + totalForTask(t), 0);

  // Bulk fill a task across Mon–Fri
  const bulkFillTask = (taskId: string, hoursPerDay: number) => {
    const updates: Record<string, number> = {};
    days.slice(0, 5).forEach((d) => {
      updates[format(d, "yyyy-MM-dd")] = hoursPerDay;
    });
    setHours((prev) => ({ ...prev, [taskId]: { ...(prev[taskId] ?? {}), ...updates } }));
  };

  const handleSave = async () => {
    const payload: { taskId: string; date: string; hours: number }[] = [];
    for (const [taskId, dateMap] of Object.entries(hours)) {
      for (const [date, h] of Object.entries(dateMap)) {
        if (h > 0) payload.push({ taskId, date, hours: h });
      }
    }
    if (payload.length === 0) return toast.error("No hours to log.");
    setSaving(true);
    try {
      await bulkLog.mutateAsync(payload);
      setHours({});
      toast.success(`Logged ${payload.length} time entries.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log time.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Timesheet" />
      <main className="flex-1 space-y-5 p-6 overflow-auto">

        {/* ── Week navigator + status bar ── */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setWeekOffset((w) => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium tabular-nums">
              {format(weekStart, "MMM d")} — {format(days[6], "MMM d, yyyy")}
            </span>
            <Button size="icon" variant="ghost" onClick={() => setWeekOffset((w) => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setWeekOffset(0)}>
                <RotateCcw className="mr-1 h-3 w-3" /> Today
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {timesheet && (
              <Badge
                className={
                  timesheet.status === "APPROVED"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : timesheet.status === "SUBMITTED"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }
              >
                {timesheet.status}
              </Badge>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || bulkLog.isPending}
            >
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Hours"}
            </Button>

            {timesheet?.status === "PLANNING" && !isApprover && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await submitTimesheet.mutateAsync(timesheet.id);
                  toast.success("Timesheet submitted for approval.");
                }}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Submit
              </Button>
            )}
            {timesheet?.status === "SUBMITTED" && isApprover && (
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/40 text-emerald-400"
                onClick={async () => {
                  await approveTimesheet.mutateAsync(timesheet.id);
                  toast.success("Timesheet approved.");
                }}
              >
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
              </Button>
            )}
          </div>
        </div>

        {/* ── Calendar Grid ── */}
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="sticky left-0 bg-card z-10 px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[200px]">
                  Task
                </th>
                {days.map((d, i) => (
                  <th
                    key={i}
                    className={`px-3 py-3 text-center text-xs font-semibold min-w-[90px] ${
                      isSameDay(d, new Date())
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div>{dayLabels[i]}</div>
                    <div className={`text-[10px] mt-0.5 ${isSameDay(d, new Date()) ? "text-primary" : "text-muted-foreground/60"}`}>
                      {format(d, "MMM d")}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground min-w-[70px]">
                  Total
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-muted-foreground min-w-[110px]">
                  Bulk Fill
                </th>
              </tr>
            </thead>
            <tbody>
              {assignedTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                    <Layers className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No tasks assigned to you yet.
                  </td>
                </tr>
              ) : (
                assignedTasks.map((task) => (
                  <tr key={task.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="sticky left-0 bg-card px-4 py-2.5">
                      <div className="flex items-start gap-2">
                        <div>
                          {(task as any).displayId && (
                            <span className="text-[10px] font-mono text-primary/70 block">
                              {(task as any).displayId}
                            </span>
                          )}
                          <p className="text-xs font-medium leading-snug line-clamp-2">{task.title}</p>
                        </div>
                      </div>
                    </td>

                    {days.map((d, i) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const logged = loggedMap[task.id]?.[dateStr] ?? 0;
                      const inputVal = hours[task.id]?.[dateStr] ?? 0;
                      const isWeekend = i >= 5;

                      return (
                        <td key={i} className={`px-2 py-2 text-center ${isWeekend ? "bg-muted/10" : ""}`}>
                          {logged > 0 ? (
                            <div className="text-xs text-emerald-400 font-mono font-semibold">
                              {logged.toFixed(1)}h
                            </div>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              max={24}
                              step={0.5}
                              className={`h-7 w-16 text-center text-xs tabular-nums px-1 mx-auto
                                ${inputVal > 0 ? "border-primary/60 text-primary" : ""}
                                ${isWeekend ? "opacity-50" : ""}`}
                              placeholder="0"
                              value={inputVal > 0 ? inputVal : ""}
                              onChange={(e) => setHoursCell(task.id, dateStr, e.target.value)}
                            />
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-mono font-semibold tabular-nums ${
                        totalForTask(task) > 0 ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {totalForTask(task).toFixed(1)}h
                      </span>
                    </td>

                    <td className="px-2 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-6 px-2 text-muted-foreground hover:text-primary"
                        onClick={() => bulkFillTask(task.id, 8)}
                      >
                        8h × Mon–Fri
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* ── Week totals footer ── */}
            {assignedTasks.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td className="sticky left-0 bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Daily Total
                  </td>
                  {days.map((d, i) => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const dayTotal = assignedTasks.reduce((sum, t) => {
                      const logged = loggedMap[t.id]?.[dateStr] ?? 0;
                      const input = hours[t.id]?.[dateStr] ?? 0;
                      return sum + logged + input;
                    }, 0);
                    return (
                      <td key={i} className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-mono font-bold tabular-nums ${
                          dayTotal > 8 ? "text-destructive" : dayTotal > 0 ? "text-primary" : "text-muted-foreground/40"
                        }`}>
                          {dayTotal > 0 ? dayTotal.toFixed(1) + "h" : "—"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-mono font-bold text-primary tabular-nums">
                      {weekTotal.toFixed(1)}h
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </Card>

        {/* ── Legend ── */}
        <div className="flex gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
            Already logged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-primary/20 border border-primary/40" />
            Pending save
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-muted/50 border border-border" />
            Weekend
          </span>
        </div>

      </main>
    </>
  );
}
