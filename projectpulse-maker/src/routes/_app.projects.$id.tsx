import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useIssues, useProject, useProjectMembers, useSprints, useStatuses, useTasks, useProjectAttachments, useUploadProjectAttachment, useDeleteProjectAttachment, useCreateSprint, useUpdateSprint, useUsers, useTimeEntries } from "@/lib/queries";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  TrendingUp, Users, Calendar, AlertTriangle, ArrowLeft, ArrowRight,
  Plus, CheckCircle2, ShieldAlert, BadgeDollarSign, Activity,
  Milestone, Briefcase, Clock, PlayCircle, Flame, Paperclip, Download, Trash2, FileText, X, UploadCloud
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const projectTaskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);
  const projectTimeEntries = useMemo(() => {
    return timeEntries.filter((te) => projectTaskIds.has(te.taskId));
  }, [timeEntries, projectTaskIds]);
  const uploadAttachment = useUploadProjectAttachment();
  const deleteAttachment = useDeleteProjectAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSprintMutation = useCreateSprint();
  const updateSprintMutation = useUpdateSprint();

  // Auto-activate phases/sprints according to timeline schedule
  useEffect(() => {
    if (sprints.length > 0) {
      const today = new Date();
      sprints.forEach((s) => {
        if (s.status === "PLANNED") {
          const start = new Date(s.startDate);
          const end = new Date(s.endDate);
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

  const sprintsRoadmap = useMemo(() => {
    if (sprints.length > 0) {
      return sprints.map((s) => {
        const completedTasks = tasks.filter((t) => s.taskIds?.includes(t.id) && t.statusId === "s-done").length;
        const totalTasks = s.taskIds?.length ?? 0;
        const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        return {
          id: s.id,
          name: s.name,
          date: `${format(new Date(s.startDate), "MMM d")} - ${format(new Date(s.endDate), "MMM d, yyyy")}`,
          status: s.status,
          pct,
          goal: s.goal
        };
      });
    }
    return milestones;
  }, [sprints, tasks, milestones]);

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
    return tasks.filter((task) => task.statusId === "s-done").length;
  }, [tasks]);

  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const estimateHours = tasks.reduce((sum, task) => sum + (task.estimatedHours ?? 0), 0);
  const loggedHours = tasks.reduce((sum, task) => sum + (task.loggedHours ?? 0), 0);
  const activeSprint = sprints.find((sprint) => sprint.status === "ACTIVE");

  // Deadlines and critical items
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((task) => task.dueDate && new Date(task.dueDate) > new Date() && task.statusId !== "s-done")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 3);
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.statusId !== "s-done");
  }, [tasks]);

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
                  Start: {format(new Date(project.startDate), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-destructive" />
                  Target Release: {format(new Date(project.endDate), "MMM d, yyyy")}
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
            value={activeSprint ? activeSprint.name : "None"}
            subtext={activeSprint ? `Goal: ${activeSprint.goal ?? "N/A"}` : "No active sprint running"}
            icon={PlayCircle}
            color="violet"
          />
        </div>

        {/* Main Tabs Layout */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex w-full items-center justify-start border-b border-border bg-transparent p-0 overflow-x-auto gap-2">
            <TabsTrigger value="dashboard" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/10">
              Dashboard & Roadmap
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/10">
              Task Pipeline
            </TabsTrigger>
            <TabsTrigger value="issues" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/10">
              Linked Issues ({linkedIssues.length})
            </TabsTrigger>
            <TabsTrigger value="workload" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/10">
              Team Workload & Capacity
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/10">
              Project Documents ({projectAttachments.length})
            </TabsTrigger>
            <TabsTrigger value="timelogs" className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/10">
              Project Timelogs ({projectTimeEntries.length})
            </TabsTrigger>
          </TabsList>

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
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
                          <p className="mt-0.5 text-[10px] text-muted-foreground">Due: {t.dueDate ? format(new Date(t.dueDate), "MMM d, yyyy") : "N/A"}</p>
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
                          {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "N/A"}
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
                              <Calendar className="h-3 w-3" /> Due {format(new Date(task.dueDate), "MMM d")}
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
                          <p className="text-xs font-mono font-semibold">{format(new Date(issue.slaTargetFix), "MMM d, yyyy · h:mm a")}</p>
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
                    return (
                      <Card
                        key={doc.id}
                        className="group flex flex-col justify-between p-4 border border-white/5 bg-background/50 hover:bg-muted/15 hover:border-primary/20 rounded-xl transition-all shadow-sm"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-bold text-xs text-foreground truncate" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {humanSize(doc.sizeBytes)} · {doc.uploadedAt ? format(new Date(doc.uploadedAt), "MMM d, yyyy") : "Date unknown"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/10">
                          <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider font-mono">
                            {doc.mimeType.split("/")[1] || "asset"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              asChild
                            >
                              <a href={doc.url} download={doc.fileName} title="Download Asset">
                                <Download className="h-4 w-4" />
                              </a>
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
                        const startStr = te.startTime ? format(new Date(te.startTime), "MMM d, h:mm a") : "—";
                        const endStr = te.endTime ? format(new Date(te.endTime), "h:mm a") : "Active";

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
        </Tabs>
      </main>
    </>
  );
}

function StatCard({
  label, value, subtext, icon: Icon, color
}: {
  label: string;
  value: string;
  subtext: string;
  icon: any;
  color: "indigo" | "red" | "amber" | "emerald" | "violet";
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
        <div>
          <p className="text-[10px] overflow-hidden  uppercase font-semibold text-muted-foreground tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">{value}</p>
        </div>
        <div className={`rounded-xl border p-2.5 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground truncate">{subtext}</p>
    </Card>
  );
}
