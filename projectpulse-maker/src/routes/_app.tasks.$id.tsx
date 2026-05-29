import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAddComment, useComments, useIssue, useProject, useStatuses, useTask } from "@/lib/queries";
import { findUser } from "@/lib/mock-data";
import { ArrowLeft, Clock, Calendar, FolderKanban, MessageSquare, Play, Square } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { SeverityBadge } from "@/components/tfp/badges";
import { useStartTimer, useStopTimer, useTimeEntries } from "@/lib/queries";
import { toast } from "sonner";
import { SlaCountdown } from "@/components/tfp/sla";

import { AttachmentsPanel } from "@/components/tfp/attachments-panel";
import { TaskStatusSelect, TaskAssignPopover } from "@/components/tfp/task-quick-edit";

export const Route = createFileRoute("/_app/tasks/$id")({
  head: () => ({ meta: [{ title: "Task — TaskFlow Pro" }] }),
  component: TaskDetail,
});

function TaskDetail() {
  const { id } = Route.useParams();
  const { data: task } = useTask(id);
  const { data: project } = useProject(task?.projectId);
  const { data: statuses = [] } = useStatuses();
  const { data: comments = [] } = useComments(id);
  const { data: issue } = useIssue(id);
  const addComment = useAddComment();
  const [body, setBody] = useState("");

  const { data: timeEntries = [] } = useTimeEntries();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const runningEntry = timeEntries.find((te) => te.taskId === id && !te.endTime);

  if (!task) return (<><Topbar title="Task" /><main className="p-6"><Card className="p-8 text-center text-sm text-muted-foreground">Task not found.</Card></main></>);
  const status = statuses.find((s) => s.id === task.statusId);

  return (
    <>
      <Topbar title={task.title} />
      <main className="flex-1 space-y-4 p-6">
        <Link to="/tasks" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All tasks
        </Link>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card className="p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">{task.id.toUpperCase()}</span>
                {task.taskType === "ISSUE" && issue && <SeverityBadge severity={issue.severity} />}
              </div>
              <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
              {task.description && <p className="mt-3 text-sm text-muted-foreground">{task.description}</p>}
            </Card>

            {issue && (
              <Card className="border-destructive/30 bg-destructive/5 p-5">
                <h3 className="mb-3 text-sm font-semibold">Incident details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Environment" value={issue.environment} />
                  <Field label="Affected version" value={issue.affectedVersion ?? "—"} />
                  <Field label="Customer reported" value={issue.customerReported ? `Yes · ${issue.customerName ?? ""}` : "No"} />
                  <Field label="Status" value={issue.resolved ? "Resolved" : issue.acknowledged ? "Acknowledged" : "Open"} />
                </div>
                {issue.customerImpact && (
                  <div className="mt-3 rounded border border-destructive/30 bg-background/40 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Customer impact: </span>{issue.customerImpact}
                  </div>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SlaCountdown label="Response SLA" target={issue.slaTargetResponse} done={issue.acknowledged} />
                  <SlaCountdown label="Fix SLA" target={issue.slaTargetFix} done={issue.resolved} />
                </div>
                {issue.rootCause && (
                  <div className="mt-4 space-y-2">
                    <Field label="Root cause" value={issue.rootCause} />
                    <Field label="Resolution" value={issue.resolution ?? ""} />
                  </div>
                )}
              </Card>
            )}

            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" /> Activity</h3>
              <div className="space-y-4">
                {comments.map((c) => {
                  const u = findUser(c.userId);
                  return (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-7 w-7 border border-border"><AvatarFallback className="bg-muted text-[10px]">{u?.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2"><span className="text-xs font-medium">{u?.name}</span><span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span></div>
                        <p className="mt-0.5 text-sm">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
                {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <Textarea placeholder="Write a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
                <Button size="sm" onClick={async () => {
                  if (!body.trim()) return;
                  await addComment.mutateAsync({ taskId: id, content: body });
                  setBody("");
                  toast.success("Comment posted");
                }} className="bg-gradient-primary text-primary-foreground">Post comment</Button>
              </div>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="p-4">
              <h4 className="mb-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Details</h4>
              <dl className="space-y-3 text-sm">
                {status && <Row label="Status" value={<TaskStatusSelect task={task} compact />} />}
                <Row label="Project" value={project ? <Link to="/projects/$id" params={{ id: project.id }} className="inline-flex items-center gap-1 text-primary hover:underline"><FolderKanban className="h-3 w-3" />{project.name}</Link> : "—"} />
                {task.priority && <Row label="Priority" value={<Badge variant="outline" className="text-[10px]">{task.priority}</Badge>} />}
                {task.dueDate && <Row label="Due" value={<span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(task.dueDate), "MMM d, yyyy")}</span>} />}
                <Row label="Created" value={format(new Date(task.createdAt), "MMM d, yyyy")} />
                <Row label="Hours" value={<span className="font-mono">{task.loggedHours ?? 0} / {task.estimatedHours ?? 0}h</span>} />
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
                    <div key={uid} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-border"><AvatarFallback className="bg-muted text-[10px]">{u?.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div><p className="text-xs font-medium">{u?.name}</p><p className="text-[10px] text-muted-foreground">{u?.roleName}</p></div>
                    </div>
                  );
                })}
                {task.assigneeIds.length === 0 && <p className="text-xs text-muted-foreground">Unassigned</p>}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="mb-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Attachments</h4>
              <AttachmentsPanel taskId={id} />
            </Card>


            <Card className="p-4">
              <h4 className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground"><Clock className="h-3 w-3" /> Time tracking</h4>
              {runningEntry ? (
                <Button size="sm" variant="destructive" className="w-full" onClick={async () => { await stopTimer.mutateAsync(runningEntry.id); toast.success("Timer stopped"); }}>
                  <Square className="mr-1 h-3 w-3" /> Stop timer
                </Button>
              ) : (
                <Button size="sm" className="w-full bg-gradient-primary text-primary-foreground" onClick={async () => { await startTimer.mutateAsync(id); toast.success("Timer started"); }}>
                  <Play className="mr-1 h-3 w-3" /> Start timer
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
  return (<div className="flex items-center justify-between gap-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-xs">{value}</dd></div>);
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (<div><p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-sm">{value}</p></div>);
}
