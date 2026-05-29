import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStartTimer, useStopTimer, useTasks, useTimeEntries, useCurrentTimesheet, useSubmitTimesheet, useApproveTimesheet } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { findUser } from "@/lib/mock-data";
import { Play, Square, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/time")({
  head: () => ({ meta: [{ title: "Time Tracking — TaskFlow Pro" }] }),
  component: TimePage,
});

function TimePage() {
  const { user } = useAuth();
  const { data: timesheet } = useCurrentTimesheet();
  const submitTimesheet = useSubmitTimesheet();
  const approveTimesheet = useApproveTimesheet();

  const { data: entries = [] } = useTimeEntries();
  const { data: tasks = [] } = useTasks();
  const stop = useStopTimer();
  const start = useStartTimer();

  const running = entries.find((e) => !e.endTime);
  const totalHours = entries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
  const billable = entries.filter((e) => e.billable).reduce((sum, e) => sum + (e.hours ?? 0), 0);

  const userLevel = user?.roleLevel ?? 0;
  const isApprover = userLevel >= 3;

  return (
    <>
      <Topbar title="Time Tracking" />
      <main className="flex-1 space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5 flex flex-col justify-between"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">This week</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totalHours.toFixed(1)}h</p></Card>
          <Card className="p-5 flex flex-col justify-between"><p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Billable</p><p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{billable.toFixed(1)}h</p></Card>
          <Card className="p-5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">Timesheet Status</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge className={
                  timesheet?.status === "APPROVED" ? "bg-primary/15 text-primary border border-primary/20" :
                  timesheet?.status === "SUBMITTED" ? "bg-info/15 text-info border border-info/20" :
                  "bg-warning/15 text-warning border border-warning/20"
                }>
                  {timesheet?.status ?? "PLANNING"}
                </Badge>
                {timesheet?.approvedBy && (
                  <span className="text-[10px] text-muted-foreground">by {timesheet.approvedBy}</span>
                )}
              </div>
            </div>
            {timesheet && (
              <div className="mt-3">
                {timesheet.status === "PLANNING" && !isApprover && (
                  <Button size="sm" className="w-full text-xs h-7 bg-gradient-primary text-primary-foreground"
                    onClick={async () => {
                      await submitTimesheet.mutateAsync(timesheet.id);
                      toast.success("Timesheet submitted for approval");
                    }}>
                    Submit for Approval
                  </Button>
                )}
                {timesheet.status === "SUBMITTED" && isApprover && (
                  <Button size="sm" className="w-full text-xs h-7 bg-gradient-primary text-primary-foreground"
                    onClick={async () => {
                      await approveTimesheet.mutateAsync(timesheet.id);
                      toast.success("Timesheet approved");
                    }}>
                    Approve Timesheet
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {running && (
          <Card className="flex items-center justify-between border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15"><Clock className="h-4 w-4 animate-pulse text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Currently tracking</p>
                <p className="text-sm font-medium">{tasks.find((t) => t.id === running.taskId)?.title}</p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={async () => { await stop.mutateAsync(running.id); toast.success("Timer stopped"); }}><Square className="mr-1 h-3 w-3" /> Stop</Button>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Recent entries</div>
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/20 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-2">Task</th><th className="px-4 py-2">User</th><th className="px-4 py-2">When</th><th className="px-4 py-2">Hours</th><th className="px-4 py-2">Billable</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const t = tasks.find((x) => x.id === e.taskId);
                const u = e.userId ? findUser(e.userId) : undefined;
                return (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="px-4 py-3"><p className="font-medium">{t?.title ?? "—"}</p>{e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}</td>
                    <td className="px-4 py-3 text-xs">{u?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.startTime), { addSuffix: true })}</td>
                    <td className="px-4 py-3 font-mono">{(e.hours ?? 0).toFixed(2)}h</td>
                    <td className="px-4 py-3">{e.billable ? <Badge variant="outline" className="border-primary/40 text-primary">Billable</Badge> : <span className="text-xs text-muted-foreground">No</span>}</td>
                    <td className="px-4 py-3 text-right">{!e.endTime && <Button size="sm" variant="ghost" onClick={() => stop.mutate(e.id)}>Stop</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Quick start</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.slice(0, 6).map((t) => (
              <Button key={t.id} variant="outline" size="sm" className="justify-start" onClick={async () => { await start.mutateAsync(t.id); toast.success(`Started: ${t.title}`); }}>
                <Play className="mr-2 h-3 w-3" /> {t.title}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">Period: {format(new Date(), "MMM d, yyyy")}</p>
        </Card>
      </main>
    </>
  );
}
