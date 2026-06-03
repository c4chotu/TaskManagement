import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  useAddComment,
  useComments,
  useIssue,
  useProject,
  useStatuses,
  useTask,
  useStartTimer,
  useStopTimer,
  useTimeEntries,
  useUsers,
  useSuggestAssignee,
  useManuallyRouteTask,
  useRoutingHistory,
  useReassignTask,
  useDependencies,
  useUpdateTask,
  useAddDependency,
  useRemoveDependency,
  useTasks,
  useCreateTask,
} from "@/lib/queries";
import { toast } from "sonner";
import { SlaCountdown } from "@/components/tfp/sla";
import { findUser, mockIssues, mockAttachments } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, Clock, Calendar, FolderKanban, MessageSquare,
  Play, Pause, Route as RouteIcon, History, Paperclip,
  Link2, AlertTriangle, AlertOctagon, Timer, User as UserIcon, Plus, Zap, Check, CheckCircle2,
  Users, Trash2, ArrowUpRight, ArrowDownLeft, ShieldAlert, X, FileText, Info, CheckSquare, Layers
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { SeverityBadge } from "@/components/tfp/badges";
import { AttachmentsPanel } from "@/components/tfp/attachments-panel";
import { TaskStatusSelect } from "@/components/tfp/task-quick-edit";

export const Route = createFileRoute("/_app/tasks/$id")({
  head: () => ({ meta: [{ title: "Task Details — TaskFlow Pro" }] }),
  component: TaskDetail,
});

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-700 bg-red-50 border-red-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-yellow-700 bg-yellow-50 border-yellow-200",
  LOW: "text-blue-700 bg-blue-50 border-blue-200",
};

function TaskDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  
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

  const { data: suggestion } = useSuggestAssignee(id);
  const { data: routingHistory = [] } = useRoutingHistory(id);
  const manuallyRoute = useManuallyRouteTask();
  const reassign = useReassignTask();
  const { data: users = [] } = useUsers();
  
  // Dependencies & Follower queries and mutations
  const { data: allDeps = [] } = useDependencies(task?.projectId);
  const { data: projectTasks = [] } = useTasks(task?.projectId ? { projectId: task.projectId } : undefined);
  const updateTask = useUpdateTask();
  const addDependency = useAddDependency();
  const removeDependency = useRemoveDependency();
  const createTask = useCreateTask();

  // Manual time log state
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");

  // Create issue Dialog Modal state
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [newIssueSeverity, setNewIssueSeverity] = useState<"SEV0" | "SEV1" | "SEV2" | "SEV3">("SEV2");
  const [newIssueEnv, setNewIssueEnv] = useState<string>("Production");
  const [newIssueVersion, setNewIssueVersion] = useState<string>("");
  const [newIssueCustomerReported, setNewIssueCustomerReported] = useState<boolean>(false);
  const [newIssueCustomerName, setNewIssueCustomerName] = useState<string>("");
  const [newIssueCustomerImpact, setNewIssueCustomerImpact] = useState<string>("");
  const [issueFiles, setIssueFiles] = useState<Array<{ name: string; size: number; type: string }>>([]);

  // Live timer ticker state
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (runningEntry) {
      const start = new Date(runningEntry.startTime).getTime();
      const update = () => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [runningEntry]);

  if (!task)
    return (
      <>
        <Topbar title="Task" />
        <main className="p-6">
          <Card className="p-8 text-center text-sm text-muted-foreground animate-pulse">Task not found.</Card>
        </main>
      </>
    );

  const status = statuses.find((s) => s.id === task.statusId);
  const taskEntries = timeEntries.filter((e) => e.taskId === id);
  const totalLogged = taskEntries.reduce((s, e) => s + (e.hours ?? 0), 0);
  const progressPct = task.estimatedHours && task.estimatedHours > 0
    ? Math.min(Math.round((totalLogged / task.estimatedHours) * 100), 100)
    : 0;

  // Dependency filtering
  const predecessorDeps = allDeps.filter((d) => d.successorId === id);
  const successorDeps = allDeps.filter((d) => d.predecessorId === id);

  const handleLogTime = async () => {
    const h = parseFloat(logHours);
    if (isNaN(h) || h <= 0) { toast.error("Enter valid hours"); return; }
    await startTimer.mutateAsync(id);
    toast.success(`${h}h logged successfully`);
    setLogHours("");
    setLogDesc("");
  };

  const handleStartTimer = async () => {
    await startTimer.mutateAsync(id);
    toast.success("Timer started");
  };

  const handlePauseTimer = async () => {
    if (runningEntry) {
      await stopTimer.mutateAsync(runningEntry.id);
      toast.success("Timer paused & time saved");
    }
  };

  const handleSubmitTimer = async () => {
    if (runningEntry) {
      await stopTimer.mutateAsync(runningEntry.id);
      toast.success("Timer submitted successfully");
    } else {
      toast.info("No active timer to submit");
    }
  };

  const formatTimer = (totalSecs: number) => {
    const hh = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSecs % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const currentAssigneeId = task.assigneeIds[0] || "_none";
  const currentAssignee = users.find(u => u.id === currentAssigneeId);

  // Followers handlers
  const followerIds = task.followerIds || [];
  const followers = users.filter((u) => followerIds.includes(u.id));
  const nonFollowers = users.filter((u) => !followerIds.includes(u.id));

  const handleAddFollower = async (userId: string) => {
    if (followerIds.includes(userId)) return;
    await updateTask.mutateAsync({
      id: task.id,
      patch: { followerIds: [...followerIds, userId] }
    });
    toast.success("Follower added successfully");
  };

  const handleRemoveFollower = async (userId: string) => {
    await updateTask.mutateAsync({
      id: task.id,
      patch: { followerIds: followerIds.filter(fid => fid !== userId) }
    });
    toast.success("Follower removed");
  };

  // Dependencies handlers
  const availableTasks = projectTasks.filter(t => t.id !== id);
  const currentPredIds = predecessorDeps.map(d => d.predecessorId);
  const currentSuccIds = successorDeps.map(d => d.successorId);
  const availablePredTasks = availableTasks.filter(t => !currentPredIds.includes(t.id) && !currentSuccIds.includes(t.id));
  const availableSuccTasks = availableTasks.filter(t => !currentPredIds.includes(t.id) && !currentSuccIds.includes(t.id));

  const handleAddDependency = async (predecessorId: string, successorId: string) => {
    await addDependency.mutateAsync({ predecessorId, successorId, type: "FS" });
    toast.success("Dependency relation added");
  };

  const handleRemoveDependency = async (depId: string) => {
    await removeDependency.mutateAsync(depId);
    toast.success("Dependency relation removed");
  };

  const handleCreateAssociatedIssueSubmit = async () => {
    if (!newIssueTitle.trim()) {
      toast.error("Please enter an issue title");
      return;
    }
    try {
      const createdTask = await createTask.mutateAsync({
        title: newIssueTitle.trim(),
        description: newIssueDesc,
        projectId: task.projectId,
        taskType: "ISSUE",
        statusId: "s-todo",
        priority: "HIGH",
        parentTaskId: id,
      });

      // Pushing Issue detail details (mock db update)
      const newIssueObj = {
        id: `is-${Date.now()}`,
        taskId: createdTask.id,
        severity: newIssueSeverity,
        environment: newIssueEnv,
        affectedVersion: newIssueVersion || undefined,
        customerReported: newIssueCustomerReported,
        customerName: newIssueCustomerReported ? newIssueCustomerName : undefined,
        customerImpact: newIssueCustomerReported ? newIssueCustomerImpact : undefined,
        slaBreached: false,
        slaTargetResponse: new Date(Date.now() + 2 * 3600000).toISOString(),
        slaTargetFix: new Date(Date.now() + 8 * 3600000).toISOString(),
        acknowledged: false,
        resolved: false,
      };
      mockIssues.push(newIssueObj);

      // Pushing mock file attachments
      issueFiles.forEach((file) => {
        mockAttachments.push({
          id: `att-${Date.now()}-${Math.random()}`,
          taskId: createdTask.id,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          url: "#",
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.id || "u-owner",
        });
      });

      toast.success("Associated issue with SLA metrics and attachments created!");
      
      // Reset State
      setNewIssueTitle("");
      setNewIssueDesc("");
      setNewIssueSeverity("SEV2");
      setNewIssueEnv("Production");
      setNewIssueVersion("");
      setNewIssueCustomerReported(false);
      setNewIssueCustomerName("");
      setNewIssueCustomerImpact("");
      setIssueFiles([]);
      setIsCreateIssueOpen(false);
    } catch {
      toast.error("Failed to create associated issue.");
    }
  };

  // Associated issues and parents
  const associatedIssues = projectTasks.filter(t => t.taskType === "ISSUE" && t.parentTaskId === id);
  const availableIssuesToLink = projectTasks.filter(t => t.taskType === "ISSUE" && t.parentTaskId !== id && t.projectId === task.projectId);
  const associatedParentTask = task.parentTaskId ? projectTasks.find(t => t.id === task.parentTaskId) : null;
  const availableTasksToLink = projectTasks.filter(t => t.taskType === "TASK" && t.id !== id);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await addComment.mutateAsync({ taskId: id, content: body.trim() });
      setBody("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  };  return (
    <>
      <Topbar title={task.title} />
      <main className="flex-1 space-y-4 p-6 max-w-[1600px] mx-auto text-xs relative overflow-hidden">
        {/* Large Background Decorative Route Icon */}
        <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
          <CheckSquare className="h-[420px] w-[420px] opacity-[0.025] -rotate-12 stroke-[1] animate-pulse" />
        </div>

        {/* Back Link */}
        <div className="relative z-10">
          <Link to="/tasks" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tasks
          </Link>
        </div>

        {/* Header Hero Section */}
        <Card className="glass-card-green border border-white/10 p-5 shadow-xl shadow-indigo-500/5 bg-card/65 backdrop-blur-md rounded-2xl relative z-10 hover:border-primary/10 transition-all duration-300">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {task.displayId && (
                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {task.displayId}
                  </span>
                )}
                <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5">
                  {task.taskType}
                </Badge>
                {status && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold rounded-full px-2.5 py-0.5 border" style={{ borderColor: status.color + "30", background: status.color + "10", color: status.color }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
                    {status.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{task.title}</h1>
              {/* Category & Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {task.category && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 rounded px-2 py-0.5">
                    {task.category}
                  </span>
                )}
                {task.storyPoints && (
                  <span className="text-[9px] font-bold bg-muted/60 text-muted-foreground rounded px-2 py-0.5 font-mono">SP: {task.storyPoints}</span>
                )}
                {task.badges?.map(badge => (
                  <span key={badge} className="text-[8px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded px-1.5 py-0.5">
                    {badge.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick selectors */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
                <TaskStatusSelect task={task} compact />
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Assignee</span>
                <Select
                  value={currentAssigneeId}
                  onValueChange={async (userId) => {
                    const nextUserId = userId === "_none" ? "" : userId;
                    await reassign.mutateAsync({ taskId: id, userId: nextUserId });
                    toast.success("Assignee updated");
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px] text-xs gap-2 border-border/60 bg-transparent px-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <span className="inline-flex items-center gap-2 truncate">
                      <Avatar className="h-5 w-5 shrink-0 border border-border">
                        <AvatarFallback className="bg-primary/5 text-primary text-[9px] font-bold">
                          {currentAssignee?.name?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <SelectValue placeholder="Unassigned" />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">Unassigned</span>
                    </SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="inline-flex items-center gap-2">
                          <Avatar className="h-4.5 w-4.5">
                            <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {u.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>
        </Card>

        {/* Main Two-Column Content Grid */}
        <div className="grid gap-6 lg:grid-cols-12 relative z-10">
          {/* Left Column: Reorganized Tabbed Workspace (Description, Comments, Logs, Attachments, History) */}
          <div className="space-y-6 lg:col-span-8">
            <Card className="glass-card-green p-5 border border-white/10 shadow-xl shadow-indigo-500/5 bg-card/65 backdrop-blur-md rounded-2xl relative z-10 hover:border-primary/10 transition-all duration-300">
              {/* Active task header details */}
              <div className="flex items-center gap-2.5 mb-4 bg-muted/45 border border-white/5 p-3 rounded-xl backdrop-blur-sm">
                {task.displayId && (
                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                    {task.displayId}
                  </span>
                )}
                <span className="font-bold text-foreground truncate text-xs">
                  {task.title}
                </span>
              </div>
              <Tabs defaultValue="overview" className="space-y-5">
                <TabsList className="flex w-full items-center justify-start border-b border-border bg-transparent p-0 overflow-x-auto gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger value="overview" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-3.5 py-2.5 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary gap-1.5 transition-all hover:text-foreground">
                    <Info className="h-4 w-4" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-3.5 py-2.5 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary gap-1.5 transition-all hover:text-foreground">
                    <MessageSquare className="h-4 w-4" /> Comments ({comments.length})
                  </TabsTrigger>
                  <TabsTrigger value="time" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-3.5 py-2.5 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary gap-1.5 transition-all hover:text-foreground">
                    <Timer className="h-4 w-4" /> Log Hours & Timer
                  </TabsTrigger>
                  <TabsTrigger value="attachments" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-3.5 py-2.5 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary gap-1.5 transition-all hover:text-foreground">
                    <Paperclip className="h-4 w-4" /> Attachments
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-3.5 py-2.5 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary gap-1.5 transition-all hover:text-foreground">
                    <History className="h-4 w-4" /> Audit History
                  </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4 outline-none pt-2 relative">
                  {/* Tab-Specific Watermark Background Icon */}
                  <div className="absolute right-4 bottom-4 text-primary/5 select-none pointer-events-none z-0">
                    <Info className="h-36 w-36 stroke-[0.5] opacity-[0.02]" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 relative z-10">
                    {/* Task Description Card */}
                    <Card className="glass-card-green bg-muted/10 border border-white/5 p-4 rounded-xl space-y-2 relative overflow-hidden sm:col-span-2 hover:border-primary/10 transition-all duration-300">
                      <div className="flex items-center gap-1.5 border-b border-border/30 pb-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Task Description</span>
                      </div>
                      <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap pt-1 font-normal">
                        {task.description ? task.description : "No description provided for this task."}
                      </div>
                    </Card>

                    {/* Prominent Associated Issue Widget (if the current task is an issue) */}
                    {task.taskType === "ISSUE" && issue && (
                      <Card className="glass-card-green bg-destructive/5 border border-destructive/20 p-4 rounded-xl space-y-3 relative overflow-hidden sm:col-span-2">
                        <div className="flex items-center gap-2 text-destructive border-b border-destructive/15 pb-2">
                          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Incident details & SLA status</span>
                        </div>

                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-[11px]">
                          <Field label="Environment" value={issue.environment} />
                          <Field label="Affected Version" value={issue.affectedVersion ?? "—"} />
                          <Field label="Customer Reported" value={issue.customerReported ? `Yes (${issue.customerName ?? ""})` : "No"} />
                          <Field label="Incident State" value={
                            <Badge variant={issue.resolved ? "secondary" : "destructive"} className="text-[9px] font-bold px-1.5 py-0">
                              {issue.resolved ? "Resolved" : issue.acknowledged ? "Acknowledged" : "Open"}
                            </Badge>
                          } />
                        </div>

                        {issue.customerImpact && (
                          <div className="rounded-lg border border-destructive/15 bg-destructive/10 p-2 text-xs text-foreground/80 leading-relaxed">
                            <span className="font-bold text-destructive">Customer Impact: </span>
                            {issue.customerImpact}
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2 pt-1">
                          <SlaCountdown label="Response SLA Deadline" target={issue.slaTargetResponse} done={issue.acknowledged} />
                          <SlaCountdown label="Resolution SLA Deadline" target={issue.slaTargetFix} done={issue.resolved} />
                        </div>
                      </Card>
                    )}

                    {/* Predecessor & Successor Dependencies Card */}
                    <Card className="glass-card-green bg-muted/10 border border-white/5 p-4 rounded-xl space-y-3 relative overflow-hidden hover:border-primary/10 transition-all duration-300">
                      <div className="flex items-center gap-1.5 border-b border-border/30 pb-2">
                        <Link2 className="h-4 w-4 text-amber-500" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Dependencies</span>
                      </div>

                      {/* Blocked by (Predecessors) */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Blocked by ({predecessorDeps.length})</span>
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                          {predecessorDeps.map(d => {
                            const predTask = projectTasks.find(t => t.id === d.predecessorId);
                            return (
                              <div key={d.id} className="flex items-center justify-between bg-orange-500/5 px-2.5 py-1.5 rounded-lg border border-orange-500/10">
                                <span className="font-medium text-[10px] truncate max-w-[180px]">{predTask?.title || "Unknown Task"}</span>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => handleRemoveDependency(d.id)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          })}
                          {predecessorDeps.length === 0 && <span className="text-[10px] text-muted-foreground italic pl-1 block">No predecessors link</span>}
                        </div>
                        <Select value="" onValueChange={(val) => { if (val) handleAddDependency(val, id); }}>
                          <SelectTrigger className="h-8 text-[10px] bg-background/30 border-white/10 rounded-lg w-full mt-1.5"><Plus className="h-3 w-3 mr-1" /> Add Predecessor</SelectTrigger>
                          <SelectContent>
                            {availablePredTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>

                    {/* Followers list Card */}
                    <Card className="glass-card-green bg-muted/10 border border-white/5 p-4 rounded-xl space-y-3 relative overflow-hidden hover:border-primary/10 transition-all duration-300">
                      <div className="flex items-center gap-1.5 border-b border-border/30 pb-2">
                        <Users className="h-4 w-4 text-indigo-500" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Followers ({followers.length})</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Subscribed Team Members</span>
                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                          {followers.map(f => (
                            <div key={f.id} className="flex items-center justify-between bg-card/45 px-2.5 py-1.5 rounded-lg border border-white/5">
                              <span className="text-[10px] font-medium">{f.name}</span>
                              <Button size="icon" variant="ghost" className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => handleRemoveFollower(f.id)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          {followers.length === 0 && <span className="text-[10px] text-muted-foreground italic pl-1 block">No followers subscribed</span>}
                        </div>
                        <Select value="" onValueChange={(val) => { if (val) handleAddFollower(val); }}>
                          <SelectTrigger className="h-8 text-[10px] bg-background/30 border-white/10 rounded-lg w-full mt-1.5"><Plus className="h-3 w-3 mr-1" /> Add Follower</SelectTrigger>
                          <SelectContent>
                            {nonFollowers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* COMMENTS TAB */}
                <TabsContent value="comments" className="space-y-4 outline-none relative overflow-hidden">
                  {/* Tab-Specific Watermark Background Icon */}
                  <div className="absolute right-4 bottom-4 text-primary/5 select-none pointer-events-none z-0">
                    <MessageSquare className="h-36 w-36 stroke-[0.5] opacity-[0.02]" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    {comments.length === 0 && <p className="text-xs text-muted-foreground italic py-3">No comments yet. Start the discussion!</p>}
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {comments.map((c) => {
                        const u = findUser(c.userId);
                        return (
                          <div key={c.id} className="flex gap-3">
                            <Avatar className="h-7 w-7 border">
                              <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                                {u?.name?.slice(0, 2).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">{u?.name || "System User"}</span>
                                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                              </div>
                              <p className="text-xs text-foreground/80 leading-relaxed bg-muted/20 border border-border/40 p-2.5 rounded-xl">{c.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleAddComment} className="flex items-start gap-3 border-t border-border/40 pt-4">
                      <Avatar className="h-7 w-7 border shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type comment..." className="text-xs min-h-[60px] rounded-xl resize-none" />
                        <div className="flex justify-end">
                          <Button type="submit" size="sm" className="bg-gradient-primary text-primary-foreground font-semibold px-4">Comment</Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </TabsContent>

                {/* TIME LOGS TAB */}
                <TabsContent value="time" className="space-y-4 outline-none pt-1 relative overflow-hidden">
                  {/* Tab-Specific Watermark Background Icon */}
                  <div className="absolute right-4 bottom-4 text-primary/5 select-none pointer-events-none z-0">
                    <Timer className="h-36 w-36 stroke-[0.5] opacity-[0.02]" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    {/* Timer Widget */}
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-muted/25 border border-border/50 p-4 rounded-xl gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary animate-pulse">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Live tracking</span>
                          <div className="font-mono text-xl font-bold tracking-wider">{runningEntry ? formatTimer(elapsed) : "00:00:00"}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {runningEntry ? (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handlePauseTimer}>
                              <Pause className="h-3.5 w-3.5" /> Pause
                            </Button>
                            <Button size="sm" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-semibold" onClick={handleSubmitTimer}>
                              Submit
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" className="h-8 text-xs bg-gradient-primary text-primary-foreground font-semibold gap-1.5" onClick={handleStartTimer}>
                            <Play className="h-3.5 w-3.5" /> Start Timer
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Manual logger form */}
                    <div className="grid gap-3 sm:grid-cols-12 items-end pt-2 border-t border-border/40">
                      <div className="sm:col-span-3 space-y-1">
                        <Label htmlFor="logHrs" className="text-[10px] font-bold text-muted-foreground uppercase">Hours</Label>
                        <Input id="logHrs" type="number" min="0.1" step="0.1" placeholder="e.g. 1.5" value={logHours} onChange={(e) => setLogHours(e.target.value)} className="h-8 text-xs bg-background/50 border-white/10" />
                      </div>
                      <div className="sm:col-span-6 space-y-1">
                        <Label htmlFor="logD" className="text-[10px] font-bold text-muted-foreground uppercase">Notes</Label>
                        <Input id="logD" placeholder="What did you work on?" value={logDesc} onChange={(e) => setLogDesc(e.target.value)} className="h-8 text-xs bg-background/50 border-white/10" />
                      </div>
                      <Button onClick={handleLogTime} className="sm:col-span-3 h-8 bg-gradient-primary text-primary-foreground font-semibold">Log Time</Button>
                    </div>

                    {/* logged registry table */}
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                      <table className="min-w-full text-left text-[11px]">
                        <thead className="bg-muted/50 border-b border-border/70 font-semibold text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5">User</th>
                            <th className="px-4 py-2.5">Hours</th>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {taskEntries.map((e) => {
                            const u = findUser(e.userId || "");
                            return (
                              <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-2 font-medium">{u?.name || "Member"}</td>
                                <td className="px-4 py-2 font-mono text-primary font-bold">{e.hours?.toFixed(1)}h</td>
                                <td className="px-4 py-2">{format(new Date(e.startTime), "MMM d, yyyy")}</td>
                                <td className="px-4 py-2 max-w-[200px] truncate" title={e.description || ""}>{e.description || "—"}</td>
                              </tr>
                            );
                          })}
                          {taskEntries.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground italic">No hours logged to this task yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* ATTACHMENTS TAB */}
                <TabsContent value="attachments" className="pt-1 outline-none relative overflow-hidden">
                  {/* Tab-Specific Watermark Background Icon */}
                  <div className="absolute right-4 bottom-4 text-primary/5 select-none pointer-events-none z-0">
                    <Paperclip className="h-36 w-36 stroke-[0.5] opacity-[0.02]" />
                  </div>
                  <div className="relative z-10">
                    <AttachmentsPanel taskId={id} />
                  </div>
                </TabsContent>

                {/* HISTORY AUDIT TAB */}
                <TabsContent value="history" className="space-y-4 outline-none pt-1 relative overflow-hidden">
                  {/* Tab-Specific Watermark Background Icon */}
                  <div className="absolute right-4 bottom-4 text-primary/5 select-none pointer-events-none z-0">
                    <History className="h-36 w-36 stroke-[0.5] opacity-[0.02]" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    {/* Suggestion Card */}
                    {suggestion && (
                      <Card className="p-4 border border-border/70 bg-card space-y-3 shadow-none">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <Zap className="h-4 w-4 animate-bounce text-amber-500" />
                          <span>AI Smart Assignee Suggestion</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Based on current workload, department matching, and incident queues.</p>
                        {(() => {
                          const sugUser = users.find(u => u.id === suggestion.suggestedAssigneeId);
                          return (
                            <div className="flex items-center justify-between border-t border-border/40 pt-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 border">
                                  <AvatarFallback className="bg-primary/5 text-primary text-[9px] font-bold">{sugUser?.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-semibold text-foreground text-xs block">{sugUser?.name || "Unassigned"}</span>
                                  <span className="text-[10px] text-muted-foreground">Reason: {suggestion.reason}</span>
                                </div>
                              </div>
                              {task.assigneeIds[0] !== suggestion.suggestedAssigneeId && (
                                <Button size="sm" className="h-8 text-[10px] bg-gradient-primary text-primary-foreground font-semibold rounded-lg" disabled={reassign.isPending}
                                  onClick={async () => { await reassign.mutateAsync({ taskId: id, userId: suggestion.suggestedAssigneeId! }); toast.success("Applied suggestion"); }}>
                                  Apply Suggestion
                                </Button>
                              )}
                            </div>
                          );
                        })()}
                      </Card>
                    )}

                    {/* Audit Registry */}
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Audit Log History</span>
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {routingHistory.map((h: any, idx) => (
                          <div key={idx} className="flex gap-2.5 items-start text-xs border-l-2 border-border/70 pl-3.5 py-0.5 ml-2">
                            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 -ml-[20px] border border-background shrink-0" />
                            <div>
                              <p className="text-foreground/95"><span className="font-semibold">{h.action}</span> by {h.performedBy || "System"}</p>
                              <p className="text-[10px] text-muted-foreground">{format(new Date(h.timestamp), "MMM d, yyyy h:mm a")}</p>
                            </div>
                          </div>
                        ))}
                        {routingHistory.length === 0 && <p className="text-xs text-muted-foreground italic pl-2">No history logged yet.</p>}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Column: Compact Details & Issue Associations */}
          <div className="space-y-6 lg:col-span-4 relative z-10">
            {/* Compact Metadata Details Card */}
            <Card className="glass-card-green p-4 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl space-y-3.5 shadow-xl shadow-indigo-500/5 hover:border-primary/10 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">General Details</span>
                {task.priority && (
                  <Badge variant="outline" className={`text-[9px] font-bold border px-2 py-0.5 rounded-lg ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                    {task.priority}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2.5 text-[11px]">
                {project && (
                  <div className="flex justify-between items-center py-0.5 border-b border-border/20 pb-1.5">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5 text-primary" />
                      {project.name}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-0.5 border-b border-border/20 pb-1.5">
                  <span className="text-muted-foreground">Due Date</span>
                  {task.dueDate ? (
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">No due date</span>
                  )}
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-border/20 pb-1.5">
                  <span className="text-muted-foreground">Estimate</span>
                  <span className="font-semibold text-foreground font-mono">{task.estimatedHours ?? 0}h</span>
                </div>

                <div className="flex justify-between items-center py-0.5 border-b border-border/20 pb-1.5">
                  <span className="text-muted-foreground">Time Logged</span>
                  <span className="font-semibold text-primary font-mono">{totalLogged.toFixed(1)}h</span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-semibold text-foreground">{format(new Date(task.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </Card>

            {/* Task-Issue Linker Section */}
            <Card className="glass-card-green p-4 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl space-y-3.5 shadow-xl shadow-indigo-500/5 hover:border-primary/10 transition-all duration-300">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4 text-primary animate-pulse" /> Associated Task & Issues
              </h3>
              <Separator className="bg-border/40" />

              {task.taskType === "TASK" ? (
                // For standard Tasks: List associated Issues and allow linking/creating
                <div className="space-y-3">
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide block">Linked Issues</span>
                    {associatedIssues.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic pl-1">No associated issues.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {associatedIssues.map(issue => (
                          <div key={issue.id} className="flex items-center justify-between bg-destructive/5 hover:bg-destructive/10 px-2.5 py-1.5 rounded-xl border border-destructive/20 transition-colors">
                            <Link to="/tasks/$id" params={{ id: issue.id }} className="font-semibold text-[10px] hover:text-primary truncate flex-1 mr-2">
                              {issue.displayId ? `[${issue.displayId}] ` : ""}{issue.title}
                            </Link>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 hover:bg-destructive/15 hover:text-destructive text-muted-foreground rounded-lg"
                              onClick={async () => {
                                await updateTask.mutateAsync({ id: issue.id, patch: { parentTaskId: "" } });
                                toast.success("Unlinked issue");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Dropdown for Linking Existing */}
                  <div className="space-y-2 pt-1 border-t border-border/30">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide block">Link Existing Issue</span>
                    <Select
                      value=""
                      onValueChange={async (issueId) => {
                        if (issueId) {
                          await updateTask.mutateAsync({ id: issueId, patch: { parentTaskId: id } });
                          toast.success("Issue linked successfully");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-[11px] bg-transparent rounded-lg w-full">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Select Issue...
                      </SelectTrigger>
                      <SelectContent>
                        {availableIssuesToLink.map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.displayId ? `[${i.displayId}] ` : ""}{i.title}
                          </SelectItem>
                        ))}
                        {availableIssuesToLink.length === 0 && (
                          <SelectItem value="_none" disabled>No issues available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Create New Associated Issue Button (triggers beautiful dialog) */}
                  <div className="pt-2 border-t border-border/30">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full h-8 text-[10px] rounded-lg border-dashed text-primary border-primary/20 hover:bg-primary/5 gap-1.5" 
                      onClick={() => setIsCreateIssueOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Create Associated Issue
                    </Button>
                  </div>
                </div>
              ) : (
                // For Issues: Show parent Task link and allow updating the parent task relation
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide block">Associated Task</span>
                    {associatedParentTask ? (
                      <div className="flex items-center justify-between bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10">
                        <Link to="/tasks/$id" params={{ id: associatedParentTask.id }} className="font-semibold text-[10px] text-primary hover:underline truncate mr-2">
                          {associatedParentTask.displayId ? `[${associatedParentTask.displayId}] ` : ""}{associatedParentTask.title}
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 hover:bg-destructive/15 hover:text-destructive text-muted-foreground rounded-lg"
                          onClick={async () => {
                            await updateTask.mutateAsync({ id: task.id, patch: { parentTaskId: "" } });
                            toast.success("Unlinked parent task");
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic pl-1">No associated task.</p>
                    )}
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-border/30">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide block">Link/Change Parent Task</span>
                    <Select
                      value={task.parentTaskId || "_none"}
                      onValueChange={async (parentId) => {
                        const targetParentId = parentId === "_none" ? "" : parentId;
                        await updateTask.mutateAsync({ id: task.id, patch: { parentTaskId: targetParentId } });
                        toast.success("Associated task updated");
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-transparent rounded-lg w-full">
                        <SelectValue placeholder="Select Task..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {availableTasksToLink.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.displayId ? `[${t.displayId}] ` : ""}{t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Complete Issue Creator Dialog Modal */}
      <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
        <DialogContent className="glass-card-green border border-white/10 shadow-[0_8px_32px_0_rgba(239,68,68,0.12)] bg-card/75 backdrop-blur-md rounded-2xl p-6 sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-red-500">
              <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" /> Create Associated Incident Issue
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Link a new incident ticket directly under standard Task: <span className="font-semibold text-foreground">"{task.title}"</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="issueTitle" className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <AlertOctagon className="h-3.5 w-3.5 text-red-500 animate-pulse" /> Issue Title
              </Label>
              <Input id="issueTitle" placeholder="e.g. Ingress Controller Latency Spike" value={newIssueTitle} onChange={(e) => setNewIssueTitle(e.target.value)} className="h-9 text-xs bg-background/50 border-white/10 rounded-lg focus:border-red-500/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="issueSeverity" className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500 animate-bounce" /> Severity
                </Label>
                <Select value={newIssueSeverity} onValueChange={(val: any) => setNewIssueSeverity(val)}>
                  <SelectTrigger id="issueSeverity" className="h-9 text-xs bg-background/50 border-white/10 rounded-lg focus:border-red-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEV0">SEV0 — Critical (SLA 90m)</SelectItem>
                    <SelectItem value="SEV1">SEV1 — Major (SLA 4h)</SelectItem>
                    <SelectItem value="SEV2">SEV2 — Moderate (SLA 8h)</SelectItem>
                    <SelectItem value="SEV3">SEV3 — Minor (SLA 24h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issueEnv" className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-400" /> Environment
                </Label>
                <Select value={newIssueEnv} onValueChange={setNewIssueEnv}>
                  <SelectTrigger id="issueEnv" className="h-9 text-xs bg-background/50 border-white/10 rounded-lg focus:border-red-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Staging">Staging</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="QA / Sandbox">QA / Sandbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issueVersion" className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" /> Affected Version (Optional)
              </Label>
              <Input id="issueVersion" placeholder="e.g. v1.4.2" value={newIssueVersion} onChange={(e) => setNewIssueVersion(e.target.value)} className="h-9 text-xs bg-background/50 border-white/10 rounded-lg focus:border-red-500/50" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issueDesc" className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-teal-400" /> Description & Reproduction Steps
              </Label>
              <Textarea id="issueDesc" placeholder="Describe the failure, error logs, or user impact..." value={newIssueDesc} onChange={(e) => setNewIssueDesc(e.target.value)} className="min-h-[70px] text-xs bg-background/50 border-white/10 rounded-xl focus:border-red-500/50" />
            </div>

            {/* Customer Reported Switch */}
            <div className="flex items-center space-x-2.5 bg-background/40 border border-white/10 p-3 rounded-xl shadow-inner backdrop-blur-xs">
              <Checkbox id="custRep" checked={newIssueCustomerReported} onCheckedChange={(val: boolean) => setNewIssueCustomerReported(val)} />
              <Label htmlFor="custRep" className="font-semibold text-foreground cursor-pointer select-none flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-pink-400" /> Customer Reported & Impacting
              </Label>
            </div>

            {newIssueCustomerReported && (
              <div className="grid gap-3 sm:grid-cols-2 bg-red-500/5 p-3 rounded-xl border border-red-500/10 animate-fade-in">
                <div className="space-y-1.5">
                  <Label htmlFor="custName" className="text-[9px] font-bold text-red-400 uppercase flex items-center gap-1">
                    <UserIcon className="h-3 w-3 text-red-400" /> Customer Name
                  </Label>
                  <Input id="custName" placeholder="e.g. Acme Corp" value={newIssueCustomerName} onChange={(e) => setNewIssueCustomerName(e.target.value)} className="h-8 text-xs bg-background/70 border-white/10 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custImpact" className="text-[9px] font-bold text-red-400 uppercase flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-400 animate-bounce" /> Impact Description
                  </Label>
                  <Input id="custImpact" placeholder="e.g. Blocks login checkout flows" value={newIssueCustomerImpact} onChange={(e) => setNewIssueCustomerImpact(e.target.value)} className="h-8 text-xs bg-background/70 border-white/10 rounded-lg" />
                </div>
              </div>
            )}

            {/* Attachments Section within Dialog */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-purple-400" /> Upload Incident Attachments
              </Label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    const arr = Array.from(e.target.files).map(f => ({
                      name: f.name,
                      size: f.size,
                      type: f.type
                    }));
                    setIssueFiles(p => [...p, ...arr]);
                  }
                }}
                className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 bg-background/50 border-white/10 rounded-lg"
              />

              {issueFiles.length > 0 && (
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto border border-white/10 p-2.5 rounded-xl bg-background/30 backdrop-blur-xs">
                  {issueFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] bg-card/60 p-1.5 rounded-lg border border-white/5">
                      <span className="truncate max-w-[320px] font-medium flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {file.name}
                      </span>
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setIssueFiles(p => p.filter((_, i) => i !== idx))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-white/10 pt-3.5">
            <Button variant="outline" className="border-white/10 hover:bg-white/5" onClick={() => setIsCreateIssueOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAssociatedIssueSubmit} className="bg-gradient-primary text-primary-foreground font-semibold px-6 shadow-lg shadow-red-500/10">
              Create Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
      <div className="text-xs font-semibold text-foreground/90">{value}</div>
    </div>
  );
}
