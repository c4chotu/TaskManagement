import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddComment, useComments, useIssue, useProject, useStatuses, useTask,
  useAckIssue, useResolveIssue, useStartTimer, useStopTimer, useTimeEntries,
  useUsers, useRoutingHistory,
} from "@/lib/queries";
import { toast } from "sonner";
import { SlaCountdown } from "@/components/tfp/sla";
import { findUser } from "@/lib/mock-data";
import {
  ArrowLeft, Clock, Calendar, FolderKanban, MessageSquare,
  Play, Square, History, Paperclip, AlertTriangle, CheckCircle, Shield,
  Timer, User2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { SeverityBadge } from "@/components/tfp/badges";
import { AttachmentsPanel } from "@/components/tfp/attachments-panel";
import { TaskStatusSelect, TaskAssignPopover } from "@/components/tfp/task-quick-edit";

export const Route = createFileRoute("/_app/incidents/$id")({
  component: IssueDetail,
});

const SEV_COLORS: Record<string, string> = {
  SEV0: "border-red-500 bg-red-50 text-red-700",
  SEV1: "border-orange-400 bg-orange-50 text-orange-700",
  SEV2: "border-yellow-400 bg-yellow-50 text-yellow-700",
  SEV3: "border-blue-400 bg-blue-50 text-blue-700",
};

function IssueDetail() {
  const { id } = Route.useParams();
  const { data: task } = useTask(id);
  const { data: issue } = useIssue(id);
  const { data: project } = useProject(task?.projectId);
  const { data: statuses = [] } = useStatuses();
  const { data: comments = [] } = useComments(id);
  const { data: users = [] } = useUsers();
  const { data: timeEntries = [] } = useTimeEntries();
  const { data: history = [] } = useRoutingHistory(id);

  const addComment = useAddComment();
  const ackIssue = useAckIssue();
  const resolveIssue = useResolveIssue();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  const [body, setBody] = useState("");
  const runningEntry = timeEntries.find((te) => te.taskId === id && !te.endTime);
  const taskEntries = timeEntries.filter((e) => e.taskId === id);
  const totalLogged = taskEntries.reduce((s, e) => s + (e.hours ?? 0), 0);

  if (!task || !issue) {
    return (
      <>
        <Topbar title="Incident" />
        <main className="p-6">
          <Card className="p-8 text-center text-sm text-muted-foreground">Incident not found.</Card>
        </main>
      </>
    );
  }

  const status = statuses.find((s) => s.id === task.statusId);
  const isResolved = issue.resolved;
  const isAcknowledged = issue.acknowledged;

  return (
    <>
      <Topbar title={task.title} />
      <main className="flex-1 p-6">
        <Link to="/incidents" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All incidents
        </Link>

        {/* Header banner */}
        <div className={`mb-6 flex items-start justify-between rounded-xl border-l-4 p-5 ${SEV_COLORS[issue.severity] ?? "border-gray-400 bg-gray-50"}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={issue.severity} />
              {task.displayId && <span className="font-mono text-xs opacity-70">{task.displayId}</span>}
            </div>
            <h1 className="text-lg font-bold">{task.title}</h1>
            {task.description && <p className="mt-1 text-sm opacity-80">{task.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {!isAcknowledged && !isResolved && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => { ackIssue.mutate(id); toast.success("Incident acknowledged"); }}>
                <CheckCircle className="h-3.5 w-3.5 text-yellow-600" /> Acknowledge
              </Button>
            )}
            {isAcknowledged && !isResolved && (
              <Button size="sm" className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => { resolveIssue.mutate({ issueId: id, rootCause: "", resolution: "" }); toast.success("Incident resolved"); }}>
                <Shield className="h-3.5 w-3.5" /> Mark Resolved
              </Button>
            )}
            {isResolved && (
              <Badge className="bg-green-100 text-green-700 border-green-300 text-xs border">✓ Resolved</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* LEFT — main content */}
          <div className="space-y-4">
            {/* SLA clocks */}
            <div className="grid gap-4 sm:grid-cols-2">
              <SlaCountdown label="Response SLA" target={issue.slaTargetResponse} done={issue.acknowledged} />
              <SlaCountdown label="Fix SLA" target={issue.slaTargetFix} done={issue.resolved} />
            </div>

            {/* Incident Details */}
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Incident Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Environment" value={issue.environment} />
                <Field label="Affected Version" value={issue.affectedVersion ?? "—"} />
                <Field label="SLA Breached" value={issue.slaBreached ? <Badge variant="destructive" className="text-[10px]">Yes</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>} />
                <Field label="Customer Reported" value={issue.customerReported ? "Yes" : "No"} />
                {issue.customerName && <Field label="Customer Name" value={issue.customerName} />}
                {issue.customerImpact && <div className="sm:col-span-2"><Field label="Customer Impact" value={issue.customerImpact} /></div>}
              </div>
            </Card>

            {/* Root cause & Resolution */}
            {(issue.rootCause || issue.resolution) && (
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-semibold">Post-Mortem</h3>
                {issue.rootCause && <Field label="Root Cause" value={issue.rootCause} />}
                {issue.resolution && <Field label="Resolution" value={issue.resolution} />}
              </Card>
            )}

            {/* Tabs: Comments / History / Attachments / Time */}
            <Card className="p-5">
              <Tabs defaultValue="comments">
                <TabsList className="mb-4">
                  <TabsTrigger value="comments" className="text-xs gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs gap-1.5"><History className="h-3.5 w-3.5" /> Assignment History</TabsTrigger>
                  <TabsTrigger value="attachments" className="text-xs gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Attachments</TabsTrigger>
                  <TabsTrigger value="timelog" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" /> Time Log</TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="space-y-4">
                  {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
                  {comments.map((c) => {
                    const u = findUser(c.userId);
                    return (
                      <div key={c.id} className="flex gap-3">
                        <Avatar className="h-7 w-7 border border-border shrink-0">
                          <AvatarFallback className="bg-muted text-[10px]">{u?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold">{u?.name}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                          </div>
                          <div className="mt-1 rounded-md bg-muted/40 px-3 py-2 text-sm">{c.content}</div>
                        </div>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="space-y-2">
                    <Textarea placeholder="Write a comment…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
                    <Button size="sm" onClick={async () => { if (!body.trim()) return; await addComment.mutateAsync({ taskId: id, content: body }); setBody(""); toast.success("Comment posted"); }} className="bg-gradient-primary text-primary-foreground">
                      Post Comment
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  {history.length === 0 ? <p className="text-xs text-muted-foreground">No assignment history.</p> : (
                    <div className="space-y-3">
                      {history.map((h) => {
                        const prev = h.previousAssigneeId ? users.find((u) => u.id === h.previousAssigneeId) : null;
                        const next = users.find((u) => u.id === h.newAssigneeId);
                        return (
                          <div key={h.id} className="border-l-2 border-primary/30 pl-3">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>via {h.assignedBy}</span>
                              <span>{formatDistanceToNow(new Date(h.assignedAt), { addSuffix: true })}</span>
                            </div>
                            <p className="mt-0.5 text-xs font-medium">{prev?.name ?? "Unassigned"} → {next?.name ?? "Unassigned"}</p>
                            {h.reason && <p className="mt-0.5 text-[10px] text-muted-foreground">{h.reason}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attachments">
                  <AttachmentsPanel taskId={id} />
                </TabsContent>

                <TabsContent value="timelog">
                  {taskEntries.length === 0 ? <p className="text-xs text-muted-foreground">No time entries yet.</p> : (
                    <div className="space-y-2">
                      {taskEntries.map((e) => (
                        <div key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                          <div>
                            <p className="text-xs font-medium">{e.description ?? "Time entry"}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(e.startTime), "MMM d, yyyy · h:mm a")}</p>
                          </div>
                          <span className="font-mono text-sm font-bold text-primary">{e.hours ?? 0}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-4">
            <Card className="p-4">
              <h4 className="mb-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Details</h4>
              <dl className="space-y-3">
                {status && <Row label="Status" value={<TaskStatusSelect task={task} compact />} />}
                <Row label="Severity" value={<SeverityBadge severity={issue.severity} />} />
                <Row label="Project" value={
                  project ? <Link to="/projects/$id" params={{ id: project.id }} className="inline-flex items-center gap-1 text-primary hover:underline text-xs"><FolderKanban className="h-3 w-3" />{project.name}</Link> : "—"
                } />
                <Row label="Created" value={<span className="text-xs">{format(new Date(task.createdAt), "MMM d, yyyy")}</span>} />
                {task.dueDate && <Row label="Due" value={<span className="inline-flex items-center gap-1 text-xs"><Calendar className="h-3 w-3" />{format(new Date(task.dueDate), "MMM d, yyyy")}</span>} />}
                <Row label="Acknowledged" value={issue.acknowledged ? <Badge className="bg-green-100 text-green-700 text-[10px]">Yes</Badge> : <Badge variant="secondary" className="text-[10px]">No</Badge>} />
                <Row label="Resolved" value={issue.resolved ? <Badge className="bg-green-100 text-green-700 text-[10px]">Yes</Badge> : <Badge variant="secondary" className="text-[10px]">No</Badge>} />
              </dl>
            </Card>

            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Assignees</h4>
                <TaskAssignPopover task={task} />
              </div>
              <div className="space-y-2">
                {task.assigneeIds.map((uid) => {
                  const u = findUser(uid);
                  return (
                    <div key={uid} className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 border border-border"><AvatarFallback className="bg-muted text-[10px]">{u?.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div><p className="text-xs font-medium">{u?.name}</p><p className="text-[10px] text-muted-foreground">{u?.roleName}</p></div>
                    </div>
                  );
                })}
                {task.assigneeIds.length === 0 && <p className="text-xs text-muted-foreground">Unassigned</p>}
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" /> Time Tracking
              </h4>
              <p className="text-xs text-muted-foreground">{totalLogged.toFixed(1)}h logged total</p>
              {runningEntry ? (
                <Button size="sm" variant="destructive" className="w-full gap-1.5" onClick={async () => { await stopTimer.mutateAsync(runningEntry.id); toast.success("Timer stopped"); }}>
                  <Square className="h-3 w-3" /> Stop Timer
                </Button>
              ) : (
                <Button size="sm" className="w-full gap-1.5 bg-gradient-primary text-primary-foreground" onClick={async () => { await startTimer.mutateAsync(id); toast.success("Timer started"); }}>
                  <Play className="h-3 w-3" /> Start Timer
                </Button>
              )}
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-xs">{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
