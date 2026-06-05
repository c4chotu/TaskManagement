import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
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
  useProjectMembers,
  useUploadAttachment,
  useUpdateIssueDetail,
  useTeams,
  useSprints,
} from "@/lib/queries";
import { toast } from "sonner";
import { SlaCountdown } from "@/components/tfp/sla";
import { findUser, mockIssues, mockAttachments } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft, Clock, Calendar, FolderKanban, MessageSquare,
  Play, Pause, Route as RouteIcon, History, Paperclip,
  Link2, AlertTriangle, AlertOctagon, Timer, User as UserIcon, Plus, Zap, Check, CheckCircle2,
  Users, Trash2, ArrowUpRight, ArrowDownLeft, ShieldAlert, X, FileText, Info, CheckSquare, Layers, Pencil, ChevronUp,
  Copy, ChevronDown, ChevronLeft, ChevronRight, Filter, Download, ExternalLink, SlidersHorizontal, FolderOpen,
  MoreHorizontal
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

function renderContentWithImagesAndLinks(text: string) {
  if (!text) return null;
  const unionRegex = /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = unionRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{text.substring(lastIndex, matchIndex)}</span>);
    }
    if (match[1]) {
      const alt = match[2];
      const url = match[3];
      parts.push(
        <div key={matchIndex} className="my-2 max-w-full overflow-hidden rounded-lg border border-border bg-black/5">
          <img src={url} alt={alt || "image"} className="max-h-[300px] object-contain hover:scale-[1.01] transition-transform duration-200" />
        </div>
      );
    } else if (match[4]) {
      const label = match[5];
      const url = match[6];
      parts.push(
        <a key={matchIndex} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold inline-flex items-center gap-1">
          {label}
        </a>
      );
    }
    lastIndex = unionRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex} className="whitespace-pre-wrap">{text.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

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
  const uploadAttachment = useUploadAttachment();

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescVal, setEditDescVal] = useState("");
  const [isDescExpanded, setIsDescExpanded] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(true);

  const { data: timeEntries = [] } = useTimeEntries();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const runningEntry = timeEntries.find((te) => te.taskId === id && !te.endTime);

  const { data: suggestion } = useSuggestAssignee(id);
  const { data: routingHistory = [] } = useRoutingHistory(id);
  const manuallyRoute = useManuallyRouteTask();
  const reassign = useReassignTask();
  const { data: users = [] } = useUsers();
  const { data: projectMembers = [] } = useProjectMembers(task?.projectId);

  const projectMemberUserIds = useMemo(() => new Set(projectMembers.map((m: any) => m.userId)), [projectMembers]);
  const filteredUsers = useMemo(() => {
    if (!task?.projectId) return [];
    return users.filter((u) => projectMemberUserIds.has(u.id));
  }, [users, projectMemberUserIds, task?.projectId]);
  
  // Dependencies & Follower queries and mutations
  const { data: allDeps = [] } = useDependencies(task?.projectId);
  const { data: projectTasks = [] } = useTasks(task?.projectId ? { projectId: task.projectId } : undefined);
  const updateTask = useUpdateTask();
  const addDependency = useAddDependency();
  const removeDependency = useRemoveDependency();
  const createTask = useCreateTask();
  const updateIssueDetail = useUpdateIssueDetail();

  // Outlet context
  const context = Route.useRouteContext() as { filteredTasks?: any[]; statuses?: any[]; projects?: any[]; users?: any[]; teams?: any[] } || {};
  const { filteredTasks = [], teams: contextTeams = [] } = context;
  const { data: teamsData = [] } = useTeams();
  const teams = contextTeams.length > 0 ? contextTeams : teamsData;

  // Sprints / Sprints list
  const { data: phases = [] } = useSprints();

  // Local Storage states for Task details
  const [localDuration, setLocalDuration] = useState(localStorage.getItem(`task-duration-${id}`) || "2 days");
  const [localCompletion, setLocalCompletion] = useState(Number(localStorage.getItem(`task-completion-${id}`) || 0));
  const [localReminder, setLocalReminder] = useState(localStorage.getItem(`task-reminder-${id}`) || "None");
  const [localRecurrence, setLocalRecurrence] = useState(localStorage.getItem(`task-recurrence-${id}`) || "None");
  const [localBilling, setLocalBilling] = useState(localStorage.getItem(`task-billing-${id}`) || "Billable");
  
  const [localModule, setLocalModule] = useState(localStorage.getItem(`task-module-${id}`) || "None");
  const [localClass, setLocalClass] = useState(localStorage.getItem(`task-class-${id}`) || "None");
  const [localRepro, setLocalRepro] = useState(localStorage.getItem(`task-repro-${id}`) || "None");
  const [localFlag, setLocalFlag] = useState(localStorage.getItem(`task-flag-${id}`) || "None");
  const [localTags, setLocalTags] = useState(localStorage.getItem(`task-tags-${id}`) || "");

  // Update states on task id change
  useEffect(() => {
    setLocalDuration(localStorage.getItem(`task-duration-${id}`) || "2 days");
    setLocalCompletion(Number(localStorage.getItem(`task-completion-${id}`) || 0));
    setLocalReminder(localStorage.getItem(`task-reminder-${id}`) || "None");
    setLocalRecurrence(localStorage.getItem(`task-recurrence-${id}`) || "None");
    setLocalBilling(localStorage.getItem(`task-billing-${id}`) || "Billable");
    setLocalModule(localStorage.getItem(`task-module-${id}`) || "None");
    setLocalClass(localStorage.getItem(`task-class-${id}`) || "None");
    setLocalRepro(localStorage.getItem(`task-repro-${id}`) || "None");
    setLocalFlag(localStorage.getItem(`task-flag-${id}`) || "None");
    setLocalTags(localStorage.getItem(`task-tags-${id}`) || "");
  }, [id]);

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

  // Subtask quick add
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Bottom Tab active
  const [activeTab, setActiveTab] = useState<string>("comments");

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

  // Navigation hook - MUST be before any early return
  const nav = useNavigate();
  const [navPage, setNavPage] = useState(1);
  const NAV_PAGE_SIZE = 6;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  const handleEditIssueDetail = async (key: string, value: any) => {
    try {
      await updateIssueDetail.mutateAsync({
        taskId: id,
        patch: { [key]: value }
      });
      toast.success("Issue details updated");
    } catch (e) {
      toast.error("Failed to update issue details");
    }
  };

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

  // Dependency filtering
  const predecessorDeps = allDeps.filter((d) => d.successorId === id);
  const successorDeps = allDeps.filter((d) => d.predecessorId === id);

  // Subtasks
  const subtasks = projectTasks.filter((t) => t.parentTaskId === id && t.taskType === "TASK");

  // Associated Issues
  const associatedIssues = projectTasks.filter((t) => t.parentTaskId === id && t.taskType === "ISSUE");

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const defaultStatusId = statuses[0]?.id || "s-open";
      await createTask.mutateAsync({
        title: newSubtaskTitle.trim(),
        projectId: task.projectId,
        taskType: "TASK",
        parentTaskId: id,
        statusId: defaultStatusId,
        priority: "MEDIUM"
      });
      setNewSubtaskTitle("");
      toast.success("Subtask created!");
    } catch {
      toast.error("Failed to create subtask");
    }
  };

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

  const currentAssigneeId = task.assigneeIds[0] || "_none";
  const currentAssignee = users.find(u => u.id === currentAssigneeId);

  // Dependencies handlers
  const availableTasks = projectTasks.filter(t => t.id !== id);
  const currentPredIds = predecessorDeps.map(d => d.predecessorId);
  const currentSuccIds = successorDeps.map(d => d.successorId);
  const availablePredTasks = availableTasks.filter(t => !currentPredIds.includes(t.id) && !currentSuccIds.includes(t.id));

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
      const defaultStatusId = statuses.find((s) => s.isDefault)?.id || statuses[0]?.id;
      const createdTask = await createTask.mutateAsync({
        title: newIssueTitle.trim(),
        description: newIssueDesc,
        projectId: task.projectId,
        taskType: "ISSUE",
        statusId: defaultStatusId,
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
  };

  // Task navigation resolution
  const displayTasks = filteredTasks.length > 0 ? filteredTasks : projectTasks;
  const currentIdx = displayTasks.findIndex(t => t.id === id);
  const prevTaskId = currentIdx > 0 ? displayTasks[currentIdx - 1].id : null;
  const nextTaskId = currentIdx >= 0 && currentIdx < displayTasks.length - 1 ? displayTasks[currentIdx + 1].id : null;

  const navTotalPages = Math.max(1, Math.ceil(displayTasks.length / NAV_PAGE_SIZE));
  const navPagedTasks = displayTasks.slice((navPage - 1) * NAV_PAGE_SIZE, navPage * NAV_PAGE_SIZE);

  return (
    <>
      {/* Full-screen modal overlay */}
      <div className="fixed inset-0 z-50 flex items-stretch bg-black/60 backdrop-blur-sm" onClick={() => nav({ to: "/tasks" })}>
        <div
          className="relative m-auto flex h-[95vh] w-[97vw] max-w-[1400px] rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Breadcrumb Bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between border-b border-border/50 bg-card px-4 py-2 z-20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                <CheckSquare className="h-3.5 w-3.5" />
                {task.taskType === "ISSUE" ? "Issue" : "Task"}
              </span>
              <button
                onClick={() => copyToClipboard(task.displayId || task.id, "Task ID")}
                className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                title="Click to copy ID"
              >
                {task.displayId || task.id.toUpperCase().slice(0, 8)}
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
              {task.storyPoints && (
                <span className="text-[10px] font-mono bg-muted/70 px-1.5 py-0.5 rounded font-bold">SP: {task.storyPoints}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2.5">
              <button className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors" title="More Actions">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <button className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors" title="Copy Link" onClick={() => copyToClipboard(window.location.href, "Task URL")}>
                <Copy className="h-4 w-4" />
              </button>
              <button className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors" title="Share link">
                <Link2 className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 mr-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  disabled={!prevTaskId}
                  onClick={() => prevTaskId && nav({ to: "/tasks/$id", params: { id: prevTaskId } })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  disabled={!nextTaskId}
                  onClick={() => nextTaskId && nav({ to: "/tasks/$id", params: { id: nextTaskId } })}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <button onClick={() => nav({ to: "/tasks" })} className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body: Left Navigator + Main Content */}
          <div className="flex h-full pt-10 w-full">
            {/* ── LEFT: Task Navigator Panel ── */}
            <div className="w-66 flex-shrink-0 border-r border-border/60 bg-muted/20 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/40 p-1 rounded transition-colors">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                    Feature Update
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <button className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded transition-colors">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {navPagedTasks.map((t) => {
                  const s = statuses.find(x => x.id === t.statusId);
                  const isActive = t.id === id;
                  const isDone = s?.name?.toLowerCase().includes("done") || t.statusId === "s-done";
                  const isCriticalOrHigh = t.priority === "CRITICAL" || t.priority === "HIGH";

                  const assigneeName = t.assigneeIds && t.assigneeIds.length > 0 
                    ? users.find(u => u.id === t.assigneeIds[0])?.name || "Unassigned"
                    : "Unassigned";

                  return (
                    <button
                      key={t.id}
                      onClick={() => nav({ to: "/tasks/$id", params: { id: t.id } })}
                      className={`w-full text-left p-3 border-b border-border/20 transition-all hover:bg-muted/20 ${
                        isActive 
                          ? "bg-primary/5 border-l-4 border-l-primary shadow-sm" 
                          : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {t.displayId || t.id.toUpperCase().slice(0, 8)}
                          </span>
                          {s && (
                            <span 
                              className="text-[9px] font-bold px-2 py-0.5 rounded-full border" 
                              style={{ 
                                color: s.color, 
                                borderColor: `${s.color}30`, 
                                backgroundColor: `${s.color}10` 
                              }}
                            >
                              {s.name}
                            </span>
                          )}
                        </div>
                        <p className={`text-[12px] font-semibold leading-snug line-clamp-2 ${isActive ? "text-foreground font-bold" : "text-foreground/90"}`}>
                          {t.title}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{assigneeName}</span>
                          <div className="flex items-center gap-2">
                            {t.estimatedHours && (
                              <span className="flex items-center gap-1 font-mono text-[9px]">
                                <Clock className="h-3 w-3" />
                                {t.estimatedHours}:00
                              </span>
                            )}
                            {isCriticalOrHigh && (
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 fill-orange-500/10" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Nav Pagination */}
              <div className="border-t border-border/40 px-3 py-2 flex items-center justify-between shrink-0 bg-background/50">
                <span className="text-[10px] text-muted-foreground">
                  {Math.min((navPage - 1) * NAV_PAGE_SIZE + 1, displayTasks.length)}–{Math.min(navPage * NAV_PAGE_SIZE, displayTasks.length)} of {displayTasks.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setNavPage(p => Math.max(1, p - 1))} disabled={navPage === 1}
                    className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted/60 disabled:opacity-40">
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="text-[10px] font-mono">{navPage}/{navTotalPages}</span>
                  <button onClick={() => setNavPage(p => Math.min(navTotalPages, p + 1))} disabled={navPage === navTotalPages}
                    className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted/60 disabled:opacity-40">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Main Task Detail ── */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                
                {/* Title and sequential tag display */}
                <div className="space-y-1.5 pb-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight leading-snug">{task.title}</h1>
                  <div className="flex items-center gap-2.5 flex-wrap text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 border">
                        <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">
                          {user?.name?.slice(0, 2).toUpperCase() || "PK"}
                        </AvatarFallback>
                      </Avatar>
                      <span>By <span className="font-semibold text-foreground">{user?.name || "pradeep Kumar"}</span></span>
                    </div>
                    <span>•</span>
                    <button 
                      onClick={() => nav({ to: "/projects/$id", params: { id: task.projectId } })}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <FolderOpen className="h-3 w-3" />
                      {project?.name || "NETIQ"}
                    </button>
                  </div>
                </div>

                {/* Status Tracker Banner (STATUS in grey background bar) */}
                <div className="flex items-center justify-between bg-muted/20 border border-border/50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: status?.color || "#6366f1" }} />
                        <TaskStatusSelect task={task} compact />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">STATUS</span>
                    </div>
                    <div className="h-7 w-px bg-border/60" />
                    <div className="flex flex-col gap-0.5">
                      <Select value={localBilling} onValueChange={(val) => { setLocalBilling(val); localStorage.setItem(`task-billing-${id}`, val); toast.success("Billing type updated"); }}>
                        <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:bg-muted/40 py-0 px-2 rounded-md font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Billable">Billable</SelectItem>
                          <SelectItem value="Non-Billable">Non-Billable</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">BILLING TYPE</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] font-bold border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 rounded-lg gap-1.5"
                      onClick={() => copyToClipboard(`${task.displayId || task.id.toUpperCase().slice(0,8)}: ${task.title}`, "Task summary")}
                    >
                      <Copy className="h-3 w-3" /> Copy Summary
                    </Button>
                  </div>
                </div>

                {/* Description Accordion (collapsible) */}
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm">
                  <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 border-b border-border/30">
                    <button
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <FileText className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">Description</span>
                      {isDescExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("AI Description Summary: " + (task.description ? task.description.slice(0, 120) + "..." : "No description to summarize."));
                      }}
                      className="px-3 py-1 text-[10px] font-bold tracking-wide rounded-md border border-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:brightness-110 transition-all shadow-sm"
                    >
                      Show Summary
                    </button>
                  </div>

                  {isDescExpanded && (
                    <div className="p-4 space-y-2">
                      {isEditingDesc ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editDescVal}
                            onChange={(e) => setEditDescVal(e.target.value)}
                            onPaste={async (e) => {
                              const items = e.clipboardData.items;
                              for (const item of items) {
                                if (item.type.indexOf("image") !== -1) {
                                  e.preventDefault();
                                  const file = item.getAsFile();
                                  if (file) {
                                    try {
                                      const att = await uploadAttachment.mutateAsync({ taskId: id, file });
                                      const md = `\n![image](${att.url || '#'})`;
                                      setEditDescVal(prev => prev + md);
                                      toast.success("Image embedded in description!");
                                    } catch {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        setEditDescVal(prev => prev + `\n![image](${ev.target?.result})`);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }
                                }
                              }
                            }}
                            placeholder="Add details... (Paste images to embed)"
                            className="text-xs min-h-[120px] resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                            <Button size="sm" className="h-7 text-xs bg-emerald-500 text-white font-semibold px-4"
                              onClick={async () => {
                                try {
                                  await updateTask.mutateAsync({ id: task.id, patch: { description: editDescVal.trim() } });
                                  setIsEditingDesc(false);
                                  toast.success("Description saved");
                                } catch { toast.error("Failed to save description"); }
                              }}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-foreground/80 leading-relaxed min-h-[40px] relative group">
                          {task.description ? renderContentWithImagesAndLinks(task.description) : (
                            <span className="text-muted-foreground italic">No description. Click edit button to add one.</span>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6 absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                            onClick={() => { setEditDescVal(task.description || ""); setIsEditingDesc(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Task / Issue Information Accordion (collapsible field grid) */}
                <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm">
                  <button
                    onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/10 hover:bg-muted/20 border-b border-border/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {task.taskType === "ISSUE" ? "Issue Information" : "Task Information"}
                      </span>
                    </div>
                    {isInfoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {isInfoExpanded && (
                    <div className="p-4 bg-background/40">
                      {task.taskType === "ISSUE" ? (
                        /* ── Issue mode Information grid ── */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-xs">
                          {/* Column 1 */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Associated Team</Label>
                              <div className="col-span-2">
                                <Select value={task.teamId || "_none"} onValueChange={async (tId) => {
                                  await updateTask.mutateAsync({ id, patch: { teamId: tId === "_none" ? undefined : tId } });
                                  toast.success("Team updated");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue placeholder="No team" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">No Team</SelectItem>
                                    {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Assignee</Label>
                              <div className="col-span-2">
                                <Select value={currentAssigneeId} onValueChange={async (userId) => {
                                  await reassign.mutateAsync({ taskId: id, userId: userId === "_none" ? "" : userId });
                                  toast.success("Assignee updated");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">Unassigned</SelectItem>
                                    {filteredUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Tags</Label>
                              <div className="col-span-2">
                                <Input
                                  placeholder="e.g. core, hotfix"
                                  value={localTags}
                                  onChange={(e) => { setLocalTags(e.target.value); localStorage.setItem(`task-tags-${id}`, e.target.value); }}
                                  className="h-8 text-xs bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Reminder</Label>
                              <div className="col-span-2">
                                <Select value={localReminder} onValueChange={(val) => { setLocalReminder(val); localStorage.setItem(`task-reminder-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="15m">15m before</SelectItem>
                                    <SelectItem value="1h">1h before</SelectItem>
                                    <SelectItem value="1d">1d before</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Due Date</Label>
                              <div className="col-span-2">
                                <Input
                                  type="date"
                                  value={task.dueDate ? task.dueDate.split("T")[0] : ""}
                                  onChange={async (e) => {
                                    await updateTask.mutateAsync({ id, patch: { dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } });
                                    toast.success("Due date saved");
                                  }}
                                  className="h-8 text-xs font-mono bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Status</Label>
                              <div className="col-span-2">
                                <Select value={task.statusId} onValueChange={async (sId) => {
                                  await updateTask.mutateAsync({ id, patch: { statusId: sId } });
                                  toast.success("Status updated");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {statuses.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Column 2 */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Severity</Label>
                              <div className="col-span-2">
                                <Select value={issue?.severity || "SEV2"} onValueChange={(val) => handleEditIssueDetail("severity", val)}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SEV0">SEV0 — Critical</SelectItem>
                                    <SelectItem value="SEV1">SEV1 — Major</SelectItem>
                                    <SelectItem value="SEV2">SEV2 — Moderate</SelectItem>
                                    <SelectItem value="SEV3">SEV3 — Minor</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Release Phase</Label>
                              <div className="col-span-2">
                                <Select value={task.sprintId || "_none"} onValueChange={async (sId) => {
                                  await updateTask.mutateAsync({ id, patch: { sprintId: sId === "_none" ? undefined : sId } });
                                  toast.success("Sprint phase updated");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue placeholder="Backlog" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">Backlog</SelectItem>
                                    {phases.map(ph => <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Affected Phase</Label>
                              <div className="col-span-2">
                                <Select value={issue?.affectedVersion || "_none"} onValueChange={(val) => handleEditIssueDetail("affectedVersion", val === "_none" ? null : val)}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue placeholder="None" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">None</SelectItem>
                                    <SelectItem value="v1.0.0">v1.0.0</SelectItem>
                                    <SelectItem value="v1.1.0">v1.1.0</SelectItem>
                                    <SelectItem value="v2.0.0">v2.0.0</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Module</Label>
                              <div className="col-span-2">
                                <Select value={localModule} onValueChange={(val) => { setLocalModule(val); localStorage.setItem(`task-module-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Auth">Authentication</SelectItem>
                                    <SelectItem value="Billing">Billing Engine</SelectItem>
                                    <SelectItem value="Checkout">Checkout / Payment</SelectItem>
                                    <SelectItem value="API">API Gateway</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Classification</Label>
                              <div className="col-span-2">
                                <Select value={localClass} onValueChange={(val) => { setLocalClass(val); localStorage.setItem(`task-class-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Bug">Security Vulnerability</SelectItem>
                                    <SelectItem value="UI">UI Layout Issue</SelectItem>
                                    <SelectItem value="Perf">Performance Bottleneck</SelectItem>
                                    <SelectItem value="Crash">Runtime Crash</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Reproducible</Label>
                              <div className="col-span-2">
                                <Select value={localRepro} onValueChange={(val) => { setLocalRepro(val); localStorage.setItem(`task-repro-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Always">Always</SelectItem>
                                    <SelectItem value="Sometimes">Intermittent</SelectItem>
                                    <SelectItem value="Never">Cannot Reproduce</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Flag</Label>
                              <div className="col-span-2">
                                <Select value={localFlag} onValueChange={(val) => { setLocalFlag(val); localStorage.setItem(`task-flag-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Blocked">Blocked</SelectItem>
                                    <SelectItem value="Escalated">Escalated</SelectItem>
                                    <SelectItem value="Normal">Normal Priority</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ── Task mode Information grid ── */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-xs">
                          {/* Column 1 */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Associated Team</Label>
                              <div className="col-span-2">
                                <Select value={task.teamId || "_none"} onValueChange={async (tId) => {
                                  await updateTask.mutateAsync({ id, patch: { teamId: tId === "_none" ? undefined : tId } });
                                  toast.success("Team updated");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue placeholder="No team" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">No Team</SelectItem>
                                    {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Owner</Label>
                              <div className="col-span-2">
                                <Select value={currentAssigneeId} onValueChange={async (userId) => {
                                  await reassign.mutateAsync({ taskId: id, userId: userId === "_none" ? "" : userId });
                                  toast.success("Owner updated");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none">Unassigned</SelectItem>
                                    {filteredUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Work Hours</Label>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 18"
                                  value={task.estimatedHours ?? ""}
                                  onChange={async (e) => {
                                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                                    await updateTask.mutateAsync({ id, patch: { estimatedHours: val } });
                                  }}
                                  className="h-8 text-xs font-mono bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Status</Label>
                              <div className="col-span-2">
                                <Select value={task.statusId} onValueChange={async (sId) => {
                                  await updateTask.mutateAsync({ id, patch: { statusId: sId } });
                                  toast.success("Status saved");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {statuses.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Due Date</Label>
                              <div className="col-span-2">
                                <Input
                                  type="date"
                                  value={task.dueDate ? task.dueDate.split("T")[0] : ""}
                                  onChange={async (e) => {
                                    await updateTask.mutateAsync({ id, patch: { dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } });
                                    toast.success("Due date saved");
                                  }}
                                  className="h-8 text-xs font-mono bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Priority</Label>
                              <div className="col-span-2">
                                <Select value={task.priority || "MEDIUM"} onValueChange={async (prio) => {
                                  await updateTask.mutateAsync({ id, patch: { priority: prio === "NONE" ? undefined : (prio as any) } });
                                  toast.success("Priority updated");
                                }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="NONE">None</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Tags</Label>
                              <div className="col-span-2">
                                <Input
                                  placeholder="e.g. FE, refactor"
                                  value={localTags}
                                  onChange={(e) => { setLocalTags(e.target.value); localStorage.setItem(`task-tags-${id}`, e.target.value); }}
                                  className="h-8 text-xs bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Reminder</Label>
                              <div className="col-span-2">
                                <Select value={localReminder} onValueChange={(val) => { setLocalReminder(val); localStorage.setItem(`task-reminder-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="15m">15m before</SelectItem>
                                    <SelectItem value="1h">1h before</SelectItem>
                                    <SelectItem value="1d">1d before</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Billing Type</Label>
                              <div className="col-span-2">
                                <Select value={localBilling} onValueChange={(val) => { setLocalBilling(val); localStorage.setItem(`task-billing-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Billable">Billable</SelectItem>
                                    <SelectItem value="Non-Billable">Non-Billable</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Column 2 */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Start Date</Label>
                              <div className="col-span-2">
                                <Input
                                  type="date"
                                  value={task.startDate ? task.startDate.split("T")[0] : ""}
                                  onChange={async (e) => {
                                    await updateTask.mutateAsync({ id, patch: { startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } });
                                    toast.success("Start date saved");
                                  }}
                                  className="h-8 text-xs font-mono bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Duration</Label>
                              <div className="col-span-2">
                                <Input
                                  placeholder="e.g. 2 days"
                                  value={localDuration}
                                  onChange={(e) => { setLocalDuration(e.target.value); localStorage.setItem(`task-duration-${id}`, e.target.value); }}
                                  className="h-8 text-xs bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Completion %</Label>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={localCompletion}
                                  onChange={(e) => {
                                    const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                    setLocalCompletion(val);
                                    localStorage.setItem(`task-completion-${id}`, String(val));
                                  }}
                                  className="h-8 text-xs font-mono bg-transparent border-border/50"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                              <Label className="text-[11px] font-bold text-muted-foreground uppercase">Recurrence</Label>
                              <div className="col-span-2">
                                <Select value={localRecurrence} onValueChange={(val) => { setLocalRecurrence(val); localStorage.setItem(`task-recurrence-${id}`, val); }}>
                                  <SelectTrigger className="h-8 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="None">None</SelectItem>
                                    <SelectItem value="Daily">Daily</SelectItem>
                                    <SelectItem value="Weekly">Weekly</SelectItem>
                                    <SelectItem value="Monthly">Monthly</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Zoho-Style Tabs section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center border-b border-border/40 gap-1 overflow-x-auto [scrollbar-width:none]">
                    {[
                      { value: "comments", label: `Comments (${comments.length})`, icon: MessageSquare },
                      { value: "subtasks", label: `Subtasks (${subtasks.length})`, icon: CheckSquare },
                      { value: "logHours", label: `Log Hours (${taskEntries.length})`, icon: Timer },
                      { value: "documents", label: "Documents", icon: Paperclip },
                      { value: "dependency", label: "Dependency", icon: Link2 },
                      { value: "timeline", label: "Status Timeline", icon: History },
                      { value: "issues", label: `Issues (${associatedIssues.length})`, icon: AlertTriangle },
                      { value: "activity", label: "Activity Stream", icon: Clock },
                      { value: "linkedCr", label: "Linked CR", icon: Zap },
                    ].map(tab => (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`inline-flex items-center gap-1.5 rounded-none border-b-2 px-3 py-2 text-xs font-semibold shrink-0 transition-all ${
                          activeTab === tab.value 
                            ? "border-emerald-500 text-emerald-500 font-bold" 
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Active Tab content wrapper */}
                  <div className="bg-card border border-border/40 rounded-xl p-4 min-h-[220px]">
                    
                    {/* COMMENTS TAB CONTENT */}
                    {activeTab === "comments" && (
                      <div className="space-y-4">
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {comments.map((c) => {
                            const u = findUser(c.userId);
                            return (
                              <div key={c.id} className="flex gap-3">
                                <Avatar className="h-7 w-7 border shrink-0">
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{u?.name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-xs">{u?.name || "Member"}</span>
                                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                                  </div>
                                  <div className="text-xs text-foreground/80 bg-muted/20 border border-border/40 p-2.5 rounded-xl leading-relaxed">
                                    {renderContentWithImagesAndLinks(c.content)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {comments.length === 0 && <p className="text-xs text-muted-foreground italic">No comments yet. Start the discussion!</p>}
                        </div>
                        <form onSubmit={handleAddComment} className="flex items-start gap-3 border-t border-border/40 pt-3">
                          <Avatar className="h-7 w-7 border shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{user?.name?.slice(0, 2).toUpperCase() || "ME"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="relative">
                              <Textarea value={body} onChange={(e) => setBody(e.target.value)}
                                placeholder="Type comment..." className="text-xs min-h-[60px] rounded-xl pr-10 resize-none" />
                              <button type="button" onClick={() => document.getElementById("comment-file-upload")?.click()}
                                className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground">
                                <Paperclip className="h-4 w-4" />
                              </button>
                              <input type="file" id="comment-file-upload" className="hidden" onChange={async (e) => {
                                    if (e.target.files?.[0]) {
                                      const file = e.target.files[0];
                                      try {
                                        const att = await uploadAttachment.mutateAsync({ taskId: id, file });
                                        setBody(prev => prev + `\n![${file.name}](${att.url || '#'})`);
                                        toast.success("File attached");
                                      } catch { toast.error("Upload failed"); }
                                    }
                                  }} 
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button type="submit" size="sm" className="bg-emerald-500 text-white font-semibold px-4 h-8 rounded-lg">Comment</Button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* SUBTASKS TAB CONTENT */}
                    {activeTab === "subtasks" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Subtasks List</span>
                          {subtasks.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No subtasks found.</p>
                          ) : (
                            <div className="divide-y divide-border/30 border border-border/30 rounded-lg overflow-hidden">
                              {subtasks.map(sub => {
                                const st = statuses.find(s => s.id === sub.statusId);
                                return (
                                  <div key={sub.id} className="flex items-center justify-between p-2.5 hover:bg-muted/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={sub.statusId === "s-done"}
                                        onChange={async () => {
                                          const nextSt = sub.statusId === "s-done" ? statuses[0]?.id || "s-open" : "s-done";
                                          await updateTask.mutateAsync({ id: sub.id, patch: { statusId: nextSt } });
                                          toast.success("Subtask status updated");
                                        }}
                                        className="rounded border-border text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
                                      />
                                      <span className={`text-xs font-medium ${sub.statusId === "s-done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{sub.title}</span>
                                    </div>
                                    {st && <Badge variant="outline" className="text-[9px] px-1.5 py-0.5" style={{ color: st.color, borderColor: st.color }}>{st.name}</Badge>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-border/40">
                          <Input
                            placeholder="Add new subtask title..."
                            value={newSubtaskTitle}
                            onChange={e => setNewSubtaskTitle(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Button size="sm" onClick={handleCreateSubtask} className="bg-emerald-500 text-white font-semibold h-8 shrink-0 rounded-lg px-3">
                            Add Subtask
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* LOG HOURS TAB CONTENT */}
                    {activeTab === "logHours" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-foreground">Time Log Entries</span>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs h-8 px-4">
                                Add Time Log
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                              <DialogHeader>
                                <DialogTitle>Add Time Log</DialogTitle>
                                <DialogDescription>Log manual hours for this task</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-xs">
                                <div className="space-y-1">
                                  <Label>Hours</Label>
                                  <Input type="number" min="0.1" step="0.1" placeholder="e.g. 1.5" value={logHours} onChange={(e) => setLogHours(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label>Notes</Label>
                                  <Input placeholder="What did you work on?" value={logDesc} onChange={(e) => setLogDesc(e.target.value)} />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleLogTime} className="bg-emerald-500 text-white text-xs h-8">Submit Log</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-border/40">
                          <table className="min-w-full text-left text-[11px]">
                            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2">User</th>
                                <th className="px-3 py-2">Billing</th>
                                <th className="px-3 py-2">Hours</th>
                                <th className="px-3 py-2">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {taskEntries.map((e) => {
                                const u = findUser(e.userId || "");
                                return (
                                  <tr key={e.id} className="hover:bg-muted/5">
                                    <td className="px-3 py-2 font-medium">{u?.name || "Member"}</td>
                                    <td className="px-3 py-2">
                                      <Badge variant="outline" className={`text-[9px] px-1 py-0.25 ${e.billable ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-yellow-500/20 text-yellow-500 bg-yellow-500/5"}`}>
                                        {e.billable ? "Billable" : "Non-Billable"}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-2 font-bold font-mono text-emerald-500">{e.hours?.toFixed(1)}h</td>
                                    <td className="px-3 py-2 max-w-[200px] truncate">{e.description || "—"}</td>
                                  </tr>
                                );
                              })}
                              {taskEntries.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground italic">
                                    No time logs submitted.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Row and Pagination */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/30 text-xs">
                          <div className="flex items-center gap-4 text-[11px] font-medium">
                            <span>
                              Billable: <span className="font-bold text-emerald-500">{totalLogged.toFixed(1)} h</span>
                            </span>
                            <span>
                              Non-Billable: <span className="font-bold text-yellow-600">0.0 h</span>
                            </span>
                            <span>
                              Total: <span className="font-bold text-foreground">{totalLogged.toFixed(1)} h</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                            <span>Total Count: {taskEntries.length}</span>
                            <div className="flex items-center gap-1">
                              <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted/60 disabled:opacity-40" disabled><ChevronLeft className="h-3 w-3" /></button>
                              <span className="font-mono">1-1</span>
                              <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted/60 disabled:opacity-40" disabled><ChevronRight className="h-3 w-3" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DOCUMENTS TAB CONTENT */}
                    {activeTab === "documents" && (
                      <AttachmentsPanel taskId={id} />
                    )}

                    {/* DEPENDENCY TAB CONTENT */}
                    {activeTab === "dependency" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block font-semibold">Blocked By / Predecessor Dependencies ({predecessorDeps.length})</span>
                          <div className="space-y-1">
                            {predecessorDeps.map(d => {
                              const predTask = projectTasks.find(t => t.id === d.predecessorId);
                              return (
                                <div key={d.id} className="flex items-center justify-between bg-orange-500/5 px-2.5 py-1.5 rounded-lg border border-orange-500/15">
                                  <span className="text-[11px] truncate font-medium">{predTask?.title || "Predecessor Task Link"}</span>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveDependency(d.id)}><X className="h-3 w-3" /></Button>
                                </div>
                              );
                            })}
                            {predecessorDeps.length === 0 && <p className="text-xs text-muted-foreground italic">No predecessor relations link</p>}
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Link Predecessor Task</Label>
                          <Select value="" onValueChange={(val) => { if (val) handleAddDependency(val, id); }}>
                            <SelectTrigger className="h-8 text-xs rounded-lg bg-transparent border-border/50"><SelectValue placeholder="Add task dependency" /></SelectTrigger>
                            <SelectContent>{availablePredTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* STATUS TIMELINE TAB CONTENT */}
                    {activeTab === "timeline" && (
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Routing & State Audit History</span>
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {routingHistory.map((h: any, idx: number) => (
                            <div key={idx} className="flex gap-2.5 items-start text-xs border-l-2 border-border/60 pl-3.5 ml-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 -ml-[20px] border border-background shrink-0" />
                              <div>
                                <p className="text-foreground font-medium">{h.action} by {h.performedBy || "System"}</p>
                                <p className="text-[9px] text-muted-foreground">{format(new Date(h.timestamp), "yyyy-MM-dd h:mm a")}</p>
                              </div>
                            </div>
                          ))}
                          {routingHistory.length === 0 && <p className="text-xs text-muted-foreground italic">No transitions logged yet.</p>}
                        </div>
                      </div>
                    )}

                    {/* ISSUES TAB CONTENT */}
                    {activeTab === "issues" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Incident Issues ({associatedIssues.length})</span>
                          <div className="space-y-1">
                            {associatedIssues.map(iss => (
                              <div key={iss.id} className="flex items-center justify-between bg-destructive/5 px-2.5 py-1.5 rounded-lg border border-destructive/20">
                                <button onClick={() => { nav({ to: "/tasks/$id", params: { id: iss.id } }); setActiveTab("comments"); }} className="text-[11px] font-semibold text-destructive hover:underline truncate text-left flex-1 mr-2">
                                  {iss.displayId && `[${iss.displayId}] `}{iss.title}
                                </button>
                                <Button size="icon" variant="ghost" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => updateTask.mutateAsync({ id: iss.id, patch: { parentTaskId: "" } })}><X className="h-3 w-3" /></Button>
                              </div>
                            ))}
                            {associatedIssues.length === 0 && <p className="text-xs text-muted-foreground italic font-medium">No associated incidents links.</p>}
                          </div>
                        </div>

                        <Button size="sm" onClick={() => setIsCreateIssueOpen(true)} className="w-full h-8 bg-destructive text-white font-semibold gap-1.5 rounded-lg mt-2 text-xs">
                          <Plus className="h-3.5 w-3.5" /> Create Associated Incident
                        </Button>
                      </div>
                    )}

                    {/* ACTIVITY STREAM */}
                    {activeTab === "activity" && (
                      <div className="text-xs text-muted-foreground italic p-4 text-center">
                        Activity feed is synchronized dynamically. Check back later for updates.
                      </div>
                    )}

                    {/* LINKED CR */}
                    {activeTab === "linkedCr" && (
                      <div className="text-xs text-muted-foreground italic p-4 text-center">
                        No Change Requests associated with this item.
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Associated Issue Creation Dialog */}
      <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4 animate-pulse" /> Create Associated Incident Issue
            </DialogTitle>
            <DialogDescription>Link a new incident under: <span className="font-semibold">"{task.title}"</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Issue Title *</Label>
              <Input placeholder="e.g. API latency spike on /checkout" value={newIssueTitle} onChange={(e) => setNewIssueTitle(e.target.value)} className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Severity</Label>
                <Select value={newIssueSeverity} onValueChange={(val: any) => setNewIssueSeverity(val)}>
                  <SelectTrigger className="h-9 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEV0">SEV0 — Critical</SelectItem>
                    <SelectItem value="SEV1">SEV1 — Major</SelectItem>
                    <SelectItem value="SEV2">SEV2 — Moderate</SelectItem>
                    <SelectItem value="SEV3">SEV3 — Minor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Environment</Label>
                <Select value={newIssueEnv} onValueChange={setNewIssueEnv}>
                  <SelectTrigger className="h-9 text-xs bg-transparent border-border/50"><SelectValue /></SelectTrigger>
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
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Description</Label>
              <Textarea placeholder="Describe the issue, error logs, or reproduction steps..." value={newIssueDesc} onChange={(e) => setNewIssueDesc(e.target.value)} className="min-h-[80px] text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Affected Version</Label>
              <Input placeholder="e.g. v1.4.2" value={newIssueVersion} onChange={(e) => setNewIssueVersion(e.target.value)} className="h-8" />
            </div>
            <div className="flex items-center space-x-2.5 bg-muted/30 border border-border p-3 rounded-xl">
              <Checkbox id="custRep" checked={newIssueCustomerReported} onCheckedChange={(val: boolean) => setNewIssueCustomerReported(val)} />
              <Label htmlFor="custRep" className="font-semibold cursor-pointer">Customer Reported</Label>
            </div>
            {newIssueCustomerReported && (
              <div className="grid gap-3 sm:grid-cols-2 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase text-red-400 font-bold">Customer Name</Label>
                  <Input placeholder="Acme Corp" value={newIssueCustomerName} onChange={(e) => setNewIssueCustomerName(e.target.value)} className="h-8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase text-red-400 font-bold">Impact Description</Label>
                  <Input placeholder="Blocks checkout flow" value={newIssueCustomerImpact} onChange={(e) => setNewIssueCustomerImpact(e.target.value)} className="h-8" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateIssueOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateAssociatedIssueSubmit} disabled={createTask.isPending}
              className="bg-destructive text-destructive-foreground font-semibold">
              {createTask.isPending ? "Creating..." : "Create Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatTimer(totalSecs: number) {
  const hh = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSecs % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
