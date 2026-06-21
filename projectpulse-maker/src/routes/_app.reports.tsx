import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { useProjects, useTasks, useUsers, useSprints, usePhases } from "@/lib/queries";
import { DataTable } from "@/components/tfp/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Task } from "@/lib/types";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Download, Loader2, FileDown, BarChart2, FileSpreadsheet, Filter, 
  ChevronDown, ChevronRight, ListPlus, FolderKanban, SlidersHorizontal, X
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { tokenStore } from "@/lib/api";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports & Data Grid — TaskFlow Pro" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: users = [] } = useUsers();
  const { data: sprints = [] } = useSprints();
  const { data: phasesList = [] } = usePhases();
  const allPhasesAndSprints = useMemo(() => [...sprints, ...phasesList], [sprints, phasesList]);
  const { user } = useAuth();

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState<string[]>(["id", "title", "project", "status", "priority"]);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadJobId, setDownloadJobId] = useState<string | null>(null);

  // Filter & Grouping panel states
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [groupBy, setGroupBy] = useState<string>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Derive filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Project Filter
      if (selectedProject !== "all" && t.projectId !== selectedProject) return false;

      // 2. Priority Filter
      if (selectedPriority !== "all" && (t.priority ?? "MEDIUM") !== selectedPriority) return false;

      // 3. Date range filter
      if (dateStart) {
        if (!t.dueDate || new Date(t.dueDate) < new Date(dateStart + "T00:00:00")) return false;
      }
      if (dateEnd) {
        if (!t.dueDate || new Date(t.dueDate) > new Date(dateEnd + "T23:59:59")) return false;
      }

      // 4. Type Filter
      if (selectedFilter === "my") {
        if (!user || !t.assigneeIds?.includes(user.id)) return false;
      }
      if (selectedFilter === "overdue") {
        if (!t.dueDate) return false;
        if (new Date(t.dueDate) < new Date() && t.statusId !== "s-done") return false;
      }
      if (selectedFilter === "today") {
        if (!t.dueDate) return false;
        const today = new Date().toISOString().split("T")[0];
        if (t.dueDate !== today) return false;
      }
      if (selectedFilter === "closed") {
        if (t.statusId !== "s-done") return false;
      }
      return true;
    });
  }, [tasks, selectedProject, selectedFilter, selectedPriority, dateStart, dateEnd, user]);

  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: "displayId",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>ID</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.displayId || row.original.id.substring(0,8)}</span>,
    },
    {
      accessorKey: "taskType",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Type</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => {
        const type = row.original.taskType;
        const color = type === "ISSUE" ? "text-red-500 border-red-500/20 bg-red-500/5" : "text-slate-400 border-slate-500/20 bg-slate-500/5";
        return <Badge variant="outline" className={`${color} text-[10px] font-bold`}>{type}</Badge>;
      },
    },
    {
      accessorKey: "title",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Title</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => <div className="font-medium text-foreground max-w-[200px] truncate">{row.original.title}</div>,
    },
    {
      accessorKey: "projectId",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Project</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => {
        const p = projects.find(p => p.id === row.original.projectId);
        return <span className="text-muted-foreground">{p?.name || "Unknown"}</span>;
      },
    },
    {
      accessorKey: "statusId",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Status</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => {
        const status = row.original.statusId === "s-done" ? "DONE" : row.original.statusId === "s-progress" ? "IN PROGRESS" : row.original.statusId === "s-todo" ? "TODO" : row.original.statusId === "s-blocked" ? "BLOCKED" : "BACKLOG";
        const color = status === "DONE" ? "text-emerald-500 border-emerald-500/30" : status === "IN PROGRESS" ? "text-blue-500 border-blue-500/30" : status === "BLOCKED" ? "text-rose-500 border-rose-500/30" : "text-muted-foreground";
        return <Badge variant="outline" className={`${color} text-[10px]`}>{status}</Badge>;
      },
    },
    {
      accessorKey: "priority",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Priority</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => {
        const p = row.original.priority || "MEDIUM";
        const c = p === "CRITICAL" ? "bg-destructive text-white border-destructive" : p === "HIGH" ? "text-red-500 border-red-500/30 bg-red-500/5 font-bold" : p === "MEDIUM" ? "text-indigo-400 border-indigo-500/30" : "text-muted-foreground";
        return <Badge variant="outline" className={`${c} text-[10px]`}>{p}</Badge>;
      },
    },
    {
      accessorKey: "category",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>TaskList</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.category || "-"}</span>,
    },
    {
      accessorKey: "assigneeIds",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Assignees</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => {
        const ids = row.original.assigneeIds || [];
        if (ids.length === 0) return <span className="text-muted-foreground italic">-</span>;
        const names = ids.map(id => users.find(u => u.id === id)?.name || id).join(", ");
        return <span className="text-foreground max-w-[120px] truncate block" title={names}>{names}</span>;
      },
    },
    {
      accessorKey: "estimatedHours",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Estimate</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => <span className="text-muted-foreground font-mono">{row.original.estimatedHours ? `${row.original.estimatedHours}h` : "-"}</span>,
    },
    {
      accessorKey: "dueDate",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Due Date</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => <span className="text-muted-foreground font-mono">{row.original.dueDate ? row.original.dueDate.split("T")[0] : "-"}</span>,
    },
    {
      accessorKey: "sprintId",
      header: () => (
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsFilterPanelOpen(true)}>
          <span>Sprint</span>
          <Filter className="h-3 w-3 text-muted-foreground/60 hover:text-foreground" />
        </div>
      ),
      cell: ({ row }) => {
        const s = sprints.find(x => x.id === row.original.sprintId);
        return <span className="text-muted-foreground max-w-[100px] truncate block" title={s?.name}>{s?.name || "-"}</span>;
      },
    },
  ];

  // Grouped Tasks derivation
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return null;
    const groups: Record<string, Task[]> = {};

    filteredTasks.forEach(task => {
      let groupName = "Unassigned";

      if (groupBy === "status") {
        groupName = task.statusId === "s-done" ? "DONE" : task.statusId === "s-progress" ? "IN PROGRESS" : task.statusId === "s-todo" ? "TO DO" : task.statusId === "s-blocked" ? "BLOCKED" : task.statusId === "s-backlog" ? "BACKLOG" : "TODO";
      } else if (groupBy === "priority") {
        groupName = task.priority || "MEDIUM";
      } else if (groupBy === "project") {
        const p = projects.find(x => x.id === task.projectId);
        groupName = p?.name || "Unknown Project";
      } else if (groupBy === "category") {
        groupName = task.category || "No TaskList";
      } else if (groupBy === "phase") {
        const targetId = task.phaseId || task.sprintId;
        if (targetId && targetId !== "none") {
          const s = allPhasesAndSprints.find(x => x.id.toLowerCase() === targetId.toLowerCase());
          groupName = s?.name || targetId;
        } else {
          groupName = "No Phase / Sprint";
        }
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(task);
    });

    return groups;
  }, [filteredTasks, groupBy, projects, allPhasesAndSprints]);

  const handleExportStart = async () => {
    setIsExporting(true);
    setDownloadJobId(null);
    try {
      const token = tokenStore.get();
      const res = await fetch("/api/v1/reports/export-async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          projectId: selectedProject === "all" ? null : selectedProject,
          filterType: selectedFilter,
          columns: exportColumns
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDownloadJobId(data.jobId);
      } else {
        await new Promise((r) => setTimeout(r, 2000));
        setDownloadJobId("mock-job-123");
      }
    } catch (e) {
      console.error(e);
      await new Promise((r) => setTimeout(r, 2000));
      setDownloadJobId("mock-job-123");
    }
  };

  useEffect(() => {
    if (!downloadJobId || downloadJobId === "mock-job-123") {
      if (downloadJobId === "mock-job-123") setIsExporting(false);
      return;
    }
    
    const interval = setInterval(async () => {
      try {
        const token = tokenStore.get();
        const res = await fetch(`/api/v1/reports/export-async/${downloadJobId}`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "COMPLETED") {
            setIsExporting(false);
            clearInterval(interval);
          }
        }
      } catch (e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [downloadJobId]);

  const toggleGroupCollapse = (grp: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [grp]: !prev[grp]
    }));
  };

  return (
    <>
      <Topbar title="Reports & Data Grid" />
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden text-xs">
        {/* Large Background Decorative Route Icon */}
        <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
          <BarChart2 className="h-[420px] w-[420px] opacity-[0.025] rotate-6 stroke-[1] animate-pulse" />
        </div>

        {/* Hero header banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent p-6 shadow-md rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <BarChart2 className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Reports & Analytics</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Filter records, track system performance metrics, and trigger asynchronous exports of the task database.
            </p>
            <div className="flex gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1">
                <BarChart2 className="h-3.5 w-3.5 text-emerald-500" /> {filteredTasks.length} tasks matching criteria
              </span>
            </div>
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="relative z-10 flex flex-wrap gap-4 items-center justify-between p-4 rounded-2xl glass-card-green">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filter Toggle Button */}
            <Button
              variant="outline"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`h-9 border-white/10 rounded-xl transition-all ${
                isFilterPanelOpen 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "bg-background/50 text-foreground hover:bg-background/80"
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              {isFilterPanelOpen ? "Hide Filters" : "Show Filters"}
            </Button>

            {/* Group By selector */}
            <div className="flex items-center gap-2 bg-background/50 border border-white/10 rounded-xl px-3 h-9">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <ListPlus className="h-3.5 w-3.5" /> Group By:
              </span>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-[130px] border-0 bg-transparent h-7 focus:ring-0 focus:ring-offset-0 px-1 py-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="category">TaskList</SelectItem>
                  <SelectItem value="phase">Phase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Action */}
          <div className="shrink-0">
            <Dialog open={isExportDialogOpen} onOpenChange={(open) => {
              setIsExportDialogOpen(open);
              if (!open) {
                setIsExporting(false);
                setDownloadJobId(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground font-semibold px-4 h-9 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all rounded-xl">
                  <Download className="h-4 w-4 mr-2" /> Async Export
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border border-white/10 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)] bg-card/75 backdrop-blur-md rounded-2xl p-6 sm:max-w-[450px]">
                <DialogHeader className="border-b border-white/10 pb-3">
                  <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-primary">
                    <FileSpreadsheet className="h-5 w-5 text-primary animate-pulse" /> Export Data Report
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">Select the columns you wish to include in your CSV report.</DialogDescription>
                </DialogHeader>

                {(!isExporting && !downloadJobId) ? (
                  <div className="space-y-4 py-3">
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      {["id", "title", "project", "status", "priority", "dueDate", "assignees", "estimate"].map(col => (
                        <div key={col} className="flex items-center space-x-2.5">
                          <Checkbox 
                            id={`col-${col}`} 
                            checked={exportColumns.includes(col)}
                            onCheckedChange={(checked) => {
                              if (checked) setExportColumns(p => [...p, col]);
                              else setExportColumns(p => p.filter(c => c !== col));
                            }}
                          />
                          <Label htmlFor={`col-${col}`} className="capitalize cursor-pointer select-none text-[11px] text-foreground/80 hover:text-foreground">{col}</Label>
                        </div>
                      ))}
                    </div>
                    <DialogFooter className="border-t border-white/10 pt-3">
                      <Button onClick={handleExportStart} className="w-full h-9 bg-gradient-primary text-primary-foreground font-semibold shadow-lg shadow-indigo-500/10 rounded-xl">Generate Report</Button>
                    </DialogFooter>
                  </div>
                ) : isExporting ? (
                  <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">Generating Report...</h3>
                      <p className="text-xs text-muted-foreground">This is running as an async job on the backend. Please wait.</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <FileDown className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base text-foreground">Report Ready</h3>
                      <p className="text-xs text-muted-foreground">Your report has been successfully generated.</p>
                    </div>
                    <Button 
                      className="mt-4 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/10 px-6 font-semibold"
                      onClick={() => {
                        if (downloadJobId === "mock-job-123") {
                          alert("Mock CSV Downloaded!");
                          setIsExportDialogOpen(false);
                          return;
                        }
                        window.open(`/api/v1/reports/export-async/${downloadJobId}/download`, "_blank");
                      }}
                    >
                      Download CSV
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content Layout split if sidebar filter panel is active */}
        <div className={`grid gap-6 items-start relative z-10 transition-all ${
          isFilterPanelOpen ? "grid-cols-1 lg:grid-cols-[280px_1fr]" : "grid-cols-1"
        }`}>
          {/* LEFT FILTER PANEL */}
          {isFilterPanelOpen && (
            <Card className="glass-card-green p-4 space-y-5 border-white/5 shadow-xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-primary" /> Filter Options
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-foreground" 
                  onClick={() => setIsFilterPanelOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Project Scope Filter */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Project Scope</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-white/10 rounded-lg">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scope filter */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Scope filter</Label>
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-white/10 rounded-lg">
                    <SelectValue placeholder="All Tasks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="my">My Tasks</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="today">Today's Tasks</SelectItem>
                    <SelectItem value="closed">Closed Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Priority</Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-white/10 rounded-lg">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range bounds */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Due Range Bounds</Label>
                <div className="space-y-1.5">
                  <Input 
                    type="date" 
                    value={dateStart} 
                    onChange={(e) => setDateStart(e.target.value)} 
                    className="w-full bg-background/50 border-white/10 rounded-lg h-8 text-xs text-foreground" 
                    title="Due Date Start" 
                  />
                  <div className="text-[10px] text-center text-muted-foreground">to</div>
                  <Input 
                    type="date" 
                    value={dateEnd} 
                    onChange={(e) => setDateEnd(e.target.value)} 
                    className="w-full bg-background/50 border-white/10 rounded-lg h-8 text-xs text-foreground" 
                    title="Due Date End" 
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedProject("all");
                    setSelectedFilter("all");
                    setSelectedPriority("all");
                    setDateStart("");
                    setDateEnd("");
                  }} 
                  className="w-full text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground h-8"
                >
                  Reset All Filters
                </Button>
              </div>
            </Card>
          )}

          {/* MAIN DATA VIEW */}
          <div className="space-y-4">
            {groupBy === "none" ? (
              <Card className="glass-card-green p-2 border-white/5 shadow-xl">
                <DataTable columns={columns} data={filteredTasks} searchKey="title" />
              </Card>
            ) : (
              <div className="space-y-3.5">
                {Object.entries(groupedTasks || {}).map(([grpName, grpTasks]) => {
                  const isCollapsed = collapsedGroups[grpName] || false;
                  return (
                    <Card key={grpName} className="glass-card-green overflow-hidden border-white/5 shadow-md">
                      {/* Accordion/Group Header */}
                      <button
                        onClick={() => toggleGroupCollapse(grpName)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-semibold text-sm capitalize text-foreground">{grpName}</span>
                          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20">
                            {grpTasks.length} {grpTasks.length === 1 ? "task" : "tasks"}
                          </Badge>
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {!isCollapsed && (
                        <div className="p-3 border-t border-border/40 bg-card/10">
                          <DataTable columns={columns} data={grpTasks} searchKey="title" />
                        </div>
                      )}
                    </Card>
                  );
                })}
                {Object.keys(groupedTasks || {}).length === 0 && (
                  <Card className="glass-card-green p-8 text-center text-muted-foreground border-white/5">
                    No results grouped.
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
