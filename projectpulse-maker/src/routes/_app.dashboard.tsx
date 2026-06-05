import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import {
  useIssues, useProjects, useStatuses, useTasks, useWorkload, useTeams, useUsers,
} from "@/lib/queries";
import { useWidgetReports } from "@/lib/widget-queries";
import { WidgetView, WIDGET_REGISTRY, BarChartView, DonutChartView, TrendChartView, ListView, CompletionView } from "@/components/tfp/widget-view";
import { findUser } from "@/lib/mock-data";
import { ZWidget, ZCountTile, ZEmpty } from "@/components/tfp/zoho";
import { Progress } from "@/components/ui/progress";
import {
  AlertOctagon, Bug, FolderKanban, Users, ChevronUp, ChevronDown,
  X, Settings as SettingsIcon, LayoutGrid, Check, RotateCcw, Flame, Plus,
  Search, BarChart2, BarChart3, PieChart as PieIcon, TrendingUp, ListTodo,
  Milestone, ChevronDown as Collapse, ChevronRight as Expand,
  Clock, AlertTriangle, CalendarX,
} from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { SuperAdminDashboard } from "@/components/tfp/superadmin-dashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskFlow Pro" }] }),
  component: Dashboard,
});

const SEV_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6"];

// ─────────────────────────────────────────
// WIDGETS GALLERY DATA
// ─────────────────────────────────────────
const WIDGET_CATEGORIES = [
  {
    id: "projects",
    label: "Projects Widgets",
    icon: FolderKanban,
    color: "text-indigo-500",
    widgets: [
      { id: "projects_by_owners", title: "Projects by Owners", icon: "bar" },
      { id: "projects_by_group", title: "Projects by Group", icon: "bar" },
      { id: "projects_by_customers", title: "Projects by Customers", icon: "bar" },
      { id: "project_status_by_owner", title: "Project Status by Owner", icon: "list" },
      { id: "project_status_by_group", title: "Project Status by Group", icon: "list" },
      { id: "project_status_by_customer", title: "Project Status by Customer", icon: "list" },
    ],
  },
  {
    id: "tasks",
    label: "Task Widgets",
    icon: ListTodo,
    color: "text-emerald-500",
    widgets: [
      { id: "task_status_report", title: "Task Status Report", icon: "pie" },
      { id: "task_owner_report", title: "Task Owner Report", icon: "list" },
      { id: "task_priority_report", title: "Task Priority Report", icon: "donut" },
      { id: "task_by_milestone", title: "Task by Milestone", icon: "bar" },
      { id: "task_completion_pct", title: "Task Completion % Report", icon: "bar" },
      { id: "task_status_by_owner", title: "Task Status by Owner", icon: "list" },
      { id: "task_priority_by_owner", title: "Task Priority by Owner", icon: "list" },
      { id: "task_completion_by_owner", title: "Task Completion by Owner", icon: "list" },
      { id: "created_vs_completed", title: "Created Vs Completed", icon: "trend" },
      { id: "avg_task_completion_time", title: "Average Task Completion Time", icon: "bar" },
      { id: "blueprint_usage", title: "Blueprint Usage Report", icon: "bar" },
      { id: "blueprint_transition_usage", title: "Blueprint Transition Overall Usage Report", icon: "bar" },
      { id: "blueprint_status_usage", title: "Blueprint Status Overall Usage Report", icon: "bar" },
    ],
  },
  {
    id: "issues",
    label: "Issue Widgets",
    icon: AlertOctagon,
    color: "text-red-500",
    widgets: [
      { id: "issue_completion_time", title: "Issue Completion Time Report", icon: "bar" },
      { id: "issue_assignee_report", title: "Issue Assignee Report", icon: "bar" },
      { id: "issue_reporter", title: "Issue Reporter", icon: "donut" },
      { id: "issue_escalation", title: "Issue Escalation", icon: "bar" },
      { id: "issue_severity_report", title: "Issue Severity Report", icon: "bar" },
      { id: "issue_module", title: "Issue Module", icon: "pie" },
      { id: "issue_classification", title: "Issue Classification Report", icon: "bar" },
      { id: "issue_reproducible", title: "Issue Reproducible", icon: "list" },
      { id: "issue_status_report", title: "Issue Status Report", icon: "pie" },
      { id: "issue_count_by_release_ms", title: "Issue Count By Release Milestone", icon: "bar" },
      { id: "issue_count_by_affected_ms", title: "Issue Count By Affected Milestone", icon: "bar" },
      { id: "issue_status_by_assignee", title: "Issue Status by Assignee", icon: "list" },
      { id: "issue_escalation_by_assignee", title: "Issue Escalation by Assignee", icon: "list" },
      { id: "issue_created_vs_completed", title: "Created Vs Completed", icon: "trend" },
      { id: "issue_avg_age", title: "Average Age (since created) by Assignee", icon: "list" },
      { id: "avg_issue_completion_time", title: "Average Issue Completion Time", icon: "list" },
    ],
  },
  {
    id: "phases",
    label: "Phase Widgets",
    icon: Milestone,
    color: "text-amber-500",
    widgets: [
      { id: "phase_status_report", title: "Phase Status Report", icon: "list" },
      { id: "phase_owner_report", title: "Phase Owner Report", icon: "bar" },
      { id: "phase_status_by_owner", title: "Phase Status by Owner", icon: "list" },
      { id: "phase_completion_time", title: "Phase Completion Time Report", icon: "bar" },
    ],
  },
  {
    id: "timelogs",
    label: "Time Log Widgets",
    icon: Clock,
    color: "text-cyan-500",
    widgets: [
      { id: "time_logged_by_user", title: "Time Logged by User", icon: "bar" },
      { id: "time_logged_by_project", title: "Time Logged by Project", icon: "bar" },
      { id: "billable_vs_nonbillable", title: "Billable vs Non-Billable", icon: "pie" },
    ],
  },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  bar: <BarChart2 className="h-4 w-4 text-blue-400" />,
  pie: <PieIcon className="h-4 w-4 text-amber-400" />,
  donut: <PieIcon className="h-4 w-4 text-emerald-400" />,
  list: <BarChart3 className="h-4 w-4 text-indigo-400" />,
  trend: <TrendingUp className="h-4 w-4 text-rose-400" />,
};

