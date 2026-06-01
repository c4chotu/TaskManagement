import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCurrentTimesheet,
  useMyAssignedTasks,
  useTimeEntries,
  useProjects,
  useUsers,
  useTasks,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry
} from "@/lib/queries";
import { format, startOfWeek, addDays, parseISO, isWithinInterval } from "date-fns";
import { CheckCircle, ChevronLeft, ChevronRight, BarChart2, Calendar, Clock, DollarSign, Edit, Trash2, Search, Briefcase, Plus, Filter, User, Play, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_app/time")({
  head: () => ({ meta: [{ title: "Timesheet — TaskFlow Pro" }] }),
  component: TimesheetPage,
});

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"];

function TimesheetPage() {
  const { user } = useAuth();
  const isAdminOrVp = user && user.roleLevel !== undefined && user.roleLevel >= 3;

  // Global queries
  const { data: timesheet } = useCurrentTimesheet();
  const { data: myAssignedTasks = [] } = useMyAssignedTasks();
  const { data: allTasks = [] } = useTasks();
  const { data: entries = [] } = useTimeEntries();
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();

  // Mutations
  const createMutation = useCreateTimeEntry();
  const updateMutation = useUpdateTimeEntry();
  const deleteMutation = useDeleteTimeEntry();

  // Calendar Week switch
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  // Logger Form States
  const [logProjId, setLogProjId] = useState<string>("all");
  const [logType, setLogType] = useState<"TASK" | "ISSUE">("TASK");
  const [logTaskId, setLogTaskId] = useState<string>("");
  const [logDate, setLogDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [logHours, setLogHours] = useState<string>("1.0");
  const [logDesc, setLogDesc] = useState<string>("");
  const [logBillable, setLogBillable] = useState<boolean>(true);

  // Live Timer states
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerElapsed, setTimerElapsed] = useState<number>(0); // in seconds
  const [timerProjId, setTimerProjId] = useState<string>("all");
  const [timerTaskId, setTimerTaskId] = useState<string>("");
  const [timerDesc, setTimerDesc] = useState<string>("");

  useEffect(() => {
    let interval: any;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatStopwatch = (secs: number) => {
    const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
    const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  // Edit Modal States
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editTaskId, setEditTaskId] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editHours, setEditHours] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editBillable, setEditBillable] = useState<boolean>(true);

  // Filter States for Registry Lists
  const [filterProjId, setFilterProjId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterBillable, setFilterBillable] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState<string>("");
  
  // Custom Date Range filter
  const [filterStart, setFilterStart] = useState<string>(format(weekStart, "yyyy-MM-dd"));
  const [filterEnd, setFilterEnd] = useState<string>(format(weekEnd, "yyyy-MM-dd"));

  // Sync date range inputs when weekOffset changes
  useEffect(() => {
    setFilterStart(format(weekStart, "yyyy-MM-dd"));
    setFilterEnd(format(weekEnd, "yyyy-MM-dd"));
  }, [weekStart, weekEnd]);

  // Filter lists for logger dropdown
  const loggerAssignedTasks = useMemo(() => {
    return myAssignedTasks.filter((t) => {
      const projMatch = logProjId === "all" || t.projectId === logProjId;
      const typeMatch = t.taskType === logType;
      return projMatch && typeMatch;
    });
  }, [myAssignedTasks, logProjId, logType]);

  // Timer assigned tasks dropdown
  const timerAssignedTasks = useMemo(() => {
    return myAssignedTasks.filter((t) => {
      return timerProjId === "all" || t.projectId === timerProjId;
    });
  }, [myAssignedTasks, timerProjId]);

  // Handle manual log submit
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTaskId) {
      toast.error("Please select a task or issue to log hours.");
      return;
    }
    const hrs = parseFloat(logHours);
    if (isNaN(hrs) || hrs <= 0) {
      toast.error("Please enter a valid number of hours.");
      return;
    }

    try {
      const start = new Date(logDate + "T09:00:00");
      const end = new Date(start.getTime() + hrs * 3600000);

      await createMutation.mutateAsync({
        taskId: logTaskId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        description: logDesc,
        billable: logBillable,
      });

      toast.success("Hours logged successfully!");
      setLogDesc("");
      setLogHours("1.0");
    } catch {
      toast.error("Failed to log hours.");
    }
  };

  // Handle live stopwatch submission
  const handleTimerSave = async () => {
    if (!timerTaskId) {
      toast.error("Please select a task to submit tracked time.");
      return;
    }
    if (timerElapsed < 5) {
      toast.error("Tracked time is too short to log (minimum 5 seconds).");
      return;
    }

    const calculatedHours = parseFloat((timerElapsed / 3600).toFixed(3));
    try {
      const end = new Date();
      const start = new Date(end.getTime() - timerElapsed * 1000);

      await createMutation.mutateAsync({
        taskId: timerTaskId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        description: timerDesc || "Logged via stopwatch timer widget",
        billable: true,
      });

      toast.success(`Logged ${formatStopwatch(timerElapsed)} (${calculatedHours}h) successfully!`);
      setTimerRunning(false);
      setTimerElapsed(0);
      setTimerDesc("");
    } catch {
      toast.error("Failed to log tracked time.");
    }
  };

  // Handle edit log open
  const handleOpenEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditTaskId(entry.taskId);
    setEditDate(format(new Date(entry.startTime), "yyyy-MM-dd"));
    setEditHours((entry.hours ?? 1.0).toString());
    setEditDesc(entry.description ?? "");
    setEditBillable(entry.billable);
  };

  // Handle edit log submit
  const handleEditSubmit = async () => {
    if (!editingEntry) return;
    const hrs = parseFloat(editHours);
    if (isNaN(hrs) || hrs <= 0) {
      toast.error("Please enter a valid number of hours.");
      return;
    }

    try {
      const start = new Date(editDate + "T09:00:00");
      const end = new Date(start.getTime() + hrs * 3600000);

      await updateMutation.mutateAsync({
        id: editingEntry.id,
        patch: {
          taskId: editTaskId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: editDesc,
          billable: editBillable,
        },
      });

      toast.success("Time entry updated!");
      setEditingEntry(null);
    } catch {
      toast.error("Failed to update time entry.");
    }
  };

  // Handle delete log
  const handleDeleteLog = async (id: string) => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Time entry deleted.");
      } catch {
        toast.error("Failed to delete entry.");
      }
    }
  };

  // My Log Entries (after filters & date range)
  const myFilteredLogs = useMemo(() => {
    return entries
      .filter((entry) => entry.userId === user?.id)
      .filter((entry) => {
        const task = allTasks.find((t) => t.id === entry.taskId);
        if (!task) return false;

        if (filterProjId !== "all" && task.projectId !== filterProjId) return false;
        if (filterType !== "all" && task.taskType !== filterType) return false;
        if (filterBillable !== "all" && (filterBillable === "billable" ? !entry.billable : entry.billable)) return false;
        if (filterSearch && !task.title.toLowerCase().includes(filterSearch.toLowerCase()) && !entry.description?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
        
        if (filterStart) {
          const entryDate = new Date(entry.startTime);
          if (entryDate < new Date(filterStart + "T00:00:00")) return false;
        }
        if (filterEnd) {
          const entryDate = new Date(entry.startTime);
          if (entryDate > new Date(filterEnd + "T23:59:59")) return false;
        }

        return true;
      });
  }, [entries, user, allTasks, filterProjId, filterType, filterBillable, filterSearch, filterStart, filterEnd]);

  // Team Log Entries (after filters & date range)
  const teamFilteredLogs = useMemo(() => {
    return entries.filter((entry) => {
      const task = allTasks.find((t) => t.id === entry.taskId);
      if (!task) return false;

      if (filterUser !== "all" && entry.userId !== filterUser) return false;
      if (filterProjId !== "all" && task.projectId !== filterProjId) return false;
      if (filterType !== "all" && task.taskType !== filterType) return false;
      if (filterBillable !== "all" && (filterBillable === "billable" ? !entry.billable : entry.billable)) return false;
      if (filterSearch && !task.title.toLowerCase().includes(filterSearch.toLowerCase()) && !entry.description?.toLowerCase().includes(filterSearch.toLowerCase())) return false;

      if (filterStart) {
        const entryDate = new Date(entry.startTime);
        if (entryDate < new Date(filterStart + "T00:00:00")) return false;
      }
      if (filterEnd) {
        const entryDate = new Date(entry.startTime);
        if (entryDate > new Date(filterEnd + "T23:59:59")) return false;
      }

      return true;
    });
  }, [entries, allTasks, filterUser, filterProjId, filterType, filterBillable, filterSearch, filterStart, filterEnd]);

  // Active entries for metrics
  const activeEntries = isAdminOrVp ? teamFilteredLogs : myFilteredLogs;

  const kpis = useMemo(() => {
    const totalHours = activeEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);
    const billableHours = activeEntries.filter((e) => e.billable).reduce((sum, e) => sum + (e.hours ?? 0), 0);
    const billableRatio = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
    
    // Find top project
    const projMap: Record<string, number> = {};
    activeEntries.forEach((e) => {
      const task = allTasks.find((t) => t.id === e.taskId);
      const projId = task?.projectId ?? "unknown";
      projMap[projId] = (projMap[projId] ?? 0) + (e.hours ?? 0);
    });

    let topProjName = "—";
    let maxHours = 0;
    Object.entries(projMap).forEach(([projId, hours]) => {
      if (hours > maxHours) {
        maxHours = hours;
        const proj = projects.find((p) => p.id === projId);
        topProjName = proj?.name ?? "Unknown Project";
      }
    });

    // Find most active user
    const userMap: Record<string, number> = {};
    activeEntries.forEach((e) => {
      if (e.userId) {
        userMap[e.userId] = (userMap[e.userId] ?? 0) + (e.hours ?? 0);
      }
    });

    let topUserName = "—";
    let maxUserHours = 0;
    Object.entries(userMap).forEach(([uid, hours]) => {
      if (hours > maxUserHours) {
        maxUserHours = hours;
        const uObj = users.find((u) => u.id === uid);
        topUserName = uObj?.name ?? "Unknown User";
      }
    });

    return {
      totalHours,
      billableRatio,
      topProject: topProjName,
      topUser: topUserName,
      entryCount: activeEntries.length,
    };
  }, [activeEntries, allTasks, projects, users]);

  // Recharts user data
  const chartUserData = useMemo(() => {
    const userHours: Record<string, number> = {};
    activeEntries.forEach((e) => {
      if (e.userId) {
        userHours[e.userId] = (userHours[e.userId] ?? 0) + (e.hours ?? 0);
      }
    });

    return Object.entries(userHours).map(([uid, hours]) => {
      const uObj = users.find((u) => u.id === uid);
      return {
        name: uObj?.name ?? "Unknown",
        hours: parseFloat(hours.toFixed(1)),
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [activeEntries, users]);

  // Recharts project data
  const chartProjData = useMemo(() => {
    const projHours: Record<string, number> = {};
    activeEntries.forEach((e) => {
      const task = allTasks.find((t) => t.id === e.taskId);
      const projId = task?.projectId ?? "unknown";
      projHours[projId] = (projHours[projId] ?? 0) + (e.hours ?? 0);
    });

    return Object.entries(projHours).map(([pid, hours]) => {
      const pObj = projects.find((p) => p.id === pid);
      return {
        name: pObj?.name ?? "Other",
        value: parseFloat(hours.toFixed(1)),
      };
    }).filter((p) => p.value > 0);
  }, [activeEntries, allTasks, projects]);

  const clearFilters = () => {
    setFilterProjId("all");
    setFilterType("all");
    setFilterBillable("all");
    setFilterUser("all");
    setFilterSearch("");
    setWeekOffset(0);
  };

  return (
    <>
      <Topbar title="Timesheets" />
      <main className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto text-xs relative overflow-hidden">
        
        {/* Large Background Decorative Route Icon */}
        <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
          <Clock className="h-[420px] w-[420px] opacity-[0.025] rotate-12 stroke-[1] animate-pulse" />
        </div>

        {/* Hero header banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent p-6 shadow-md rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Clock className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Time Tracking</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Log, review, and analyze hours worked on your assigned projects and incident resolution tasks.
            </p>
            <div className="flex gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-emerald-500" /> {kpis.totalHours.toFixed(1)}h logged in view</span>
              <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-indigo-500" /> {kpis.billableRatio}% billable ratio</span>
            </div>
          </div>
        </div>
        
        {/* Weekly Header Switcher */}
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-card/85 to-card/65 border border-white/10 p-4 rounded-2xl shadow-xl shadow-indigo-500/5 backdrop-blur-md z-10 hover:border-primary/10 transition-all duration-300">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg border-white/10 bg-background/40" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 font-semibold text-foreground px-1.5">
              <Calendar className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs">Week of {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}</span>
            </div>
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg border-white/10 bg-background/40" onClick={() => setWeekOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-[10px] text-muted-foreground hover:text-foreground">
                Reset
              </Button>
            )}
          </div>

          {/* Date range picker inputs */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Custom Range:</span>
            <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="h-8 text-xs w-[120px] bg-background/40 border-white/10 rounded-lg" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="h-8 text-xs w-[120px] bg-background/40 border-white/10 rounded-lg" />
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
          <Card className="glass-card p-5 space-y-2 border border-white/10 shadow-xl shadow-indigo-500/5 hover:border-primary/20 hover:shadow-indigo-500/10 hover-lift transition-all duration-300">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs uppercase tracking-wider font-semibold">Logged Hours</span>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{kpis.totalHours.toFixed(1)}h</p>
            <p className="text-[11px] text-muted-foreground">{kpis.entryCount} total entries</p>
          </Card>
          <Card className="glass-card p-5 space-y-2 border border-white/10 shadow-xl shadow-indigo-500/5 hover:border-primary/20 hover:shadow-indigo-500/10 hover-lift transition-all duration-300">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs uppercase tracking-wider font-semibold">Billable Ratio</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{kpis.billableRatio}%</p>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpis.billableRatio}%` }} />
            </div>
          </Card>
          <Card className="glass-card p-5 space-y-2 border border-white/10 shadow-xl shadow-indigo-500/5 hover:border-primary/20 hover:shadow-indigo-500/10 hover-lift transition-all duration-300">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs uppercase tracking-wider font-semibold">Top Project</span>
              <Briefcase className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground truncate">{kpis.topProject}</p>
            <p className="text-[11px] text-muted-foreground">Most hours allocated</p>
          </Card>
          <Card className="glass-card p-5 space-y-2 border border-white/10 shadow-xl shadow-indigo-500/5 hover:border-primary/20 hover:shadow-indigo-500/10 hover-lift transition-all duration-300">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs uppercase tracking-wider font-semibold">{isAdminOrVp ? "Top User" : "User Status"}</span>
              <User className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground truncate">
              {isAdminOrVp ? kpis.topUser : user?.name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isAdminOrVp ? "Most active in this range" : `Role: ${user?.roleName}`}
            </p>
          </Card>
        </div>

        {isAdminOrVp ? (
          <Tabs defaultValue="my-timesheet" className="space-y-6 relative z-10">
            <TabsList className="bg-card/75 border border-white/10 p-1 rounded-xl shadow-md backdrop-blur-md">
              <TabsTrigger value="my-timesheet" className="rounded-lg text-xs font-semibold px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">My Timesheet</TabsTrigger>
              <TabsTrigger value="team-timesheet" className="rounded-lg text-xs font-semibold px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Team Timesheets & Stats</TabsTrigger>
            </TabsList>

            <TabsContent value="my-timesheet" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
                {/* Unified Logger Panel (Tabs for Manual Entry vs Live stopwatch Timer) */}
                <Card className="glass-card p-5 flex flex-col border border-white/10 shadow-xl shadow-indigo-500/5 hover:border-primary/10 transition-all duration-300">
                  <Tabs defaultValue="timer" className="w-full space-y-4">
                    <TabsList className="grid grid-cols-2 bg-muted/65 p-1 rounded-lg">
                      <TabsTrigger value="timer" className="text-[10px] font-bold uppercase rounded-md py-1.5 flex items-center justify-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Live Timer</TabsTrigger>
                      <TabsTrigger value="manual" className="text-[10px] font-bold uppercase rounded-md py-1.5 flex items-center justify-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Manual Log</TabsTrigger>
                    </TabsList>

                    {/* TIMER MODE */}
                    <TabsContent value="timer" className="space-y-4 outline-none">
                      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/15 p-5 text-center flex flex-col items-center justify-center space-y-4 min-h-[220px]">
                        {/* Big Watermarked Clock Icon Background */}
                        <div className="absolute right-[-20px] bottom-[-20px] text-primary/5 select-none pointer-events-none scale-150">
                          <Clock className="h-36 w-36 stroke-[1]" />
                        </div>

                        <div className="space-y-1 relative z-10">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Stopwatch Tracker</span>
                          <h4 className="text-3xl font-mono font-bold tracking-widest text-foreground drop-shadow-md pt-2">{formatStopwatch(timerElapsed)}</h4>
                        </div>

                        <div className="w-full space-y-2 relative z-10">
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={timerProjId} onValueChange={(val) => { setTimerProjId(val); setTimerTaskId(""); }}>
                              <SelectTrigger className="h-8 text-[10px] bg-background/50 border-white/10">
                                <SelectValue placeholder="Project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>

                            <Select value={timerTaskId} onValueChange={setTimerTaskId}>
                              <SelectTrigger className="h-8 text-[10px] bg-background/50 border-white/10">
                                <SelectValue placeholder="Select Task..." />
                              </SelectTrigger>
                              <SelectContent>
                                {timerAssignedTasks.length === 0 ? (
                                  <SelectItem value="none" disabled>No assigned tasks</SelectItem>
                               ) : (
                                  timerAssignedTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Input value={timerDesc} onChange={(e) => setTimerDesc(e.target.value)} placeholder="Tracking notes..." className="h-8 text-[10px] bg-background/50 border-white/10" />
                        </div>

                        <div className="flex gap-2.5 relative z-10 w-full">
                          {timerRunning ? (
                            <Button onClick={() => setTimerRunning(false)} className="flex-1 h-9 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 rounded-xl">
                              <Pause className="h-4 w-4" /> Pause Timer
                            </Button>
                          ) : (
                            <Button onClick={() => setTimerRunning(true)} className="flex-1 h-9 text-xs bg-gradient-primary text-primary-foreground font-bold gap-1.5 rounded-xl">
                              <Play className="h-4 w-4" /> Start Timer
                            </Button>
                          )}
                          <Button onClick={handleTimerSave} className="flex-1 h-9 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1.5 rounded-xl" disabled={timerElapsed < 5}>
                            Submit Log
                          </Button>
                          {timerElapsed > 0 && (
                            <Button size="icon" variant="outline" onClick={() => { setTimerRunning(false); setTimerElapsed(0); }} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* MANUAL MODE */}
                    <TabsContent value="manual" className="space-y-3.5 outline-none">
                      <form onSubmit={handleLogSubmit} className="space-y-3 relative z-10">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="logProj" className="text-[10px] font-bold text-muted-foreground uppercase">Project</Label>
                            <Select value={logProjId} onValueChange={(val) => { setLogProjId(val); setLogTaskId(""); }}>
                              <SelectTrigger id="logProj" className="w-full h-8 text-[11px] bg-background/50 border-white/10 rounded-lg">
                                <SelectValue placeholder="Select Project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="logType" className="text-[10px] font-bold text-muted-foreground uppercase">Type</Label>
                            <Select value={logType} onValueChange={(val: any) => { setLogType(val); setLogTaskId(""); }}>
                              <SelectTrigger id="logType" className="w-full h-8 text-[11px] bg-background/50 border-white/10 rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TASK">Tasks</SelectItem>
                                <SelectItem value="ISSUE">Issues</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="logTask" className="text-[10px] font-bold text-muted-foreground uppercase">Assigned {logType === "TASK" ? "Task" : "Issue"}</Label>
                            <Select value={logTaskId} onValueChange={setLogTaskId}>
                              <SelectTrigger id="logTask" className="w-full h-8 text-[11px] bg-background/50 border-white/10 rounded-lg">
                                <SelectValue placeholder="Select Item..." />
                              </SelectTrigger>
                              <SelectContent>
                                {loggerAssignedTasks.length === 0 ? (
                                  <SelectItem value="none" disabled>No items assigned</SelectItem>
                                ) : (
                                  loggerAssignedTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="logDate" className="text-[10px] font-bold text-muted-foreground uppercase">Date</Label>
                            <Input id="logDate" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="h-8 text-[11px] bg-background/50 border-white/10 rounded-lg" required />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 items-end">
                          <div className="col-span-2 space-y-1">
                            <Label htmlFor="logHours" className="text-[10px] font-bold text-muted-foreground uppercase">Hours Spent</Label>
                            <Input id="logHours" type="number" min="0.5" max="24" step="0.5" value={logHours} onChange={(e) => setLogHours(e.target.value)} className="h-8 text-[11px] bg-background/50 border-white/10 rounded-lg" required />
                          </div>
                          <div className="flex items-center space-x-2 pb-2 pl-1 select-none">
                            <Checkbox id="logBillable" checked={logBillable} onCheckedChange={(val: boolean) => setLogBillable(val)} />
                            <Label htmlFor="logBillable" className="cursor-pointer text-[10px] uppercase font-bold text-muted-foreground">Billable</Label>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="logDesc" className="text-[10px] font-bold text-muted-foreground uppercase">Description</Label>
                          <Input id="logDesc" value={logDesc} onChange={(e) => setLogDesc(e.target.value)} placeholder="What did you work on?" className="h-8 text-[11px] bg-background/50 border-white/10 rounded-lg" />
                        </div>

                        <Button type="submit" className="w-full h-8 text-[11px] bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover:shadow-glow transition-all">
                          Log Hours
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </Card>

                {/* Registry list */}
                <Card className="glass-card p-5 space-y-4 shadow-lg hover:shadow-xl transition-all border border-border/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
                    <div>
                      <h3 className="text-sm font-semibold">My Time Registry</h3>
                      <p className="text-xs text-muted-foreground">Modify and track your logged entries.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select value={filterProjId} onValueChange={setFilterProjId}>
                        <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Project" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Projects</SelectItem>
                          {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="TASK">Tasks</SelectItem>
                          <SelectItem value="ISSUE">Issues</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search filter panel */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search logs..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="h-9 pl-9 text-xs" />
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border/60 shadow-xs">
                    <table className="min-w-full text-left text-[11px] table-fixed">
                      <thead className="bg-muted/65 border-b border-border/70 text-muted-foreground font-semibold backdrop-blur-md sticky top-0">
                        <tr>
                          <th className="px-4 py-3 w-[150px]">Task/Issue</th>
                          <th className="px-4 py-3 w-[100px]">Date</th>
                          <th className="px-4 py-3 w-[70px]">Hours</th>
                          <th className="px-4 py-3 w-[90px]">Billable</th>
                          <th className="px-4 py-3 w-[160px]">Description</th>
                          <th className="px-4 py-3 text-right w-[80px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {myFilteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">No logs found matching search.</td>
                          </tr>
                        ) : (
                          myFilteredLogs.map((entry) => {
                            const task = allTasks.find((t) => t.id === entry.taskId);
                            const proj = projects.find((p) => p?.id === task?.projectId);
                            return (
                              <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 truncate">
                                  <div className="font-semibold text-foreground truncate">{task?.title ?? "Unknown Task"}</div>
                                  <div className="text-[9px] text-muted-foreground truncate">{proj?.name ?? "No Project"}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{format(new Date(entry.startTime), "MMM d, yyyy")}</td>
                                <td className="px-4 py-3 font-mono font-extrabold text-primary">{entry.hours?.toFixed(2)}h</td>
                                <td className="px-4 py-3">
                                  <Badge variant={entry.billable ? "default" : "secondary"} className="text-[8px] px-1.5 py-0">
                                    {entry.billable ? "Billable" : "Non-Billable"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 truncate" title={entry.description ?? ""}>
                                  {entry.description || <span className="text-muted-foreground italic">No description</span>}
                                </td>
                                <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(entry)}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLog(entry.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="team-timesheet" className="space-y-6">
              {/* Analytics dashboard */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="glass-card p-5 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours Logged per User</h4>
                  <div className="h-[280px]">
                    {chartUserData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">No analytics data available</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartUserData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.7 0.05 200)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "oklch(0.7 0.05 200)" }} axisLine={false} tickLine={false} />
                          <RechartsTooltip contentStyle={{ background: "rgba(30, 41, 59, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }} />
                          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                            {chartUserData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                <Card className="glass-card p-5 space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours Logged per Project</h4>
                  <div className="h-[280px] flex items-center justify-center">
                    {chartProjData.length === 0 ? (
                      <div className="text-muted-foreground text-xs">No analytics data available</div>
                    ) : (
                      <div className="w-full h-full flex flex-col sm:flex-row items-center">
                        <div className="flex-1 w-full h-[220px] sm:h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={chartProjData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                                {chartProjData.map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ background: "rgba(30, 41, 59, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 w-full p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
                          {chartProjData.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
                                <span className="text-muted-foreground truncate">{item.name}</span>
                              </div>
                              <span className="font-mono font-semibold">{item.value}h</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Roster logs grid */}
              <Card className="glass-card p-5 space-y-4 shadow-lg hover:shadow-xl border border-border/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-semibold">Team Time Registry</h3>
                    <p className="text-xs text-muted-foreground">Admin/VP view of all logged entries.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs h-8">
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* Team Filters bar */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Team Member</Label>
                    <Select value={filterUser} onValueChange={setFilterUser}>
                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Member" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Project</Label>
                    <Select value={filterProjId} onValueChange={setFilterProjId}>
                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Project" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="TASK">Tasks</SelectItem>
                        <SelectItem value="ISSUE">Issues</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Billable</Label>
                    <Select value={filterBillable} onValueChange={setFilterBillable}>
                      <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Billable" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="billable">Billable Only</SelectItem>
                        <SelectItem value="non-billable">Non-billable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search task title or log description..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="h-9 pl-9 text-xs" />
                </div>

                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="min-w-full text-left text-[11px] table-fixed">
                    <thead className="bg-muted/65 border-b border-border/70 text-muted-foreground font-semibold backdrop-blur-md">
                      <tr>
                        <th className="px-4 py-3 w-[120px]">Member</th>
                        <th className="px-4 py-3 w-[150px]">Task/Issue</th>
                        <th className="px-4 py-3 w-[90px]">Date</th>
                        <th className="px-4 py-3 w-[70px]">Hours</th>
                        <th className="px-4 py-3 w-[90px]">Billable</th>
                        <th className="px-4 py-3 w-[180px]">Description</th>
                        <th className="px-4 py-3 text-right w-[80px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {teamFilteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">No logs found matching search.</td>
                        </tr>
                      ) : (
                        teamFilteredLogs.map((entry) => {
                          const uObj = users.find((u) => u.id === entry.userId);
                          const task = allTasks.find((t) => t.id === entry.taskId);
                          const proj = projects.find((p) => p?.id === task?.projectId);
                          return (
                            <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 truncate">
                                <div className="font-semibold text-foreground truncate">{uObj?.name ?? "Unknown User"}</div>
                                <div className="text-[9px] text-muted-foreground truncate">{uObj?.email}</div>
                              </td>
                              <td className="px-4 py-3 truncate">
                                <div className="font-medium text-foreground truncate">{task?.title ?? "Unknown Task"}</div>
                                <div className="text-[9px] text-muted-foreground truncate">{proj?.name ?? "No Project"}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{format(new Date(entry.startTime), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3 font-mono font-extrabold text-primary">{entry.hours?.toFixed(2)}h</td>
                              <td className="px-4 py-3">
                                <Badge variant={entry.billable ? "default" : "secondary"} className="text-[8px] px-1.5 py-0">
                                  {entry.billable ? "Billable" : "Non-Billable"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 truncate" title={entry.description ?? ""}>
                                {entry.description || <span className="text-muted-foreground italic">No description</span>}
                              </td>
                              <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(entry)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLog(entry.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Standard user Layout */
          <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
            {/* Unified Logger Panel (Stopwatch + Manual) */}
            <Card className="glass-card p-5 flex flex-col border border-white/10 shadow-xl shadow-indigo-500/5 hover:border-primary/10 transition-all duration-300">
              <Tabs defaultValue="timer" className="w-full space-y-4">
                <TabsList className="grid grid-cols-2 bg-muted/65 p-1 rounded-lg">
                  <TabsTrigger value="timer" className="text-[10px] font-bold uppercase rounded-md py-1.5 flex items-center justify-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Live Timer</TabsTrigger>
                  <TabsTrigger value="manual" className="text-[10px] font-bold uppercase rounded-md py-1.5 flex items-center justify-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Manual Log</TabsTrigger>
                </TabsList>

                {/* TIMER MODE */}
                <TabsContent value="timer" className="space-y-4 outline-none">
                  <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/15 p-5 text-center flex flex-col items-center justify-center space-y-4 min-h-[220px]">
                    <div className="absolute right-[-20px] bottom-[-20px] text-primary/5 select-none pointer-events-none scale-150">
                      <Clock className="h-36 w-36 stroke-[1]" />
                    </div>

                    <div className="space-y-1 relative z-10">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Stopwatch Tracker</span>
                      <h4 className="text-3xl font-mono font-bold tracking-widest text-foreground drop-shadow-md pt-2">{formatStopwatch(timerElapsed)}</h4>
                    </div>

                    <div className="w-full space-y-2 relative z-10">
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={timerProjId} onValueChange={(val) => { setTimerProjId(val); setTimerTaskId(""); }}>
                          <SelectTrigger className="h-8 text-[10px] bg-background/50 border-white/10">
                            <SelectValue placeholder="Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>

                        <Select value={timerTaskId} onValueChange={setTimerTaskId}>
                          <SelectTrigger className="h-8 text-[10px] bg-background/50 border-white/10">
                            <SelectValue placeholder="Select Task..." />
                          </SelectTrigger>
                          <SelectContent>
                            {timerAssignedTasks.length === 0 ? (
                              <SelectItem value="none" disabled>No assigned tasks</SelectItem>
                            ) : (
                              timerAssignedTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Input value={timerDesc} onChange={(e) => setTimerDesc(e.target.value)} placeholder="Tracking notes..." className="h-8 text-[10px] bg-background/50 border-white/10" />
                    </div>

                    <div className="flex gap-2.5 relative z-10 w-full">
                      {timerRunning ? (
                        <Button onClick={() => setTimerRunning(false)} className="flex-1 h-9 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 rounded-xl">
                          <Pause className="h-4 w-4" /> Pause Timer
                        </Button>
                      ) : (
                        <Button onClick={() => setTimerRunning(true)} className="flex-1 h-9 text-xs bg-gradient-primary text-primary-foreground font-bold gap-1.5 rounded-xl">
                          <Play className="h-4 w-4" /> Start Timer
                        </Button>
                      )}
                      <Button onClick={handleTimerSave} className="flex-1 h-9 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1.5 rounded-xl" disabled={timerElapsed < 5}>
                        Submit Log
                      </Button>
                      {timerElapsed > 0 && (
                        <Button size="icon" variant="outline" onClick={() => { setTimerRunning(false); setTimerElapsed(0); }} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* MANUAL MODE */}
                <TabsContent value="manual" className="space-y-3.5 outline-none">
                  <form onSubmit={handleLogSubmit} className="space-y-3 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="logProjUser" className="text-[10px] font-bold text-muted-foreground uppercase">Project</Label>
                        <Select value={logProjId} onValueChange={(val) => { setLogProjId(val); setLogTaskId(""); }}>
                          <SelectTrigger id="logProjUser" className="w-full h-8 text-[11px] bg-background/50 border-white/10 rounded-lg">
                            <SelectValue placeholder="Select Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="logTypeUser" className="text-[10px] font-bold text-muted-foreground uppercase">Type</Label>
                        <Select value={logType} onValueChange={(val: any) => { setLogType(val); setLogTaskId(""); }}>
                          <SelectTrigger id="logTypeUser" className="w-full h-8 text-[11px] bg-background/50 border-white/10 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TASK">Tasks</SelectItem>
                            <SelectItem value="ISSUE">Issues</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="logTaskUser" className="text-[10px] font-bold text-muted-foreground uppercase">Assigned {logType === "TASK" ? "Task" : "Issue"}</Label>
                        <Select value={logTaskId} onValueChange={setLogTaskId}>
                          <SelectTrigger id="logTaskUser" className="w-full h-8 text-[11px] bg-background/50 border-white/10 rounded-lg">
                            <SelectValue placeholder="Select Item..." />
                          </SelectTrigger>
                          <SelectContent>
                            {loggerAssignedTasks.length === 0 ? (
                              <SelectItem value="none" disabled>No items assigned</SelectItem>
                            ) : (
                              loggerAssignedTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="logDateUser" className="text-[10px] font-bold text-muted-foreground uppercase">Date</Label>
                        <Input id="logDateUser" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="h-8 text-[11px] bg-background/50 border-white/10 rounded-lg" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="logHoursUser" className="text-[10px] font-bold text-muted-foreground uppercase">Hours Spent</Label>
                        <Input id="logHoursUser" type="number" min="0.5" max="24" step="0.5" value={logHours} onChange={(e) => setLogHours(e.target.value)} className="h-8 text-[11px] bg-background/50 border-white/10 rounded-lg" required />
                      </div>
                      <div className="flex items-center space-x-2 pb-2 pl-1 select-none">
                        <Checkbox id="logBillableUser" checked={logBillable} onCheckedChange={(val: boolean) => setLogBillable(val)} />
                        <Label htmlFor="logBillableUser" className="cursor-pointer text-[10px] uppercase font-bold text-muted-foreground">Billable</Label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="logDescUser" className="text-[10px] font-bold text-muted-foreground uppercase">Description</Label>
                      <Input id="logDescUser" value={logDesc} onChange={(e) => setLogDesc(e.target.value)} placeholder="What did you work on?" className="h-8 text-[11px] bg-background/50 border-white/10 rounded-lg" />
                    </div>

                    <Button type="submit" className="w-full h-8 text-[11px] bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover:shadow-glow transition-all">
                      Log Hours
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Registry list */}
            <Card className="glass-card p-5 space-y-4 shadow-lg hover:shadow-xl transition-all border border-border/70">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-semibold">My Time Registry</h3>
                  <p className="text-xs text-muted-foreground">Modify and track your logged entries.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={filterProjId} onValueChange={setFilterProjId}>
                    <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue placeholder="Project" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 text-xs w-[110px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="TASK">Tasks</SelectItem>
                      <SelectItem value="ISSUE">Issues</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search filter panel */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search logs..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="h-9 pl-9 text-xs" />
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/60 shadow-xs">
                <table className="min-w-full text-left text-[11px] table-fixed">
                  <thead className="bg-muted/65 border-b border-border/70 text-muted-foreground font-semibold backdrop-blur-md sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-[150px]">Task/Issue</th>
                      <th className="px-4 py-3 w-[100px]">Date</th>
                      <th className="px-4 py-3 w-[70px]">Hours</th>
                      <th className="px-4 py-3 w-[90px]">Billable</th>
                      <th className="px-4 py-3 w-[160px]">Description</th>
                      <th className="px-4 py-3 text-right w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {myFilteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">No logs found matching search.</td>
                      </tr>
                    ) : (
                      myFilteredLogs.map((entry) => {
                        const task = allTasks.find((t) => t.id === entry.taskId);
                        const proj = projects.find((p) => p?.id === task?.projectId);
                        return (
                          <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 truncate">
                              <div className="font-semibold text-foreground truncate">{task?.title ?? "Unknown Task"}</div>
                              <div className="text-[9px] text-muted-foreground truncate">{proj?.name ?? "No Project"}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{format(new Date(entry.startTime), "MMM d, yyyy")}</td>
                            <td className="px-4 py-3 font-mono font-extrabold text-primary">{entry.hours?.toFixed(2)}h</td>
                            <td className="px-4 py-3">
                              <Badge variant={entry.billable ? "default" : "secondary"} className="text-[8px] px-1.5 py-0">
                                {entry.billable ? "Billable" : "Non-Billable"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 truncate" title={entry.description ?? ""}>
                              {entry.description || <span className="text-muted-foreground italic">No description</span>}
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(entry)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLog(entry.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </main>

      {/* Edit Entry Dialog */}
      <Dialog open={editingEntry !== null} onOpenChange={(open) => { if (!open) setEditingEntry(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Make changes to this log entry below.
            </DialogDescription>
          </DialogHeader>

          {editingEntry && (
            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="editTask">Task / Issue</Label>
                <Select value={editTaskId} onValueChange={setEditTaskId}>
                  <SelectTrigger id="editTask" className="w-full">
                    <SelectValue placeholder="Select Task/Issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {myAssignedTasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title} ({t.taskType.toLowerCase()})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editDate">Date</Label>
                  <Input id="editDate" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editHours">Hours</Label>
                  <Input id="editHours" type="number" min="0.5" max="24" step="0.5" value={editHours} onChange={(e) => setEditHours(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editDesc">Description</Label>
                <Input id="editDesc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="editBillable" checked={editBillable} onCheckedChange={(val: boolean) => setEditBillable(val)} />
                <Label htmlFor="editBillable" className="cursor-pointer font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Billable Entry</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} className="bg-gradient-primary text-primary-foreground font-semibold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
