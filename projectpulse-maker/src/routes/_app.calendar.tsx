import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTasks, useUpdateTask } from "@/lib/queries";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
} from "date-fns";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { TaskCreateDialog } from "@/components/tfp/task-create-dialog";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — TaskFlow Pro" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const update = useUpdateTask();
  const [cursor, setCursor] = useState(new Date());
  const [dragId, setDragId] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor]);

  return (
    <>
      <Topbar title="Calendar" actions={<TaskCreateDialog />} />
      <main className="flex-1 space-y-4 p-6">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">{format(cursor, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setCursor(addMonths(cursor, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setCursor(new Date())}
              >
                Today
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setCursor(addMonths(cursor, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="bg-muted/40 px-2 py-1.5 text-[10px] font-mono uppercase text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {days.map((d) => {
              const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), d));
              const inMonth = isSameMonth(d, cursor);
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={d.toISOString()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async () => {
                    if (!dragId) return;
                    await update.mutateAsync({ id: dragId, patch: { dueDate: d.toISOString() } });
                    toast.success(`Rescheduled to ${format(d, "MMM d")}`);
                    setDragId(null);
                  }}
                  className={`min-h-24 bg-card p-1.5 transition ${inMonth ? "" : "opacity-50"} ${isToday ? "ring-1 ring-inset ring-primary" : ""}`}
                >
                  <div
                    className={`mb-1 text-[10px] font-mono ${isToday ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {format(d, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 4).map((t) => (
                      <Link
                        key={t.id}
                        to="/tasks/$id"
                        params={{ id: t.id }}
                        draggable
                        onDragStart={() => setDragId(t.id)}
                        className={`block truncate rounded px-1.5 py-0.5 text-[10px] hover:opacity-80 ${t.taskType === "ISSUE" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-foreground"}`}
                      >
                        {t.taskType === "ISSUE" && (
                          <AlertOctagon className="mr-0.5 inline h-2.5 w-2.5" />
                        )}
                        {t.title}
                      </Link>
                    ))}
                    {dayTasks.length > 4 && (
                      <div className="px-1 text-[10px] text-muted-foreground">
                        +{dayTasks.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <p className="text-xs text-muted-foreground">
          Tip: drag any task or incident card to a different day to reschedule. Changes are
          persisted via the REST API.
        </p>
      </main>
    </>
  );
}