const ALL_WIDGETS = [
  { id: "throughput", title: "Throughput Analysis", desc: "Line chart of tasks created vs. completed" },
  { id: "status", title: "Task Status Distribution", desc: "Bar chart of tasks distributed by status column" },
  { id: "severity", title: "Issues by Severity", desc: "Pie chart of issues classified by severity level" },
  { id: "incidents", title: "Active Incident Tickets", desc: "List of current open critical issues" },
  { id: "projects", title: "Project Progress Tracker", desc: "List of active projects with progress bars" },
  { id: "capacity", title: "Team Capacity Allocation", desc: "Workload distribution metrics for members" },
  { id: "team_tasks", title: "Tasks for My Team Members", desc: "Tasks assigned to members of your selected team" },
  { id: "my_tasks", title: "My Tasks", desc: "Tasks currently assigned to you" },
  { id: "my_issues", title: "My Issues", desc: "Issues currently assigned to you" },
  { id: "my_overdue", title: "My Overdue Items", desc: "Overdue tasks and issues assigned to you" },
];

// ─────────────────────────────────────────
// WIDGETS GALLERY MODAL
// ─────────────────────────────────────────
function WidgetsGallery({
  open,
  onClose,
  onAdd,
  activeWidgets,
  onViewWidget,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (id: string) => void;
  activeWidgets: string[];
  onViewWidget: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-md border border-white/10 rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold">Widgets Gallery</DialogTitle>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/50 border-white/10 rounded-lg"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Create Widget tile */}
          <div
            className="border-2 border-dashed border-border/50 rounded-xl p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer transition-all"
            onClick={() => toast.info("Custom widget creation coming soon!")}
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-semibold">Create Widget</span>
          </div>

          {/* Standard widgets section */}
          <div>
            <div
              className="flex items-center gap-2 cursor-pointer mb-3 group"
              onClick={() => toggleCollapse("standard")}
            >
              {collapsed["standard"] ? (
                <Expand className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Collapse className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                Standard Widgets
              </span>
            </div>
            {!collapsed["standard"] && (
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {ALL_WIDGETS.filter(
                  (w) =>
                    !search ||
                    w.title.toLowerCase().includes(search.toLowerCase())
                ).map((w) => {
                  const isActive = activeWidgets.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        onAdd(w.id);
                        toast.success(`"${w.title}" added to dashboard!`);
                      }}
                      disabled={isActive}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isActive
                          ? "border-emerald-500/30 bg-emerald-500/5 opacity-60 cursor-not-allowed"
                          : "border-border/50 bg-background/40 hover:border-primary/30 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <BarChart2 className="h-4 w-4 text-blue-400 shrink-0" />
                        {isActive && (
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-foreground leading-tight">
                        {w.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category sections */}
          {WIDGET_CATEGORIES.map((cat) => {
            const filtered = cat.widgets.filter(
              (w) =>
                !search ||
                w.title.toLowerCase().includes(search.toLowerCase()) ||
                cat.label.toLowerCase().includes(search.toLowerCase())
            );
            if (filtered.length === 0) return null;

            return (
              <div key={cat.id}>
                <div
                  className="flex items-center gap-2 cursor-pointer mb-3 group"
                  onClick={() => toggleCollapse(cat.id)}
                >
                  {collapsed[cat.id] ? (
                    <Expand className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Collapse className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                    {cat.label}
                  </span>
                </div>

                {!collapsed[cat.id] && (
                  <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {filtered.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => onViewWidget(w.id)}
                        className="text-left p-3 rounded-xl border border-border/50 bg-background/40 hover:border-primary/30 hover:bg-muted/20 transition-all group/tile"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          {ICON_MAP[w.icon] ?? <BarChart2 className="h-4 w-4 text-blue-400" />}
                          <span className="text-[9px] text-muted-foreground opacity-0 group-hover/tile:opacity-100 transition-opacity">View →</span>
                        </div>
                        <p className="text-[11px] font-semibold text-foreground leading-tight">
                          {w.title}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────
function Dashboard() {
  const { user } = useAuth();
  if (user?.roleName === "SUPER_ADMIN") return <SuperAdminDashboard />;

  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();
  const { data: statuses = [] } = useStatuses();
  const { data: workload = [] } = useWorkload();
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useUsers();
  const { data: widgetReportsData } = useWidgetReports();

  const openIssues = issues.filter((i) => !i.resolved).length;
  const sev0 = issues.filter((i) => i.severity === "SEV0" && !i.resolved).length;
  const activeTasks = tasks.filter((t) => t.statusId !== "s-done").length;
  const closedTasks = tasks.filter((t) => t.statusId === "s-done").length;
  const overloaded = workload.filter((w) => w.overloaded).length;

  // ─── My data derived from current user
  const myUserId = user?.email
    ? users.find((u) => u.email === user.email)?.id
    : undefined;

  const myTasks = useMemo(
    () => (myUserId ? tasks.filter((t) => t.assigneeIds.includes(myUserId)) : []),
    [tasks, myUserId]
  );

  const myIssues = useMemo(() => {
    if (!myUserId) return [];
    return issues.filter((i) => {
      const task = tasks.find((t) => t.id === i.taskId);
      return task?.assigneeIds.includes(myUserId);
    });
  }, [issues, tasks, myUserId]);

  const myOverdue = useMemo(() => {
    const now = new Date();
    return myTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.statusId !== "s-done"
    );
  }, [myTasks]);

  // ─── Team tasks
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].id);
  }, [teams]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const teamMembers = users.filter((u) => (u as any).teamId === selectedTeamId);
  const teamTasks = useMemo(
    () =>
      tasks.filter((t) =>
        teamMembers.some((m) => t.assigneeIds.includes(m.id))
      ),
    [tasks, teamMembers]
  );

  // ─── Charts
  const throughput = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      day: `D${i + 1}`,
      completed: 2 + Math.round(Math.sin(i) * 3 + Math.random() * 4),
      created: 3 + Math.round(Math.cos(i) * 2 + Math.random() * 3),
    }));
  }, []);

  const byStatus = useMemo(() => {
    return statuses.map((s) => ({
      s: s.name,
      v: tasks.filter((t) => t.statusId === s.id).length,
      color: s.color,
    }));
  }, [statuses, tasks]);

  const bySeverity = useMemo(() => {
    return (["SEV0", "SEV1", "SEV2", "SEV3"] as const)
      .map((sev, idx) => ({
        name: sev,
        value: issues.filter((i) => i.severity === sev).length,
        color: SEV_COLORS[idx],
      }))
      .filter((d) => d.value > 0);
  }, [issues]);  // ─── Layout state
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [viewingWidgetId, setViewingWidgetId] = useState<string | null>(null);
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, "small" | "medium" | "large">>({});

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...activeWidgets];
    const draggedItem = list[draggedIndex];
    list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, draggedItem);
    
    setActiveWidgets(list);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const changeWidgetSize = (id: string, size: "small" | "medium" | "large") => {
    setWidgetSizes((prev) => ({ ...prev, [id]: size }));
  };

  useEffect(() => {
    if (user?.email) {
      const saved = localStorage.getItem(`tfp.dashboard.layout.${user.email}`);
      const savedSizes = localStorage.getItem(`tfp.dashboard.widgetSizes.${user.email}`);
      if (saved) {
        try {
          setActiveWidgets(JSON.parse(saved));
        } catch (e) {}
      } else {
        setActiveWidgets([
          "team_tasks", "my_tasks", "my_issues", "my_overdue",
          "throughput", "status", "severity", "incidents", "projects", "capacity",
        ]);
      }
      if (savedSizes) {
        try {
          setWidgetSizes(JSON.parse(savedSizes));
        } catch (e) {}
      } else {
        setWidgetSizes({
          throughput: "medium",
          incidents: "medium",
          team_tasks: "medium",
        });
      }
    }
  }, [user]);

  const handleSaveLayout = () => {
    if (user?.email) {
      localStorage.setItem(
        `tfp.dashboard.layout.${user.email}`,
        JSON.stringify(activeWidgets)
      );
      localStorage.setItem(
        `tfp.dashboard.widgetSizes.${user.email}`,
        JSON.stringify(widgetSizes)
      );
      toast.success("Dashboard layout saved to your profile!");
      setIsCustomizing(false);
    }
  };

  const handleResetLayout = () => {
    const defaultLayout = [
      "team_tasks", "my_tasks", "my_issues", "my_overdue",
      "throughput", "status", "severity", "incidents", "projects", "capacity",
    ];
    const defaultSizes: Record<string, "small" | "medium" | "large"> = {
      throughput: "medium",
      incidents: "medium",
      team_tasks: "medium",
    };
    setActiveWidgets(defaultLayout);
    setWidgetSizes(defaultSizes);
    if (user?.email) {
      localStorage.setItem(
        `tfp.dashboard.layout.${user.email}`,
        JSON.stringify(defaultLayout)
      );
      localStorage.setItem(
        `tfp.dashboard.widgetSizes.${user.email}`,
        JSON.stringify(defaultSizes)
      );
    }
    toast.success("Dashboard layout reset to default!");
    setIsCustomizing(false);
  };
  const moveWidget = (index: number, direction: "up" | "down") => {
    const newWidgets = [...activeWidgets];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newWidgets.length) {
      const temp = newWidgets[index];
      newWidgets[index] = newWidgets[targetIndex];
      newWidgets[targetIndex] = temp;
      setActiveWidgets(newWidgets);
    }
  };

  const removeWidget = (id: string) => {
    const newList = activeWidgets.filter((w) => w !== id);
    setActiveWidgets(newList);
    if (user?.email) {
      localStorage.setItem(
        `tfp.dashboard.layout.${user.email}`,
        JSON.stringify(newList)
      );
    }
  };

  const addWidget = (id: string) => {
    if (!activeWidgets.includes(id)) {
      const newList = [...activeWidgets, id];
      setActiveWidgets(newList);
      if (user?.email) {
        localStorage.setItem(
          `tfp.dashboard.layout.${user.email}`,
          JSON.stringify(newList)
        );
      }
      toast.success("Widget added to dashboard successfully!");
    } else {
      toast.info("Widget is already on your dashboard.");
    }
  };

  // ─────────────────────────────────────────
  // RENDER WIDGET
  // ─────────────────────────────────────────
  const renderWidget = (id: string, index: number) => {
    const widgetContent = (() => {
      switch (id) {
        // ─── TEAM TASKS ───
        case "team_tasks":
          return (
            <ZWidget
              title={
                <div className="flex items-center gap-2">
                  <span>Tasks for My Team members</span>
                  {selectedTeam && (
                    <span className="inline-flex items-center gap-1 text-primary font-semibold">
                      <span className="text-muted-foreground">›</span>
                      <select
                        className="bg-transparent text-primary text-[12.5px] font-semibold outline-none cursor-pointer"
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {teams.map((t) => (
                          <option key={t.id} value={t.id} className="bg-card text-foreground">
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  )}
                </div>
              }
              subtitle={`${teamTasks.length} tasks`}
              className="w-full h-full"
            >
              {teamTasks.length === 0 ? (
                <ZEmpty icon={Users} title="No tasks for this team." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {teamTasks.slice(0, 8).map((t) => {
                    const assignee = users.find((u) => t.assigneeIds.includes(u.id));
                    const isOverdue =
                      t.dueDate && new Date(t.dueDate) < new Date() && t.statusId !== "s-done";
                    return (
                      <li key={t.id}>
                        <Link
                          to="/tasks/$id"
                          params={{ id: t.id }}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-[9px] text-primary font-bold">
                              {assignee?.name?.slice(0, 2).toUpperCase() ?? "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-medium text-foreground truncate">
                              {t.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{t.displayId}</p>
                          </div>
                          {t.dueDate && (
                            <span
                              className={`text-[11px] font-mono shrink-0 ${
                                isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                              }`}
                            >
                              {format(new Date(t.dueDate), "dd-MM-yyyy")}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ZWidget>
          );

        // ─── MY TASKS ───
        case "my_tasks":
          return (
            <ZWidget
              title="My Tasks"
              subtitle={`${myTasks.length} assigned`}
              className="w-full h-full"
            >
              {myTasks.length === 0 ? (
                <ZEmpty icon={ListTodo} title="No Tasks assigned to you yet." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {myTasks.slice(0, 6).map((t) => {
                    const project = projects.find((p) => p.id === t.projectId);
                    const isOverdue =
                      t.dueDate && new Date(t.dueDate) < new Date() && t.statusId !== "s-done";
                    return (
                      <li key={t.id}>
                        <Link
                          to="/tasks/$id"
                          params={{ id: t.id }}
                          className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-medium text-foreground truncate">
                              {t.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {project?.name ?? t.displayId}
                            </p>
                          </div>
                          {t.dueDate && (
                            <span
                              className={`text-[11px] font-mono shrink-0 ${
                                isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                              }`}
                            >
                              {format(new Date(t.dueDate), "dd-MM-yyyy")}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ZWidget>
          );

        // ─── MY ISSUES ───
        case "my_issues":
          return (
            <ZWidget
              title="My Issues"
              subtitle={`${myIssues.length} issues`}
              className="w-full h-full"
            >
              {myIssues.length === 0 ? (
                <ZEmpty icon={Bug} title="No Issues assigned to you yet." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {myIssues.slice(0, 6).map((i) => {
                    const task = tasks.find((t) => t.id === i.taskId);
                    const project = projects.find((p) => p.id === task?.projectId);
                    const isOverdue =
                      i.slaTargetFix && new Date(i.slaTargetFix) < new Date() && !i.resolved;
                    return (
                      <li key={i.id}>
                        <Link
                          to="/incidents/$id"
                          params={{ id: i.taskId }}
                          className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                        >
                          <span
                            className="inline-flex h-4 min-w-[36px] items-center justify-center rounded-sm px-1 text-[9px] font-bold text-white shrink-0"
                            style={{
                              background:
                                i.severity === "SEV0"
                                  ? "#ef4444"
                                  : i.severity === "SEV1"
                                  ? "#f97316"
                                  : i.severity === "SEV2"
                                  ? "#eab308"
                                  : "#3b82f6",
                            }}
                          >
                            {i.severity}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-medium text-foreground truncate">
                              {task?.title ?? `Issue ${i.id.slice(0, 8)}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {project?.name ?? i.environment}
                            </p>
                          </div>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[9px] shrink-0 px-1.5">
                              SLA
                            </Badge>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ZWidget>
          );

        // ─── MY OVERDUE ───
        case "my_overdue":
          return (
            <ZWidget
              title={
                <span className="flex items-center gap-1.5">
                  <CalendarX className="h-3.5 w-3.5 text-destructive" />
                  My Overdue Items
                </span>
              }
              subtitle={`${myOverdue.length} overdue`}
              className="w-full h-full"
            >
              {myOverdue.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <Check className="h-8 w-8 text-emerald-500 opacity-60" />
                  <p className="text-xs font-medium">No overdue items. You're all caught up!</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {myOverdue.slice(0, 6).map((t) => {
                    const project = projects.find((p) => p.id === t.projectId);
                    const daysOverdue = t.dueDate
                      ? Math.ceil(
                          (new Date().getTime() - new Date(t.dueDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0;
                    return (
                      <li key={t.id}>
                        <Link
                          to="/tasks/$id"
                          params={{ id: t.id }}
                          className="flex items-center gap-2 px-3 py-2.5 hover:bg-destructive/5 transition-colors"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-medium text-foreground truncate">
                              {t.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {project?.name ?? t.displayId}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-destructive font-semibold shrink-0">
                            {daysOverdue}d overdue
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ZWidget>
          );

        // ─── THROUGHPUT ───
        case "throughput":
          return (
            <ZWidget title="Throughput · last 14 days" subtitle="Tasks created vs. completed" className="w-full h-full">
              <div className="p-3">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={throughput} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.6 0.15 155)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="oklch(0.6 0.15 155)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.55 0.16 240)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="oklch(0.55 0.16 240)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                    <Area type="monotone" dataKey="completed" stroke="oklch(0.6 0.15 155)" fill="url(#g1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="created" stroke="oklch(0.55 0.16 240)" fill="url(#g2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ZWidget>
          );

        case "status":
          return (
            <ZWidget title="Tasks Status" subtitle="By workflow column" className="w-full h-full">
              <div className="p-3">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byStatus} margin={{ top: 5, right: 5, left: -20, bottom: 30 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="s" stroke="oklch(0.5 0.02 240)" fontSize={10} interval={0} angle={-25} textAnchor="end" tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                      {byStatus.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color || "oklch(0.6 0.15 155)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ZWidget>
          );

        case "severity":
          return (
            <ZWidget title="Issues by Severity" subtitle="All time" className="w-full h-full">
              <div className="p-3">
                {bySeverity.length === 0 ? (
                  <ZEmpty icon={Bug} title="No issues yet." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={bySeverity} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {bySeverity.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ZWidget>
          );

        case "incidents":
          return (
            <ZWidget title="Active Incidents" subtitle={`${openIssues} open`} className="w-full h-full">
              {issues.filter((i) => !i.resolved).length === 0 ? (
                <ZEmpty icon={AlertOctagon} title="All incidents resolved." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {issues.filter((i) => !i.resolved).slice(0, 6).map((i) => {
                    const t = tasks.find((x) => x.id === i.taskId);
                    return (
                      <li key={i.id}>
                        <Link to="/incidents/$id" params={{ id: i.taskId }} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                          <span
                            className="inline-flex h-4 min-w-[34px] items-center justify-center rounded-sm px-1 text-[9px] font-bold text-white"
                            style={{ background: `var(--color-sev-${i.severity.slice(-1)})` }}
                          >
                            {i.severity}
                          </span>
                          <span className="flex-1 truncate text-[12.5px]">{t?.title}</span>
                          <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{i.environment}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ZWidget>
          );

        case "projects":
          return (
            <ZWidget title="Project Progress" subtitle={`${projects.length} active`} actions={
              <Link to="/projects" className="text-[11px] text-info hover:underline">View all →</Link>
            } className="w-full h-full">
              {projects.length === 0 ? (
                <ZEmpty icon={FolderKanban} title="No projects yet." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {projects.slice(0, 6).map((p) => (
                    <li key={p.id} className="px-3 py-2">
                      <Link to="/projects/$id" params={{ id: p.id }} className="block">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="truncate text-[12.5px] font-medium text-foreground hover:text-primary hover:underline">{p.name}</span>
                          <span className="font-mono text-[10.5px] text-muted-foreground">{p.progress ?? 0}%</span>
                        </div>
                        <Progress value={p.progress ?? 0} className="h-1.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ZWidget>
          );

        case "capacity":
          return (
            <ZWidget title="Team Capacity" subtitle={`${overloaded} overloaded`} actions={
              <Link to="/workload" className="text-[11px] text-info hover:underline">View all →</Link>
            } className="w-full h-full">
              {workload.length === 0 ? (
                <ZEmpty icon={Users} title="No workload data." />
              ) : (
                <ul className="divide-y divide-border/60 text-xs">
                  {workload.slice(0, 6).map((w) => {
                    const u = findUser(w.userId);
                    const pct = Math.min(100, Math.round((w.totalEstimatedHours / 40) * 100));
                    return (
                      <li key={w.userId} className="flex items-center gap-3 px-3 py-2">
                        <Avatar className="h-7 w-7 border border-border">
                          <AvatarFallback className="bg-muted text-[10px] font-bold">
                            {u?.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[12.5px] font-semibold text-foreground">{u?.name}</p>
                            {w.overloaded && (
                              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive">Overloaded</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="font-mono text-[10.5px] text-muted-foreground">{w.totalEstimatedHours}h</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ZWidget>
          );

        default: {
          const spec = WIDGET_REGISTRY[id];
          if (!spec) return null;
          const chartData = widgetReportsData ? (widgetReportsData[spec.dataKey] as any[]) : [];

          const renderChartContent = () => {
            if (!chartData || chartData.length === 0) {
              return <ZEmpty icon={BarChart2} title="No report data." />;
            }
            switch (spec.chartType) {
              case "bar":
                return <BarChartView data={chartData} label={spec.unit ?? "count"} />;
              case "donut":
              case "pie":
                return <DonutChartView data={chartData} />;
              case "trend":
                return <TrendChartView data={chartData} />;
              case "list":
                return <ListView data={chartData} unit={spec.unit} />;
              case "completion":
                return <CompletionView data={chartData} />;
              default:
                return <BarChartView data={chartData} />;
            }
          };

          return (
            <ZWidget title={spec.title} subtitle={spec.subtitle} className="w-full h-full">
              <div className="p-3">
                {renderChartContent()}
              </div>
            </ZWidget>
          );
        }
      }
    })();

    if (!widgetContent) return null;

    const size = widgetSizes[id] || "small";
    const sizeClass = size === "large"
      ? "col-span-1 lg:col-span-2 xl:col-span-3"
      : size === "medium"
      ? "col-span-1 lg:col-span-2 xl:col-span-2"
      : "col-span-1";

    const isDragged = index === draggedIndex;
    const isDragOver = isCustomizing && index === dragOverIndex && index !== draggedIndex;

    return (
      <div
        key={id}
        draggable={isCustomizing}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, index)}
        onDragEnd={handleDragEnd}
        onDrop={(e) => handleDrop(e, index)}
        className={`relative border rounded-2xl overflow-hidden transition-all duration-300 ${
          isCustomizing
            ? "border-emerald-500/40 shadow-[0_4px_16px_rgba(16,185,129,0.15)] bg-emerald-500/5 scale-[0.98] ring-1 ring-emerald-500/25 cursor-grab active:cursor-grabbing"
            : "border-transparent"
        } ${isDragged ? "opacity-35" : ""} ${isDragOver ? "border-dashed border-emerald-500 scale-[1.02] bg-emerald-500/10" : ""} ${sizeClass}`}
      >
        {isCustomizing && (
          <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 bg-background/95 backdrop-blur-md px-2 py-1.5 rounded-xl border border-emerald-500/20 shadow-md">
            {/* Size controls */}
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => changeWidgetSize(id, "small")}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition ${size === "small" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                title="Small (1 column)"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => changeWidgetSize(id, "medium")}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition ${size === "medium" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                title="Medium (2 columns)"
              >
                M
              </button>
              <button
                type="button"
                onClick={() => changeWidgetSize(id, "large")}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition ${size === "large" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                title="Large (3 columns)"
              >
                L
              </button>
            </div>

            <span className="mx-1 h-3.5 w-px bg-border" />

            <button type="button" onClick={() => moveWidget(index, "up")} disabled={index === 0} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => moveWidget(index, "down")} disabled={index === activeWidgets.length - 1} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1 h-3.5 w-px bg-border" />
            <button type="button" onClick={() => removeWidget(id)} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive animate-pulse">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className={`h-full ${isCustomizing ? "pointer-events-none opacity-70" : ""}`}>
          {widgetContent}
        </div>
      </div>
    );
  };

  return (
    <>
      <Topbar title="Global Operations Dashboard" />
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden">

        {/* Header Banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent px-5 py-4 rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <LayoutGrid className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Personalize Dashboard
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Rearrange, add, or delete operations widgets. Your personalized dashboard configuration is saved to your profile.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCustomizing ? (
              <>
                <Button size="sm" onClick={handleSaveLayout} className="bg-emerald-600 text-white rounded-xl text-xs flex items-center gap-1.5 hover:bg-emerald-700 font-semibold hover-lift">
                  <Check className="h-3.5 w-3.5" /> Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetLayout} className="rounded-xl text-xs flex items-center gap-1.5 border-white/10 bg-background/40 font-semibold hover-lift">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Default
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsCustomizing(false)} className="rounded-xl text-xs font-medium">
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => setShowGallery(true)}
                  className="bg-gradient-primary text-primary-foreground rounded-xl text-xs flex items-center gap-1.5 font-semibold hover-lift"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Widget
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsCustomizing(true)} className="rounded-xl text-xs flex items-center gap-1.5 border-white/10 bg-background/40 font-semibold hover-lift">
                  <SettingsIcon className="h-3.5 w-3.5" /> Personalize Layout
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Count tiles */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 relative z-10">
          <ZCountTile label="Open Tasks" count={activeTasks} tone="primary" to="/tasks" />
          <ZCountTile label="Closed Tasks" count={closedTasks} tone="muted" />
          <ZCountTile label="Open Issues" count={openIssues} tone="destructive" to="/incidents" />
          <ZCountTile label="SEV0 Critical" count={sev0} tone="destructive" />
          <ZCountTile label="Projects" count={projects.length} tone="info" to="/projects" />
          <ZCountTile label="Overloaded" count={overloaded} tone="warning" to="/workload" />
        </section>

        {/* Widgets Grid */}
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3 relative z-10">
          {activeWidgets.map((id, index) => renderWidget(id, index))}
        </section>
      </main>

      {/* Widgets Gallery Modal */}
      <WidgetsGallery
        open={showGallery}
        onClose={() => setShowGallery(false)}
        onAdd={(id) => {
          addWidget(id);
          setShowGallery(false);
        }}
        activeWidgets={activeWidgets}
        onViewWidget={(id) => {
          setShowGallery(false);
          setViewingWidgetId(id);
        }}
      />

      {/* Widget detail view */}
      <WidgetView
        widgetId={viewingWidgetId}
        onClose={() => setViewingWidgetId(null)}
        onAddToDashboard={addWidget}
      />
    </>
  );
}
