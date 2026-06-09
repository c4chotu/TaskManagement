import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useIssues, useProject, useProjectMembers, useSprints, useStatuses, useTasks, useProjectAttachments, useUploadProjectAttachment, useDeleteProjectAttachment, useCreateSprint, useUpdateSprint, useUsers, useTimeEntries, useTeams, useAddProjectMember, useRemoveProjectMember, useProjectTeams, useAddProjectTeam, useRemoveProjectTeam } from "@/lib/queries";
import { apiRequest, USE_MOCK } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  TrendingUp, Users, Calendar, AlertTriangle, ArrowLeft, ArrowRight,
  Plus, CheckCircle2, ShieldAlert, BadgeDollarSign, Activity,
  Milestone, Briefcase, Clock, PlayCircle, Flame, Paperclip, Download, Trash2, FileText, X, UploadCloud, Info, ChevronLeft, ChevronRight,
  Loader2, Zap, MessageSquare, GitBranch, UserCheck, Filter, Bell
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { downloadAuthenticatedFile } from "@/components/tfp/attachments-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

// ─── Activity Stream Types ───────────────────────────────────────────────────
type ActivityEventType = "task_created" | "status_changed" | "comment_added" | "phase_activated" | "member_added" | "issue_created";
interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  taskId?: string;
  taskTitle?: string;
  taskDisplayId?: string;
  from?: string;
  to?: string;
  actor?: string;
  at: string;
  message: string;
}

// Global in-memory activity log (per project page mount)
const activityBus: ActivityEvent[] = [];
export function pushActivity(event: Omit<ActivityEvent, "id">) {
  activityBus.unshift({ ...event, id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
  if (activityBus.length > 200) activityBus.length = 200;
  window.dispatchEvent(new CustomEvent("tfp:activity"));
}

const formatDateSafely = (dateVal: any, fmtStr: string, fallback: string = "N/A") => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmtStr);
  } catch (e) {
    return fallback;
  }
};

export const Route = createFileRoute("/_app/projects/$id")({
  head: () => ({ meta: [{ title: "Project Dashboard — TaskFlow Pro" }] }),
  component: ProjectDetail,
});

const milestones = [
  { id: "m-1", name: "Initiation & Setup", date: "May 5, 2026", status: "COMPLETED", pct: 100, goal: "Setup repository and dev environment" },
  { id: "m-2", name: "Design & Architecture", date: "May 20, 2026", status: "COMPLETED", pct: 100, goal: "Database design and UI mockups" },
  { id: "m-3", name: "Core Development", date: "June 10, 2026", status: "ACTIVE", pct: 65, goal: "Implement primary features and mock database" },
  { id: "m-4", name: "Security & Testing", date: "June 25, 2026", status: "PLANNED", pct: 0, goal: "Perform audit and end-to-end user tests" },
  { id: "m-5", name: "Beta Release & Launch", date: "July 15, 2026", status: "PLANNED", pct: 0, goal: "Deployment and validation checks" },
];

