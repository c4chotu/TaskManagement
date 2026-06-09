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
import { findUser } from "@/lib/mock-data";
import {
  ArrowLeft, Clock, Calendar, FolderKanban, MessageSquare,
  Play, Square, History, Paperclip, AlertTriangle, CheckCircle, Shield,
  Timer, User2, ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { SeverityBadge } from "@/components/tfp/badges";
import { AttachmentsPanel } from "@/components/tfp/attachments-panel";
import { TaskStatusSelect, TaskAssignPopover } from "@/components/tfp/task-quick-edit";
import { renderContentWithImagesAndLinks } from "./_app.tasks.$id";

export const Route = createFileRoute("/_app/incidents/$id")({
  component: IssueDetail,
});

const SEV_BANNER_COLORS: Record<string, string> = {
  SEV0: "border-red-500/35 bg-gradient-to-tr from-red-600/10 via-red-600/5 to-transparent text-red-900 dark:text-red-200 shadow-red-500/5",
  SEV1: "border-orange-400/35 bg-gradient-to-tr from-orange-600/10 via-orange-600/5 to-transparent text-orange-900 dark:text-orange-200 shadow-orange-500/5",
  SEV2: "border-yellow-400/35 bg-gradient-to-tr from-yellow-600/10 via-yellow-600/5 to-transparent text-yellow-900 dark:text-yellow-200 shadow-yellow-500/5",
  SEV3: "border-blue-400/35 bg-gradient-to-tr from-blue-600/10 via-blue-600/5 to-transparent text-blue-900 dark:text-blue-200 shadow-blue-500/5",
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
      <main className="flex-1 p-6 space-y-4 max-w-7xl mx-auto w-full">
        <div>
          <Link to="/incidents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to incident board
          </Link>
        </div>

        {/* Header banner */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-border/80 border-l-4 p-5 backdrop-blur-md shadow-sm relative overflow-hidden ${SEV_BANNER_COLORS[issue.severity] ?? "border-gray-400/35 bg-gray-50/10"}`}>
          {/* Decorative subtle pulse shape */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-current opacity-[0.03] blur-xl pointer-events-none animate-pulse" />
          
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <SeverityBadge severity={issue.severity} />
              {task.displayId && <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-muted border border-border/60">{task.displayId}</span>}
              {issue.environment && <Badge variant="outline" className="text-[9px] uppercase tracking-wider">{issue.environment}</Badge>}
            </div>
            <h1 className="text-xl font-bold tracking-tight">{task.title}</h1>
            {task.description && <div className="text-xs text-muted-foreground leading-relaxed">{renderContentWithImagesAndLinks(task.description)}</div>}
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0 mt-4 md:mt-0">
            {!isAcknowledged && !isResolved && (
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-yellow-500/30 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover-lift transition-all" onClick={() => { ackIssue.mutate(id); toast.success("Incident acknowledged"); }}>
                <CheckCircle className="h-3.5 w-3.5" /> Acknowledge
              </Button>
            )}
            {isAcknowledged && !isResolved && (
              <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/15 hover-lift transition-all" onClick={() => { resolveIssue.mutate({ issueId: id, rootCause: "Acknowledged resolution", resolution: "Investigated and fixed" }); toast.success("Incident resolved"); }}>
                <Shield className="h-3.5 w-3.5" /> Mark Resolved
              </Button>
            )}
            {isResolved && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs py-1 px-3 rounded-full border font-bold">✓ Resolved</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* LEFT — main content */}
          <div className="space-y-6">
            {/* SLA clocks */}
            <div className="grid gap-4 sm:grid-cols-2">
              <CircularSlaClock label="Response SLA" target={issue.slaTargetResponse} done={issue.acknowledged} />
              <CircularSlaClock label="Fix SLA" target={issue.slaTargetFix} done={issue.resolved} />
            </div>

            {/* Incident Details */}
            <Card className="p-5 border border-border/60 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm hover:border-primary/15 transition-all">
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

            {/* Root cause & Resolution Post-Mortem */}
            {(issue.rootCause || issue.resolution) && (
              <div className="relative overflow-hidden rounded-2xl border border-border/80 border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent p-6 shadow-sm backdrop-blur-md">
                {/* Decorative document icon in background */}
                <div className="absolute right-4 top-4 text-emerald-500/10 pointer-events-none">
                  <CheckCircle className="h-12 w-12" />
                </div>
                
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Incident Post-Mortem & RCA
                </h3>

                <div className="space-y-4">
                  {issue.rootCause && (
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Root Cause</h4>
                      <p className="text-xs text-foreground/90 bg-background/40 border border-border/40 rounded-xl p-3.5 leading-relaxed font-mono whitespace-pre-wrap select-all">
                        {issue.rootCause}
                      </p>
                    </div>
                  )}
                  {issue.resolution && (
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resolution Details</h4>
                      <p className="text-xs text-foreground/90 bg-background/40 border border-border/40 rounded-xl p-3.5 leading-relaxed font-mono whitespace-pre-wrap select-all">
                        {issue.resolution}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs: Comments / History / Attachments / Time */}
            <Card className="p-5 border border-border/60 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm">
              <Tabs defaultValue="comments">
                <TabsList className="mb-4 bg-muted/40 p-1 rounded-xl">
                  <TabsTrigger value="comments" className="text-xs gap-1.5 rounded-lg"><MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs gap-1.5 rounded-lg"><History className="h-3.5 w-3.5" /> Assignment History</TabsTrigger>
                  <TabsTrigger value="attachments" className="text-xs gap-1.5 rounded-lg"><Paperclip className="h-3.5 w-3.5" /> Attachments</TabsTrigger>
                  <TabsTrigger value="timelog" className="text-xs gap-1.5 rounded-lg"><Clock className="h-3.5 w-3.5" /> Time Log</TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="space-y-4">
                  {comments.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground/80 italic">No comments yet. Be the first to note progress.</div>
                  )}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                    {comments.map((c) => {
                      const u = findUser(c.userId);
                      return (
                        <div key={c.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <Avatar className="h-8 w-8 border border-border shrink-0 shadow-sm">
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[10px] font-bold">
                              {u?.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{u?.name}</span>
                              <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                            </div>
                            <div className="rounded-2xl bg-muted/50 border border-border/40 px-3.5 py-2 text-xs text-foreground/90 max-w-[85%] leading-relaxed shadow-sm">
                              {renderContentWithImagesAndLinks(c.content)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Separator className="bg-border/60" />
                  <div className="space-y-3">
                    <Textarea 
                      placeholder="Share updates, links, or logs..." 
                      value={body} 
                      onChange={(e) => setBody(e.target.value)} 
                      rows={3} 
                      className="text-xs rounded-xl border border-border/60 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background/50 placeholder:text-muted-foreground/60 transition-all duration-300"
                    />
                    <Button 
                      size="sm" 
                      onClick={async () => { 
                        if (!body.trim()) return; 
                        await addComment.mutateAsync({ taskId: id, content: body }); 
                        setBody(""); 
                        toast.success("Comment posted"); 
                      }} 
                      className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl text-xs px-4 py-2 hover-lift transition-all duration-300"
                    >
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
                            <p className="mt-0.5 text-xs font-semibold">{prev?.name ?? "Unassigned"} → {next?.name ?? "Unassigned"}</p>
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
                        <div key={e.id} className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5 bg-background/30 hover:border-primary/20 transition-all">
                          <div>
                            <p className="text-xs font-semibold">{e.description ?? "Time entry"}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(e.startTime), "MMM d, yyyy · h:mm a")}</p>
                          </div>
                          <span className="font-mono text-sm font-extrabold text-primary">{e.hours ?? 0}h</span>
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
            <Card className="p-4 border border-border/60 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm">
              <h4 className="mb-3 text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground">Details</h4>
              <dl className="space-y-3.5">
                {status && <Row label="Status" value={<TaskStatusSelect task={task} compact />} />}
                <Row label="Severity" value={<SeverityBadge severity={issue.severity} />} />
                <Row label="Project" value={
                  project ? (
                    <Link to="/projects/$id" params={{ id: project.id }} className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold">
                      <FolderKanban className="h-3 w-3" />{project.name}
                    </Link>
                  ) : "—"
                } />
                <Row label="Created" value={<span className="text-xs font-semibold">{format(new Date(task.createdAt), "MMM d, yyyy")}</span>} />
                {task.dueDate && <Row label="Due" value={<span className="inline-flex items-center gap-1 text-xs font-semibold"><Calendar className="h-3 w-3" />{format(new Date(task.dueDate), "MMM d, yyyy")}</span>} />}
                <Row label="Acknowledged" value={issue.acknowledged ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">Yes</Badge> : <Badge variant="secondary" className="text-[10px]">No</Badge>} />
                <Row label="Resolved" value={issue.resolved ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">Yes</Badge> : <Badge variant="secondary" className="text-[10px]">No</Badge>} />
              </dl>
            </Card>

            <Card className="p-4 border border-border/60 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground">Assignees</h4>
                <TaskAssignPopover task={task} />
              </div>
              <div className="space-y-3">
                {task.assigneeIds.map((uid) => {
                  const u = findUser(uid);
                  return (
                    <div key={uid} className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-border shadow-sm">
                        <AvatarFallback className="bg-muted text-[10px] font-bold">{u?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-bold text-foreground">{u?.name}</p>
                        <p className="text-[9px] text-muted-foreground font-medium">{u?.roleName}</p>
                      </div>
                    </div>
                  );
                })}
                {task.assigneeIds.length === 0 && <p className="text-xs text-muted-foreground italic">Unassigned</p>}
              </div>
            </Card>

            {/* Stopwatch time tracker */}
            <StopwatchTimer 
              runningEntry={runningEntry} 
              totalLogged={totalLogged} 
              id={id} 
              startTimer={startTimer} 
              stopTimer={stopTimer} 
            />
          </aside>
        </div>
      </main>
    </>
  );
}

function CircularSlaClock({ label, target, done }: { label: string; target: string; done?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const targetTime = new Date(target).getTime();
  const diff = targetTime - now;
  const breached = !done && diff < 0;

  // Let's assume a total SLA duration of 4 hours (14,400,000 ms) for percentage tracking.
  const totalSlaTime = 4 * 3600 * 1000;
  const pct = done ? 100 : Math.max(0, Math.min(100, (diff / totalSlaTime) * 100));
  
  // Circular gauge SVG properties
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const fmt = (ms: number) => {
    const negative = ms < 0;
    const abs = Math.abs(ms);
    const secs = Math.floor(abs / 1000) % 60;
    const mins = Math.floor(abs / 60000) % 60;
    const hrs = Math.floor(abs / 3_600_000);
    return `${negative ? "-" : ""}${hrs}h ${mins}m ${secs}s`;
  };

  const ringColor = done 
    ? "stroke-emerald-500" 
    : breached 
      ? "stroke-red-500" 
      : pct < 25 
        ? "stroke-yellow-500 animate-pulse" 
        : "stroke-emerald-500/80";

  const glowColor = done 
    ? "border-emerald-500/20 bg-emerald-500/5" 
    : breached 
      ? "border-red-500/20 bg-red-500/5 animate-pulse" 
      : "border-border/80 bg-card/40 shadow-sm";

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 ${glowColor}`}>
      <div className="relative h-14 w-14 flex items-center justify-center shrink-0">
        <svg className="absolute transform -rotate-90 w-full h-full">
          <circle cx="28" cy="28" r={radius} className="stroke-muted/20 fill-none" strokeWidth="3.5" />
          <circle 
            cx="28" cy="28" r={radius} 
            className={`fill-none transition-all duration-500 ${ringColor}`} 
            strokeWidth="3.5" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[9px] font-bold font-mono tracking-tight text-foreground/80">
          {done ? "100%" : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="space-y-0.5">
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`text-sm font-bold font-mono tracking-tight ${done ? "text-emerald-500" : breached ? "text-red-500 animate-pulse" : "text-foreground"}`}>
          {done ? "MET" : fmt(diff)}
        </div>
        <div className="text-[9px] text-muted-foreground/85">
          {done ? "Completed in time" : breached ? "SLA BREACHED" : "remaining to target"}
        </div>
      </div>
    </div>
  );
}

function StopwatchTimer({ runningEntry, totalLogged, id, startTimer, stopTimer }: {
  runningEntry: any;
  totalLogged: number;
  id: string;
  startTimer: any;
  stopTimer: any;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!runningEntry) {
      setElapsed(0);
      return;
    }

    const start = new Date(runningEntry.startTime).getTime();
    setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));

    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [runningEntry]);

  const formatTimer = (totalSecs: number) => {
    const s = totalSecs % 60;
    const m = Math.floor(totalSecs / 60) % 60;
    const h = Math.floor(totalSecs / 3600);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="p-4 space-y-4 border border-border/60 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm hover:border-primary/20 transition-all">
      <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5 text-primary animate-pulse" /> Time Tracking
      </h4>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground font-medium">Logged Total</p>
          <p className="text-sm font-extrabold text-foreground">{totalLogged.toFixed(1)}h</p>
        </div>
        
        {runningEntry && (
          <div className="text-right space-y-0.5 animate-in fade-in duration-300">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" /> Live
            </span>
            <p className="text-sm font-mono font-extrabold text-red-500">{formatTimer(elapsed)}</p>
          </div>
        )}
      </div>

      {runningEntry ? (
        <Button 
          size="sm" 
          variant="destructive" 
          className="w-full gap-2 rounded-xl text-xs font-semibold py-2 hover-lift transition-all shadow-md shadow-red-500/15" 
          onClick={async () => { 
            await stopTimer.mutateAsync(runningEntry.id); 
            toast.success("Timer stopped and logged"); 
          }}
        >
          <Square className="h-3.5 w-3.5 fill-current" /> Stop Tracking
        </Button>
      ) : (
        <Button 
          size="sm" 
          className="w-full gap-2 rounded-xl text-xs font-semibold py-2 bg-gradient-primary text-primary-foreground hover-lift transition-all shadow-md shadow-primary/15" 
          onClick={async () => { 
            await startTimer.mutateAsync(id); 
            toast.success("Stopwatch session started"); 
          }}
        >
          <Play className="h-3.5 w-3.5 fill-current" /> Start Tracking
        </Button>
      )}
    </Card>
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
      <p className="text-[10px] font-bold font-mono uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-xs text-foreground/90 font-medium">{value}</div>
    </div>
  );
}