function ProjectDetail() {
  const { id } = Route.useParams();
  const { data: project } = useProject(id);
  const { data: tasks = [] } = useTasks({ projectId: id });
  const { data: issues = [] } = useIssues();
  const { data: statuses = [] } = useStatuses(id);
  const { data: members = [] } = useProjectMembers(id);
  const { data: users = [] } = useUsers();
  const { data: sprints = [] } = useSprints(id);
  const { data: projectAttachments = [] } = useProjectAttachments(id);
  const { data: timeEntries = [] } = useTimeEntries();
  const { data: teams = [] } = useTeams();
  const { data: projectTeams = [] } = useProjectTeams(id);
  const addProjectTeamMutation = useAddProjectTeam();
  const removeProjectTeamMutation = useRemoveProjectTeam();

  // ─── Activity Stream State ─────────────────────────────────────────────────
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [activityFilter, setActivityFilter] = useState<ActivityEventType | "all">("all");

  // Listen for new activity bus events (from pushActivity) and direct mutation events
  useEffect(() => {
    const busHandler = () => setActivityEvents([...activityBus]);
    const newEventHandler = (e: Event) => {
      const evt = (e as CustomEvent).detail as Omit<ActivityEvent, "id">;
      if (evt) {
        pushActivity(evt);
      }
    };
    window.addEventListener("tfp:activity", busHandler);
    window.addEventListener("tfp:activity:new", newEventHandler);
    return () => {
      window.removeEventListener("tfp:activity", busHandler);
      window.removeEventListener("tfp:activity:new", newEventHandler);
    };
  }, []);

  // Seed activity from existing data on first load
  useEffect(() => {
    if (tasks.length === 0 && sprints.length === 0) return;
    if (activityBus.length > 0) return; // Already seeded
    // Seed tasks
    [...tasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).forEach(t => {
      activityBus.push({
        id: `seed-tc-${t.id}`,
        type: "task_created",
        taskId: t.id,
        taskTitle: t.title,
        taskDisplayId: t.displayId,
        actor: t.assigneeIds[0] ? users.find(u => u.id === t.assigneeIds[0])?.name || "System" : "System",
        at: t.createdAt,
        message: `Task "${t.title}" was created`,
      });
    });
    // Seed activated sprints
    sprints.filter(s => s.status === "ACTIVE" || s.status === "COMPLETED").forEach(s => {
      activityBus.push({
        id: `seed-sa-${s.id}`,
        type: "phase_activated",
        actor: "System",
        at: s.startDate,
        message: `Phase "${s.name}" was activated`,
      });
    });
    activityBus.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setActivityEvents([...activityBus]);
  }, [tasks.length, sprints.length]);

  const [preview, setPreview] = useState<{ url: string; name: string; mime: string; blobUrl?: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

  const handlePreview = async (url: string, name: string, mime: string, fileId: string) => {
    if (USE_MOCK) {
      setPreview({ url, name, mime, blobUrl: url });
      return;
    }
    setLoadingPreview(fileId);
    try {
      const token = localStorage.getItem("tfp.accessToken");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Preview failed to load");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ url, name, mime, blobUrl });
    } catch (err) {
      toast.error("Could not open preview: unauthorized or server error");
    } finally {
      setLoadingPreview(null);
    }
  };

  const closePreview = () => {
    if (preview?.blobUrl && !USE_MOCK) {
      URL.revokeObjectURL(preview.blobUrl);
    }
    setPreview(null);
  };

  const projectTaskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);
  const projectTimeEntries = useMemo(() => {
    return timeEntries.filter((te) => projectTaskIds.has(te.taskId));
  }, [timeEntries, projectTaskIds]);
  const uploadAttachment = useUploadProjectAttachment();
  const deleteAttachment = useDeleteProjectAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSprintMutation = useCreateSprint();
  const updateSprintMutation = useUpdateSprint();

  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [isPhaseOpen, setIsPhaseOpen] = useState(false);
  const [phaseActiveTab, setPhaseActiveTab] = useState("tasks");

  // Auto-activate phases/sprints according to timeline schedule
  useEffect(() => {
    if (sprints.length > 0) {
      const today = new Date();
      sprints.forEach((s) => {
        if (s.status === "PLANNED") {
          if (!s.startDate || !s.endDate) return;
          const start = new Date(s.startDate);
          const end = new Date(s.endDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
          if (today >= start && today <= end) {
            updateSprintMutation.mutate({
              id: s.id,
              payload: { status: "ACTIVE" }
            });
            toast.info(`Phase "${s.name}" auto-activated based on timeline schedule.`);
          }
        }
      });
    }
  }, [sprints]);

  // Dialog State for Phase creation
  const [newPhaseOpen, setNewPhaseOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseGoal, setNewPhaseGoal] = useState("");
  const [newPhaseStart, setNewPhaseStart] = useState("");
  const [newPhaseEnd, setNewPhaseEnd] = useState("");
  const [newPhaseHours, setNewPhaseHours] = useState("40");

  const handleAddPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseName || !newPhaseStart || !newPhaseEnd) {
      toast.error("Please fill in the Phase Name, Start Date, and End Date.");
      return;
    }
    try {
      await createSprintMutation.mutateAsync({
        projectId: id,
        name: newPhaseName,
        goal: newPhaseGoal,
        startDate: new Date(newPhaseStart).toISOString(),
        endDate: new Date(newPhaseEnd).toISOString(),
        status: "PLANNED",
        estimatedHours: Number(newPhaseHours) || 0,
        taskIds: []
      });
      toast.success("New project phase added successfully!");
      setNewPhaseOpen(false);
      setNewPhaseName("");
      setNewPhaseGoal("");
      setNewPhaseStart("");
      setNewPhaseEnd("");
    } catch (err) {
      toast.error("Failed to add phase.");
    }
  };

  // Must be declared before sprintsRoadmap which depends on it
  const completedStatusIds = useMemo(() => {
    return new Set(statuses.filter(s => s.category === "COMPLETED").map(s => s.id));
  }, [statuses]);

  const sprintsRoadmap = useMemo(() => {
    if (sprints.length > 0) {
      return sprints.map((s) => {
        const sprintTasks = tasks.filter((t) => t.sprintId === s.id);
        // Use COMPLETED-category statuses for accurate sprint completion %
        const completedTasks = sprintTasks.filter((t) => completedStatusIds.has(t.statusId)).length;
        const totalTasks = sprintTasks.length;
        const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        return {
          id: s.id,
          name: s.name,
          date: `${formatDateSafely(s.startDate, "MMM d")} - ${formatDateSafely(s.endDate, "MMM d, yyyy")}`,
          status: s.status,
          pct,
          goal: s.goal
        };
      });
    }
    return milestones;
  }, [sprints, tasks, milestones, completedStatusIds]);

  const handleUploadProjDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      const loadId = toast.loading(`Uploading ${file.name}...`);
      try {
        await uploadAttachment.mutateAsync({
          projectId: id,
          file,
        });
        toast.success(`Uploaded ${file.name} successfully`, { id: loadId });
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`, { id: loadId });
      }
    }
  };

  const handleDeleteProjDoc = async (attachmentId: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
      try {
        await deleteAttachment.mutateAsync({ projectId: id, attachmentId });
        toast.success("Document deleted");
      } catch {
        toast.error("Failed to delete document");
      }
    }
  };

  const humanSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  const linkedIssues = useMemo(() => {
    return issues.filter((issue) => tasks.some((task) => task.id === issue.taskId));
  }, [issues, tasks]);


  const completed = useMemo(() => {
    return tasks.filter((task) => completedStatusIds.has(task.statusId)).length;
  }, [tasks, completedStatusIds]);

  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const estimateHours = tasks.reduce((sum, task) => sum + (task.estimatedHours ?? 0), 0);
  const loggedHours = tasks.reduce((sum, task) => sum + (task.loggedHours ?? 0), 0);
  const activeSprint = sprints.find((sprint) => sprint.status === "ACTIVE");

  // Deadlines and critical items
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        return !isNaN(d.getTime()) && d > new Date() && !completedStatusIds.has(task.statusId);
      })
      .sort((a, b) => {
        const da = new Date(a.dueDate!);
        const db = new Date(b.dueDate!);
        return da.getTime() - db.getTime();
      })
      .slice(0, 3);
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const d = new Date(task.dueDate);
      return !isNaN(d.getTime()) && d < new Date() && !completedStatusIds.has(task.statusId);
    });
  }, [tasks, completedStatusIds]);

  // Financial simulation
  const billingRate = 85; // $85 per hour
  const actualCost = loggedHours * billingRate;
  const estimatedCost = estimateHours * billingRate;
  const plannedBudget = 150000;
  const budgetProgress = Math.min(Math.round((actualCost / plannedBudget) * 100), 100);



  // User workload distribution
  const teamWorkload = useMemo(() => {
    return members.map((m) => {
      const u = users.find((x) => x.id === m.userId);
      const userTasks = tasks.filter((t) => t.assigneeIds.includes(m.userId));
      const hours = userTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
      const doneHours = userTasks.filter((t) => t.statusId === "s-done").reduce((sum, t) => sum + (t.loggedHours ?? 0), 0);
      const capacityPct = Math.min(Math.round((hours / 40) * 100), 120); // 40h standard workload
      return {
        ...m,
        name: u?.name ?? "Team Member",
        avatarUrl: u?.avatarUrl,
        taskCount: userTasks.length,
        hours,
        doneHours,
        capacityPct,
        overloaded: hours > 35,
      };
    });
  }, [members, tasks, users]);

  if (!project) {
    return (
      <>
        <Topbar title="Project" />
        <main className="p-6">
          <Card className="p-8 text-center text-sm text-muted-foreground">Project not found.</Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title={project.name} />
      <main className="flex-1 space-y-6 p-6">
        {/* Back Link */}
        <div>
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
          </Link>
        </div>

        {/* Hero Banner Card with glassmorphism styling */}
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-tr from-violet-600/10 via-indigo-600/5 to-transparent p-6 shadow-md backdrop-blur-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {project.type}
                </Badge>
                <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px] uppercase">
                  {project.status.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{project.name}</h1>
              <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed">{project.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  Start: {formatDateSafely(project.startDate, "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-destructive" />
                  Target Release: {formatDateSafely(project.endDate, "MMM d, yyyy")}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
              {/* Radial Progress Simulation */}
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card/50 p-4 shadow-sm backdrop-blur">
                <div className="relative h-14 w-14 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted/20"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-primary transition-all duration-500 ease-out-in"
                      strokeWidth="3.5"
                      strokeDasharray={`${progress}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono">
                    {progress}%
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Progress</h4>
                  <p className="text-sm font-semibold">{completed} of {tasks.length} Completed</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" asChild className="bg-gradient-primary text-primary-foreground font-semibold">
                  <Link to="/tasks/new">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Task
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Dashboard Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tasks"
            value={String(tasks.length)}
            subtext={`${completed} completed · ${tasks.length - completed} remaining`}
            icon={Briefcase}
            color="indigo"
          />
          <StatCard
            label="Issues & Incidents"
            value={String(linkedIssues.length)}
            subtext={`${linkedIssues.filter((i) => i.slaBreached).length} SLA Breached · ${linkedIssues.filter((i) => !i.resolved).length} Active`}
            icon={ShieldAlert}
            color={linkedIssues.filter((i) => i.slaBreached).length > 0 ? "red" : "amber"}
          />
          <StatCard
            label="Logged vs Estimated"
            value={`${loggedHours.toFixed(0)}h / ${estimateHours.toFixed(0)}h`}
            subtext={`${estimateHours > 0 ? Math.round((loggedHours / estimateHours) * 100) : 0}% burn rate of estimation`}
            icon={Clock}
            color="emerald"
          />
          <StatCard
            label="Active Sprint"
            value={activeSprint ? (activeSprint.name.length > 15 ? activeSprint.name.slice(0, 15) + "..." : activeSprint.name) : "None"}
            subtext={activeSprint ? `Goal: ${activeSprint.goal ?? "N/A"}` : "No active sprint running"}
            icon={PlayCircle}
            color="violet"
            truncateValue
          />
        </div>

        {/* Main Tabs Layout */}
        <Tabs defaultValue="dashboard" className="space-y-5">
          {/* ── Redesigned pill-style tab bar – no scrollbar ── */}
          <div className="border-b border-border/60">
            <TabsList className="flex flex-wrap items-center gap-1 bg-transparent p-0 pb-0 h-auto">
              <TabsTrigger
                value="dashboard"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <Milestone className="h-3.5 w-3.5" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <Briefcase className="h-3.5 w-3.5" />
                Tasks
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">{tasks.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="issues"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Issues
                {linkedIssues.length > 0 && <span className="ml-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-destructive">{linkedIssues.length}</span>}
              </TabsTrigger>
              <TabsTrigger
                value="workload"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <Users className="h-3.5 w-3.5" />
                Workload
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Documents
                {projectAttachments.length > 0 && <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">{projectAttachments.length}</span>}
              </TabsTrigger>
              <TabsTrigger
                value="timelogs"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <Clock className="h-3.5 w-3.5" />
                Timelogs
                {projectTimeEntries.length > 0 && <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">{projectTimeEntries.length}</span>}
              </TabsTrigger>
              <TabsTrigger
                value="teams"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Teams
                {projectTeams.length > 0 && <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">{projectTeams.length}</span>}
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="group relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground transition-all
                  hover:text-foreground hover:bg-muted/40
                  data-[state=active]:text-primary data-[state=active]:bg-primary/8 data-[state=active]:font-semibold
                  data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary data-[state=active]:after:rounded-t-full"
              >
                <Activity className="h-3.5 w-3.5" />
                Activity
                {activityEvents.length > 0 && <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-primary">{activityEvents.length}</span>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: DASHBOARD & ROADMAP */}
          <TabsContent value="dashboard" className="space-y-6 p-0 outline-none">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Roadmap & Timeline */}
              <div className="space-y-6 lg:col-span-2">
                {/* Milestone & Phase Tracking Widget */}
                <Card className="p-6 glass-card-green">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Milestone className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-base">Project Milestone Roadmap</h3>
                    </div>

                    <Dialog open={newPhaseOpen} onOpenChange={setNewPhaseOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs bg-background/50 border-white/10 rounded-xl gap-1">
                          <Plus className="h-3.5 w-3.5" /> Add Phase
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass-card border border-white/10 shadow-[0_8px_32px_0_rgba(16,185,129,0.12)] bg-card/75 backdrop-blur-md rounded-2xl p-6 sm:max-w-[450px]">
                        <form onSubmit={handleAddPhase} className="space-y-4">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-foreground">Add Project Phase</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                              Define a new development sprint or milestone objective for this project.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="phaseName" className="text-[10px] uppercase font-bold text-muted-foreground">Phase Name</Label>
                              <Input id="phaseName" placeholder="e.g. Phase 4: Integration testing" value={newPhaseName} onChange={(e) => setNewPhaseName(e.target.value)} className="h-9 text-xs bg-background/50 border-white/10 rounded-lg" required />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="phaseGoal" className="text-[10px] uppercase font-bold text-muted-foreground">Goal / Deliverables</Label>
                              <Input id="phaseGoal" placeholder="e.g. Complete ingress route migration" value={newPhaseGoal} onChange={(e) => setNewPhaseGoal(e.target.value)} className="h-9 text-xs bg-background/50 border-white/10 rounded-lg" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor="phaseStart" className="text-[10px] uppercase font-bold text-muted-foreground">Start Date</Label>
                                <Input id="phaseStart" type="date" value={newPhaseStart} onChange={(e) => setNewPhaseStart(e.target.value)} className="h-9 text-xs bg-background/50 border-white/10 rounded-lg" required />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="phaseEnd" className="text-[10px] uppercase font-bold text-muted-foreground">End Date</Label>
                                <Input id="phaseEnd" type="date" value={newPhaseEnd} onChange={(e) => setNewPhaseEnd(e.target.value)} className="h-9 text-xs bg-background/50 border-white/10 rounded-lg" required />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="phaseHours" className="text-[10px] uppercase font-bold text-muted-foreground">Estimated Hours</Label>
                              <Input id="phaseHours" type="number" value={newPhaseHours} onChange={(e) => setNewPhaseHours(e.target.value)} className="h-9 text-xs bg-background/50 border-white/10 rounded-lg" />
                            </div>
                          </div>

                          <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setNewPhaseOpen(false)} className="text-xs">Cancel</Button>
                            <Button type="submit" className="bg-gradient-primary text-primary-foreground text-xs font-semibold rounded-lg px-4">
                              Create Phase
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="relative pl-6 border-l border-border space-y-6 py-2">
                    {sprintsRoadmap.map((m, idx) => {
                      const isActive = m.status === "ACTIVE";
                      const isDone = m.status === "COMPLETED";
                      return (
                        <div key={m.id || idx} className="border-l border-border pl-4 pb-4 last:pb-0 relative">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[25px] top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-background text-[9px] font-bold text-white transition-all
                            ${isDone ? "bg-green-500" : isActive ? "bg-primary ring-4 ring-primary/20" : "bg-muted"}`}>
                            {isDone && <CheckCircle2 className="h-3.5 w-3.5 fill-current bg-background rounded-full" />}
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </div>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-muted/5 p-2 rounded-xl transition-all"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest("button")) return;
                              setSelectedPhase(m);
                              setIsPhaseOpen(true);
                            }}
                          >
                            <div>
                              <p className={`text-sm font-medium ${isActive ? "text-primary font-bold" : "text-foreground"}`}>{m.name}</p>
                              {m.goal && <p className="text-[11px] text-muted-foreground mt-0.5">{m.goal}</p>}
                              <span className="text-[10px] text-muted-foreground">{m.date}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-medium text-muted-foreground">{m.pct}% complete</span>
                              <Badge variant={isDone ? "outline" : isActive ? "default" : "secondary"} className={`text-[10px] uppercase ${isDone ? "border-green-500/35 bg-green-50 text-green-700" : ""}`}>
                                {m.status}
                              </Badge>
                              {m.status === "PLANNED" && m.id && (
                                <Button
                                  // size="xs"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] border-primary/20 text-primary hover:bg-primary/5 rounded-lg font-semibold"
                                  onClick={async () => {
                                    try {
                                      await updateSprintMutation.mutateAsync({
                                        id: m.id,
                                        payload: { status: "ACTIVE" }
                                      });
                                      toast.success(`Phase "${m.name}" is now active!`);
                                    } catch {
                                      toast.error("Failed to activate phase");
                                    }
                                  }}
                                >
                                  Activate
                                </Button>
                              )}
                              {m.status === "ACTIVE" && m.id && (
                                <Button
                                  // size="xs"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] border-green-500/20 text-green-600 hover:bg-green-50 rounded-lg font-semibold"
                                  onClick={async () => {
                                    try {
                                      await updateSprintMutation.mutateAsync({
                                        id: m.id,
                                        payload: { status: "COMPLETED" }
                                      });
                                      toast.success(`Phase "${m.name}" completed!`);
                                    } catch {
                                      toast.error("Failed to complete phase");
                                    }
                                  }}
                                >
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Mini Progress */}
                          <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${isDone ? "bg-green-600" : "bg-primary"}`} style={{ width: `${m.pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Team Workload capacity list preview */}
                <Card className="glass-card-green p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-base">Resource Allocation & Load</h3>
                    </div>
                    <Link to="/people" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Manage Team <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {teamWorkload.slice(0, 3).map((member) => (
                      <div key={member.id} className="flex items-center gap-4">
                        <Avatar className="h-9 w-9 shrink-0 border border-border">
                          <AvatarFallback className="bg-muted text-xs font-bold">{member.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium truncate">{member.name}</span>
                            <span className="font-mono text-muted-foreground">{member.hours}h assigned</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={member.capacityPct} className={`h-1.5 flex-1 ${member.overloaded ? "bg-red-200" : "bg-secondary"}`} />
                            <span className={`text-[10px] font-semibold w-8 text-right font-mono ${member.overloaded ? "text-red-600" : "text-muted-foreground"}`}>
                              {member.capacityPct}%
                            </span>
                          </div>
                        </div>
                        {member.overloaded && (
                          <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0">
                            Overload
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Column: Financial Health & Warnings */}
              <div className="space-y-6">
                {/* Budget overview & statistics */}
                <Card className="glass-card-green p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <BadgeDollarSign className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-semibold text-base">Project Budget & Cost</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Planned Budget</p>
                        <p className="text-xl font-bold text-foreground">${plannedBudget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Actual Spent</p>
                        <p className="text-xl font-bold text-emerald-600">${actualCost.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Budget utilization</span>
                        <span className="font-mono font-bold text-emerald-700">{budgetProgress}%</span>
                      </div>
                      <Progress value={budgetProgress} className="h-2 bg-muted" />
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/30 p-3 text-xs text-emerald-800">
                      <span className="font-bold">Financial health: Excellent</span>. Logged hours are well within the planned budget constraints.
                    </div>
                  </div>
                </Card>

                {/* Overdue/Critical Items Widget */}
                {overdueTasks.length > 0 || linkedIssues.filter((i) => !i.resolved).length > 0 ? (
                  <Card className="glass-card-green p-6 border border-destructive/30! bg-destructive/5">
                    <div className="mb-3 flex items-center gap-2 text-destructive">
                      <Flame className="h-5 w-5 animate-pulse" />
                      <h3 className="font-semibold text-base text-destructive">Immediate Action Required</h3>
                    </div>
                    <div className="space-y-3">
                      {overdueTasks.slice(0, 2).map((t) => (
                        <div key={t.id} className="rounded-lg border border-destructive/15 bg-background p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-destructive">OVERDUE</span>
                            <span className="font-mono text-muted-foreground">{t.displayId}</span>
                          </div>
                          <p className="mt-1 font-medium truncate text-foreground">{t.title}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">Due: {formatDateSafely(t.dueDate, "MMM d, yyyy")}</p>
                        </div>
                      ))}
                      {linkedIssues.filter((i) => !i.resolved).slice(0, 2).map((i) => {
                        const issueTask = tasks.find((t) => t.id === i.taskId);
                        return (
                          <div key={i.id} className="rounded-lg border border-amber-300/35 bg-background p-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-700 uppercase">UNRESOLVED BUG</span>
                              <Badge variant="outline" className="text-[9px] uppercase border-red-200 text-red-600 bg-red-50">
                                {i.severity}
                              </Badge>
                            </div>
                            <p className="mt-1 font-medium truncate text-foreground">{issueTask?.title ?? "System Incident"}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">SLA Breached: {i.slaBreached ? "Yes" : "No"}</p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 border border-green-500/20 bg-green-50/10 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                    <h4 className="mt-2 text-sm font-semibold text-foreground">All items on track</h4>
                    <p className="mt-1 text-xs text-muted-foreground">No overdue items or unresolved critical SLAs found.</p>
                  </Card>
                )}

                {/* Upcoming Deadlines */}
                <Card className="glass-card-green p-6">
                  <h3 className="font-semibold text-sm mb-3">Upcoming Milestones & Deadlines</h3>
                  <div className="space-y-3">
                    {upcomingTasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                        <div className="min-w-0">
                          <Link to="/tasks/$id" params={{ id: t.id }} className="text-xs font-semibold text-foreground hover:text-primary truncate block hover:underline">
                            {t.title}
                          </Link>
                          <span className="text-[10px] text-muted-foreground">{t.displayId}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {formatDateSafely(t.dueDate, "MMM d")}
                        </Badge>
                      </div>
                    ))}
                    {!upcomingTasks.length && <p className="text-xs text-muted-foreground">No upcoming deadlines.</p>}
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: TASKS PIPELINE */}
          <TabsContent value="tasks" className="p-0 outline-none">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {statuses.map((status) => {
                const items = tasks.filter((task) => task.statusId === status.id);
                return (
                  <Card key={status.id} className="flex flex-col border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: status.color }} />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{status.name}</h4>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-mono">{items.length}</Badge>
                    </div>
                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
                      {items.map((task) => (
                        <Card key={task.id} className="p-3 shadow-sm hover:border-primary/30 transition hover:shadow-md bg-card">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {task.displayId ?? task.id.toUpperCase()}
                            </span>
                            {task.priority && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 border-orange-200 text-orange-700 bg-orange-50 font-bold">
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                          <Link to="/tasks/$id" params={{ id: task.id }} className="mt-2 block text-xs font-semibold text-foreground hover:text-primary hover:underline">
                            {task.title}
                          </Link>
                          {task.dueDate && (
                            <p className="mt-2 text-[9px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Due {formatDateSafely(task.dueDate, "MMM d")}
                            </p>
                          )}
                        </Card>
                      ))}
                      {!items.length && (
                        <p className="text-[11px] text-muted-foreground text-center py-6 border border-dashed border-border/40 rounded-lg">
                          No tasks in this stage
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 3: LINKED ISSUES */}
          <TabsContent value="issues" className="p-0 outline-none">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-base">Unresolved Bugs & Incident Logs</h3>
                <Badge variant="destructive">{linkedIssues.length} issues</Badge>
              </div>
              <div className="space-y-3">
                {linkedIssues.map((issue) => {
                  const task = tasks.find((t) => t.id === issue.taskId);
                  return (
                    <div key={issue.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border p-4 rounded-xl hover:border-primary/20 transition">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to="/incidents/$id" params={{ id: issue.taskId }} className="font-semibold text-sm hover:text-primary hover:underline">
                            {task?.title ?? `Issue ${issue.id.toUpperCase()}`}
                          </Link>
                          <Badge variant="outline" className="text-[9px] border-red-200 text-red-700 bg-red-50 uppercase">
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">ID: {issue.id.toUpperCase()} · Environment: {issue.environment}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">SLA Breach Target</p>
                          <p className="text-xs font-mono font-semibold">{formatDateSafely(issue.slaTargetFix, "MMM d, yyyy · h:mm a")}</p>
                        </div>
                        <Badge variant={issue.slaBreached ? "destructive" : "secondary"} className="text-[10px] uppercase font-bold px-2 py-0.5">
                          {issue.slaBreached ? "SLA Breached" : "Active SLA"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {!linkedIssues.length && (
                  <p className="text-sm text-muted-foreground text-center py-8">No unresolved bugs reported on this project.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: WORKLOAD CAPACITY */}
          <TabsContent value="workload" className="p-0 outline-none">
            <Card className="p-6">
              <h3 className="font-semibold text-base mb-4">Detailed Member Capacity Roster</h3>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {teamWorkload.map((m) => (
                  <Card key={m.id} className={`p-4 border ${m.overloaded ? "border-red-200 bg-red-50/10" : "border-border"} space-y-4`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="bg-muted text-sm font-bold">{m.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{m.name}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">{m.role?.replace(/_/g, " ") ?? "MEMBER"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/40 p-2 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block uppercase font-medium">Active Tasks</span>
                        <span className="font-bold font-mono text-base">{m.taskCount}</span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded-lg">
                        <span className="text-[10px] text-muted-foreground block uppercase font-medium">Est. Hours</span>
                        <span className="font-bold font-mono text-base">{m.hours}h</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Workload Limit</span>
                        <span className={`font-mono font-bold ${m.overloaded ? "text-red-600 animate-pulse" : "text-foreground"}`}>
                          {m.capacityPct}%
                        </span>
                      </div>
                      <Progress value={m.capacityPct} className={`h-1.5 ${m.overloaded ? "bg-red-200" : "bg-secondary"}`} />
                    </div>

                    {m.overloaded && (
                      <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-semibold bg-red-50 border border-red-200 p-2 rounded-md">
                        <AlertTriangle className="h-3.5 w-3.5" /> Overloaded (&gt;35h allocation threshold). Avoid assigning new tasks.
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 5: PROJECT DOCUMENTS */}
          <TabsContent value="documents" className="p-0 outline-none animate-in fade-in-50 duration-200">
            <Card className="p-6 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 hover:border-primary/10 transition-all space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-primary" /> Project Documents & Attachments
                  </h3>
                  <p className="text-xs text-muted-foreground">Manage and download assets uploaded for this project timeline.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover:shadow-glow transition-all gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Upload Document
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="project-doc-uploader"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUploadProjDoc}
                  />
                </div>
              </div>

              {projectAttachments.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-2xl bg-muted/15 flex flex-col items-center justify-center space-y-3">
                  <UploadCloud className="h-10 w-10 text-muted-foreground animate-bounce" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No project documents uploaded yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs">Upload system design docs, architecture specs, or plans here to share them with the team.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-primary border-primary/20 hover:bg-primary/5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projectAttachments.map((doc) => {
                    const isLoading = loadingPreview === doc.id;
                    return (
                      <Card
                        key={doc.id}
                        className="group flex flex-col justify-between p-4 border border-white/5 bg-background/50 hover:bg-muted/15 hover:border-primary/20 rounded-xl transition-all shadow-sm"
                      >
                        <button
                          disabled={isLoading}
                          onClick={() => handlePreview(doc.url, doc.fileName, doc.mimeType, doc.id)}
                          className="flex items-start gap-3 min-w-0 text-left w-full hover:bg-muted/5 rounded-lg p-1 transition-colors"
                        >
                          <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-0.5 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs text-foreground truncate hover:underline hover:text-primary" title={doc.fileName}>
                                {doc.fileName}
                              </p>
                              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {humanSize(doc.sizeBytes)} · {formatDateSafely(doc.uploadedAt, "MMM d, yyyy", "Date unknown")}
                            </p>
                          </div>
                        </button>

                        <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/10">
                          <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider font-mono">
                            {doc.mimeType.split("/")[1] || "asset"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              onClick={() => downloadAuthenticatedFile(doc.url, doc.fileName)}
                              title="Download Asset"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteProjDoc(doc.id, doc.fileName)}
                              title="Delete Document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 6: PROJECT TIMELOGS */}
          <TabsContent value="timelogs" className="p-0 outline-none">
            <Card className="p-6 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 hover:border-primary/10 transition-all space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-600" /> Project Time Tracking & Logs
                  </h3>
                  <p className="text-xs text-muted-foreground">Detailed logs of billable and non-billable hours recorded by team members on this project.</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Project Spent</span>
                  <span className="text-base font-bold text-emerald-600 font-mono">
                    {projectTimeEntries.reduce((sum, te) => sum + (te.hours || 0), 0).toFixed(1)} hrs
                  </span>
                </div>
              </div>

              {projectTimeEntries.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-2xl bg-muted/15 flex flex-col items-center justify-center space-y-3">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No hours logged yet</p>
                    <p className="text-xs text-muted-foreground">Timesheet entries will appear here once team members log hours on tasks in this project.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-bold">
                        <th className="py-2.5">Task</th>
                        <th className="py-2.5">Logged By</th>
                        <th className="py-2.5">Time Period</th>
                        <th className="py-2.5">Duration</th>
                        <th className="py-2.5">Billable</th>
                        <th className="py-2.5">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectTimeEntries.map((te) => {
                        const task = tasks.find((t) => t.id === te.taskId);
                        const userObj = users.find((u) => u.id === te.userId);
                        const startStr = formatDateSafely(te.startTime, "MMM d, h:mm a", "—");
                        const endStr = formatDateSafely(te.endTime, "h:mm a", "Active");

                        return (
                          <tr key={te.id} className="border-b border-border/30 hover:bg-muted/5 transition">
                            <td className="py-3 font-semibold text-foreground">
                              {task ? (
                                <Link to="/tasks/$id" params={{ id: task.id }} className="hover:underline text-primary">
                                  {task.title}
                                </Link>
                              ) : (
                                "Unknown Task"
                              )}
                              <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                                {task?.displayId || te.taskId}
                              </span>
                            </td>
                            <td className="py-3 font-medium text-foreground">
                              {userObj?.name ?? te.userId ?? "Unknown"}
                            </td>
                            <td className="py-3 text-muted-foreground font-mono">
                              {startStr} — {endStr}
                            </td>
                            <td className="py-3 font-bold font-mono text-foreground">
                              {te.hours ? `${te.hours.toFixed(1)}h` : "In Progress"}
                            </td>
                            <td className="py-3">
                              <Badge variant={te.billable ? "default" : "secondary"} className="text-[9px] uppercase px-1.5 py-0 font-bold">
                                {te.billable ? "Yes" : "No"}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground italic truncate max-w-xs" title={te.description || ""}>
                              {te.description || "No description"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 7: PROJECT TEAMS */}
          <TabsContent value="teams" className="p-0 outline-none animate-in fade-in-50 duration-200">
            <Card className="p-6 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 hover:border-primary/10 transition-all space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Project Teams
                  </h3>
                  <p className="text-xs text-muted-foreground">Manage which organizational teams are assigned to this project.</p>
                </div>
                <div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover:shadow-glow transition-all gap-1.5">
                        <Plus className="h-4 w-4" /> Assign Team
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px]">
                      <DialogHeader>
                        <DialogTitle>Assign Team to Project</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <Label>Select Team</Label>
                          <Select
                            onValueChange={async (teamId) => {
                              try {
                                await addProjectTeamMutation.mutateAsync({ projectId: id, teamId });
                                toast.success("Team assigned successfully!");
                              } catch {
                                toast.error("Failed to assign team.");
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a team..." />
                            </SelectTrigger>
                            <SelectContent>
                              {teams
                                .filter((t) => !projectTeams.some((pt: any) => pt.teamId === t.id))
                                .map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {projectTeams.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-2xl bg-muted/15 flex flex-col items-center justify-center space-y-3">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No teams assigned yet</p>
                    <p className="text-xs text-muted-foreground">Assign teams to organize resources and work allocation.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projectTeams.map((pt: any) => {
                    const teamObj = teams.find((t) => t.id === pt.teamId);
                    if (!teamObj) return null;
                    const leadUser = users.find((u) => u.id === teamObj.leadUserId);
                    const teamMembers = users.filter((u) => u.teamId === teamObj.id);

                    return (
                      <Card
                        key={pt.id}
                        className="group flex flex-col justify-between p-5 border border-white/5 bg-background/50 hover:bg-muted/15 hover:border-primary/20 rounded-xl transition-all shadow-sm"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div>
                              <h4 className="font-bold text-sm text-foreground truncate">
                                {teamObj.name}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {teamObj.description || "No description provided."}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to remove team "${teamObj.name}" from this project?`)) {
                                  try {
                                    await removeProjectTeamMutation.mutateAsync({ projectId: id, teamId: teamObj.id });
                                    toast.success("Team removed from project");
                                  } catch {
                                    toast.error("Failed to remove team");
                                  }
                                }
                              }}
                              title="Remove Team"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-border/10">
                            <Avatar className="h-6 w-6 border border-emerald-500/20 shrink-0">
                              <AvatarFallback className="bg-emerald-500/10 text-[9px] text-emerald-700 font-bold">
                                {leadUser?.name?.slice(0, 2).toUpperCase() || "TL"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold truncate text-foreground">
                                {leadUser?.name || "Unassigned"}
                              </p>
                              <p className="text-[8px] text-muted-foreground">Team Lead</p>
                            </div>
                            <Badge variant="secondary" className="text-[9px] py-0.5 px-1.5 font-bold">
                              {teamMembers.length} Members
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 8: ACTIVITY STREAM */}
          <TabsContent value="activity" className="p-0 outline-none animate-in fade-in-50 duration-200">
            <Card className="p-6 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Project Activity Stream
                  </h3>
                  <p className="text-xs text-muted-foreground">Real-time feed of all task events, status changes, comments and phase activations.</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Events</span>
                  <span className="text-base font-bold text-primary font-mono">{activityEvents.length}</span>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap gap-1.5">
                {([
                  { label: "All", value: "all" },
                  { label: "Tasks Created", value: "task_created" },
                  { label: "Status Changed", value: "status_changed" },
                  { label: "Issues", value: "issue_created" },
                  { label: "Phases", value: "phase_activated" },
                ] as Array<{ label: string; value: ActivityEventType | "all" }>).map(f => (
                  <button
                    key={f.value}
                    onClick={() => setActivityFilter(f.value)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                      activityFilter === f.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Event Feed */}
              {activityEvents.filter(e => activityFilter === "all" || e.type === activityFilter).length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/40 rounded-2xl bg-muted/15 flex flex-col items-center justify-center space-y-3">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground">Events will appear here as tasks are created, updated, or commented on.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 relative">
                  <div className="absolute left-[23px] top-4 bottom-4 w-px bg-border/40 pointer-events-none" />
                  {activityEvents
                    .filter(e => activityFilter === "all" || e.type === activityFilter)
                    .slice(0, 50)
                    .map(evt => {
                      const typeConfig: Record<ActivityEventType, { icon: any; color: string; bgColor: string }> = {
                        task_created: { icon: Plus, color: "text-emerald-600", bgColor: "bg-emerald-500/10 border-emerald-500/20" },
                        status_changed: { icon: GitBranch, color: "text-blue-500", bgColor: "bg-blue-500/10 border-blue-500/20" },
                        comment_added: { icon: MessageSquare, color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/20" },
                        phase_activated: { icon: Zap, color: "text-violet-500", bgColor: "bg-violet-500/10 border-violet-500/20" },
                        member_added: { icon: Users, color: "text-teal-500", bgColor: "bg-teal-500/10 border-teal-500/20" },
                        issue_created: { icon: ShieldAlert, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/20" },
                      };
                      const cfg = typeConfig[evt.type] || typeConfig.task_created;
                      const IconComp = cfg.icon;
                      let safeAt = "";
                      try {
                        const d = new Date(evt.at);
                        safeAt = isNaN(d.getTime()) ? "" : formatDistanceToNow(d, { addSuffix: true });
                      } catch {}

                      return (
                        <div key={evt.id} className="flex items-start gap-3 group hover:bg-muted/10 rounded-xl p-2.5 transition-colors relative">
                          <div className={`shrink-0 h-9 w-9 rounded-full border flex items-center justify-center z-10 bg-background ${cfg.bgColor}`}>
                            <IconComp className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xs text-foreground leading-snug">
                              {evt.actor && <span className="font-semibold text-foreground">{evt.actor} </span>}
                              <span className="text-muted-foreground">{evt.message}</span>
                            </p>
                            {(evt.from || evt.to) && (
                              <div className="flex items-center gap-1 mt-1">
                                {evt.from && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{evt.from}</span>}
                                {evt.from && evt.to && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                                {evt.to && <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-mono">{evt.to}</span>}
                              </div>
                            )}
                            {evt.taskDisplayId && (
                              <Link
                                to="/tasks/$id"
                                params={{ id: evt.taskId! }}
                                className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary mt-0.5 transition-colors"
                              >
                                #{evt.taskDisplayId}
                              </Link>
                            )}
                          </div>
                          {safeAt && (
                            <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {safeAt}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Phase Detail Dialog */}
      <Dialog open={isPhaseOpen} onOpenChange={setIsPhaseOpen}>
        <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden bg-card/95 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col">
          {selectedPhase && (() => {
            const sprint = sprints.find(s => s.id === selectedPhase.id);
            // Use sprintId linkage (correct) instead of non-existent sprint.taskIds
            const sprintTasks = tasks.filter(t => t.sprintId === sprint?.id || t.sprintId === selectedPhase.id);
            const standardTasks = sprintTasks.filter(t => t.taskType !== "ISSUE");
            const sprintIssues = sprintTasks.filter(t => t.taskType === "ISSUE");
            
            const currentIdx = sprintsRoadmap.findIndex(m => m.id === selectedPhase.id);
            const prevPhase = currentIdx > 0 ? sprintsRoadmap[currentIdx - 1] : null;
            const nextPhase = currentIdx < sprintsRoadmap.length - 1 ? sprintsRoadmap[currentIdx + 1] : null;

            const taskStatusMap: Record<string, { count: number; color: string }> = {};
            standardTasks.forEach(t => {
              const st = statuses.find(x => x.id === t.statusId);
              const name = st?.name || "Open";
              const color = st?.color || "#cbd5e1";
              if (!taskStatusMap[name]) taskStatusMap[name] = { count: 0, color };
              taskStatusMap[name].count++;
            });
            const taskStatusData = Object.entries(taskStatusMap).map(([name, val]) => ({ name, value: val.count, color: val.color }));

            let openCount = 0;
            let closedCount = 0;
            standardTasks.forEach(t => {
              const st = statuses.find(x => x.id === t.statusId);
              const isDone = t.statusId === "s-done" || st?.name?.toLowerCase().includes("done") || st?.name?.toLowerCase().includes("closed");
              if (isDone) closedCount++;
              else openCount++;
            });
            const openClosedData = [
              { name: "Open", value: openCount, color: "#f87171" },
              { name: "Closed", value: closedCount, color: "#3b82f6" }
            ].filter(d => d.value > 0);

            const ownerMap: Record<string, number> = {};
            standardTasks.forEach(t => {
              t.assigneeIds.forEach(uid => {
                const u = users.find(x => x.id === uid);
                const name = u?.name || "Unassigned";
                ownerMap[name] = (ownerMap[name] || 0) + 1;
              });
              if (t.assigneeIds.length === 0) {
                ownerMap["Unassigned"] = (ownerMap["Unassigned"] || 0) + 1;
              }
            });
            const colorsList = ["#84cc16", "#eab308", "#06b6d4", "#a855f7", "#ec4899", "#f97316", "#10b981", "#3b82f6", "#6366f1"];
            const ownerData = Object.entries(ownerMap).map(([name, count], idx) => ({
              name,
              value: count,
              color: colorsList[idx % colorsList.length]
            }));

            const issueStatusMap: Record<string, { count: number; color: string }> = {};
            sprintIssues.forEach(t => {
              const st = statuses.find(x => x.id === t.statusId);
              const name = st?.name || "Open";
              const color = st?.color || "#f97316";
              if (!issueStatusMap[name]) issueStatusMap[name] = { count: 0, color };
              issueStatusMap[name].count++;
            });
            const issueStatusData = Object.entries(issueStatusMap).map(([name, val]) => ({ name, value: val.count, color: val.color }));

            return (
              <>
                <div className="flex items-center justify-between border-b border-border/40 p-4 bg-muted/20 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 rounded-full border border-border flex items-center justify-center font-mono text-xs font-bold text-teal-600 bg-teal-500/5">
                      {selectedPhase.pct}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Milestone className="h-3 w-3" /> Phase
                        </span>
                        <h2 className="text-base font-bold text-foreground">{selectedPhase.name}</h2>
                        <Badge variant={selectedPhase.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                          {selectedPhase.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Flag: <span className="font-semibold text-foreground">Internal</span></span>
                        <span>·</span>
                        <span>Project: <span className="font-semibold text-foreground">{project?.name}</span></span>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-border/80 bg-background/50 rounded-lg p-0.5 mr-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-md"
                        disabled={!prevPhase}
                        onClick={() => prevPhase && setSelectedPhase(prevPhase)}
                        title="Previous Phase"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-md"
                        disabled={!nextPhase}
                        onClick={() => nextPhase && setSelectedPhase(nextPhase)}
                        title="Next Phase"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsPhaseOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  <Tabs value={phaseActiveTab} onValueChange={setPhaseActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="border-b border-border bg-transparent p-0 px-4 shrink-0 justify-start gap-3 h-10">
                      <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Task Lists ({standardTasks.length})
                      </TabsTrigger>
                      <TabsTrigger value="issues-release" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Issues (Release Phase) ({sprintIssues.length})
                      </TabsTrigger>
                      <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Release Notes
                      </TabsTrigger>
                      <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Comments
                      </TabsTrigger>
                      <TabsTrigger value="fields" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Fields
                      </TabsTrigger>
                      <TabsTrigger value="chart" className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent">
                        Chart View
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                      
                      <TabsContent value="chart" className="mt-0 outline-none space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <Card className="p-4 bg-muted/10 border-border/60">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Task Status</h4>
                            {taskStatusData.length === 0 ? (
                              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic">No tasks in this phase.</div>
                            ) : (
                              <div className="flex items-center justify-between gap-4">
                                <ResponsiveContainer width="55%" height={180}>
                                  <PieChart>
                                    <Pie data={taskStatusData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                      {taskStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-1.5 max-h-[160px] overflow-y-auto text-xs pr-2">
                                  {taskStatusData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2">
                                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                                        <span className="truncate">{d.name}</span>
                                      </span>
                                      <span className="font-mono font-semibold">{d.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>

                          <Card className="p-4 bg-muted/10 border-border/60">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Task List By Status</h4>
                            {openClosedData.length === 0 ? (
                              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic">No tasks in this phase.</div>
                            ) : (
                              <div className="flex items-center justify-between gap-4">
                                <ResponsiveContainer width="55%" height={180}>
                                  <PieChart>
                                    <Pie data={openClosedData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                      {openClosedData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-1.5 text-xs pr-2">
                                  {openClosedData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2">
                                      <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                                        <span>{d.name}</span>
                                      </span>
                                      <span className="font-mono font-semibold">{d.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>

                          <Card className="p-4 bg-muted/10 border-border/60">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Task Count by Owner</h4>
                            {ownerData.length === 0 ? (
                              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic">No assigned tasks.</div>
                            ) : (
                              <div className="flex items-center justify-between gap-4">
                                <ResponsiveContainer width="55%" height={180}>
                                  <PieChart>
                                    <Pie data={ownerData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                      {ownerData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-1.5 max-h-[160px] overflow-y-auto text-xs pr-2">
                                  {ownerData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2">
                                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                                        <span className="truncate">{d.name}</span>
                                      </span>
                                      <span className="font-mono font-semibold">{d.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>

                          <Card className="p-4 bg-muted/10 border-border/60">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Issue Status</h4>
                            {issueStatusData.length === 0 ? (
                              <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic">No issues associated with this phase.</div>
                            ) : (
                              <div className="flex items-center justify-between gap-4">
                                <ResponsiveContainer width="55%" height={180}>
                                  <PieChart>
                                    <Pie data={issueStatusData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={2}>
                                      {issueStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-1.5 max-h-[160px] overflow-y-auto text-xs pr-2">
                                  {issueStatusData.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2">
                                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                                        <span className="truncate">{d.name}</span>
                                      </span>
                                      <span className="font-mono font-semibold">{d.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="tasks" className="mt-0 outline-none">
                        <div className="border border-border/50 rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                              <tr>
                                <th className="px-4 py-2.5">Display ID</th>
                                <th className="px-4 py-2.5">Task Name</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5">Priority</th>
                                <th className="px-4 py-2.5">Due Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {standardTasks.map(t => {
                                const st = statuses.find(x => x.id === t.statusId);
                                return (
                                  <tr key={t.id} className="hover:bg-muted/10">
                                    <td className="px-4 py-2.5 font-mono text-[10.5px]">{t.displayId || t.id.substring(0,8)}</td>
                                    <td className="px-4 py-2.5 font-medium">{t.title}</td>
                                    <td className="px-4 py-2.5">
                                      <Badge style={{ background: st?.color + "15", color: st?.color, borderColor: st?.color + "30" }} variant="outline" className="text-[10px]">
                                        {st?.name || "Open"}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 capitalize">{t.priority?.toLowerCase() || "medium"}</td>
                                    <td className="px-4 py-2.5 font-mono text-[10.5px]">{formatDateSafely(t.dueDate, "yyyy-MM-dd", "—")}</td>
                                  </tr>
                                );
                              })}
                              {standardTasks.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground italic">No tasks inside this phase.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      <TabsContent value="issues-release" className="mt-0 outline-none">
                        <div className="border border-border/50 rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground">
                              <tr>
                                <th className="px-4 py-2.5">Display ID</th>
                                <th className="px-4 py-2.5">Issue Title</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5">Priority</th>
                                <th className="px-4 py-2.5">Severity</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {sprintIssues.map(t => {
                                const st = statuses.find(x => x.id === t.statusId);
                                return (
                                  <tr key={t.id} className="hover:bg-muted/10">
                                    <td className="px-4 py-2.5 font-mono text-[10.5px]">{t.displayId || t.id.substring(0,8)}</td>
                                    <td className="px-4 py-2.5 font-medium">{t.title}</td>
                                    <td className="px-4 py-2.5">
                                      <Badge style={{ background: st?.color + "15", color: st?.color, borderColor: st?.color + "30" }} variant="outline" className="text-[10px]">
                                        {st?.name || "Open"}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 capitalize">{t.priority?.toLowerCase() || "medium"}</td>
                                    <td className="px-4 py-2.5 font-mono text-[10.5px]">{t.severity || "SEV3"}</td>
                                  </tr>
                                );
                              })}
                              {sprintIssues.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground italic">No issues associated with this phase.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>

                      <TabsContent value="notes" className="mt-0 outline-none space-y-4">
                        <div className="p-4 bg-muted/15 border border-border/50 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-foreground">Phase Release Summary</h4>
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
                              const text = standardTasks.filter(t => t.statusId === "s-done").map(t => `- ${t.title} (${t.displayId || t.id.substring(0,8)})`).join("\n");
                              navigator.clipboard.writeText(text);
                              toast.success("Release notes copied to clipboard!");
                            }}>Copy to Clipboard</Button>
                          </div>
                          <div className="font-mono text-muted-foreground whitespace-pre-line leading-relaxed bg-background/50 p-3 rounded-lg border border-border/20">
                            {standardTasks.filter(t => t.statusId === "s-done").length > 0 
                              ? standardTasks.filter(t => t.statusId === "s-done").map(t => `- ${t.title} (${t.displayId || t.id.substring(0,8)})`).join("\n")
                              : "No completed tasks to report in this release yet."
                            }
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="comments" className="mt-0 outline-none space-y-4">
                        <div className="space-y-3">
                          <div className="border border-border/40 bg-background/50 rounded-xl p-3 flex flex-col gap-2">
                            <textarea placeholder="Write a comment..." className="w-full bg-transparent resize-none text-xs outline-none h-14" />
                            <div className="flex justify-end">
                              <Button size="sm" className="bg-gradient-primary text-primary-foreground text-[10.5px]">Post Comment</Button>
                            </div>
                          </div>
                          <div className="text-center text-muted-foreground text-xs py-6 italic">No comments posted yet.</div>
                        </div>
                      </TabsContent>

                      <TabsContent value="fields" className="mt-0 outline-none">
                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                          <div className="p-3 bg-muted/10 border border-border/45 rounded-xl flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">Start Date</span>
                            <span className="font-mono font-semibold">{sprint ? formatDateSafely(sprint.startDate, "yyyy-MM-dd HH:mm", "—") : "—"}</span>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/45 rounded-xl flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">End Date</span>
                            <span className="font-mono font-semibold">{sprint ? formatDateSafely(sprint.endDate, "yyyy-MM-dd HH:mm", "—") : "—"}</span>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/45 rounded-xl flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">Total Tasks</span>
                            <span className="font-mono font-semibold">{sprintTasks.length} tasks</span>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/45 rounded-xl flex items-center justify-between">
                            <span className="text-muted-foreground font-medium">Estimated Hours</span>
                            <span className="font-mono font-semibold">{sprint?.estimatedHours || 0}h</span>
                          </div>
                        </div>
                      </TabsContent>

                    </div>
                  </Tabs>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
            <DialogTitle className="truncate text-sm">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && preview.blobUrl &&
            (preview.mime.startsWith("image/") ? (
              <img
                src={preview.blobUrl}
                alt={preview.name}
                className="max-h-[70vh] w-full rounded object-contain"
              />
            ) : preview.mime === "application/pdf" ? (
              <iframe
                src={preview.blobUrl}
                className="h-[70vh] w-full rounded border border-border"
                title={preview.name}
              />
            ) : (
              <div className="rounded border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Preview not available for this file type.{" "}
                <button 
                  className="text-primary underline font-semibold" 
                  onClick={() => downloadAuthenticatedFile(preview.url, preview.name)}
                >
                  Download File
                </button>
              </div>
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({
  label, value, subtext, icon: Icon, color, truncateValue
}: {
  label: string;
  value: string;
  subtext: string;
  icon: any;
  color: "indigo" | "red" | "amber" | "emerald" | "violet";
  truncateValue?: boolean;
}) {
  const colorMap = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    red: "text-red-600 bg-red-50 border-red-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    violet: "text-violet-600 bg-violet-50 border-violet-100",
  };

  return (
    <Card className="p-5 border border-border/80 shadow-sm bg-card hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-[10px] overflow-hidden uppercase font-semibold text-muted-foreground tracking-wide">{label}</p>
          <p
            className={`mt-2 text-2xl font-bold tracking-tight text-foreground font-mono ${truncateValue ? "truncate" : ""}`}
            title={truncateValue ? value : undefined}
          >
            {value}
          </p>
        </div>
        <div className={`rounded-xl border p-2.5 shrink-0 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground truncate">{subtext}</p>
    </Card>
  );
}
