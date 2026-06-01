import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useMemo, useState, useEffect } from "react";
import { useProjects, useStatuses, useTasks, useUpdateTask, useUpdateTaskStatus } from "@/lib/queries";
import { format, isAfter } from "date-fns";
import {
  Search, Plus, Filter, ArrowUpDown, Layers, Settings2, Tag,
  Trash2, UserPlus, MoreHorizontal, AlertOctagon, ArrowUp, ArrowDown, Check, Download, Loader2,
  CheckSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ZGroupBar, ZToolbar, ZChip,
} from "@/components/tfp/zoho";
import {
  ZPageHeader, ZViewSwitcher, type ZView, ZAvatarStack, ZPriorityPill, ZBulkBar,
  ZToolStrip, ZToolBtn,
} from "@/components/zoho/components";
import { GanttChart } from "@/components/tfp/gantt-chart";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — TaskFlow Pro" }] }),
  component: TasksPage,
});

type GroupBy = "status" | "project" | "priority" | "assignee" | "none";
type FilterMode = "all" | "open" | "closed" | "mine" | "overdue";

type ExportColumn = {
  id: string;
  label: string;
  checked: boolean;
};

function TasksPage() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isTasksRoot = pathname === "/tasks";
  const { data: tasks = [] } = useTasks();
  const { data: statuses = [] } = useStatuses();
  const { data: projects = [] } = useProjects();
  const updateStatus = useUpdateTaskStatus();

  // Search/Filters states
  const [q, setQ] = useState("");
  const [view, setView] = useState<ZView>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modern Popover Filter States
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterDueDateStart, setFilterDueDateStart] = useState<string>("");
  const [filterDueDateEnd, setFilterDueDateEnd] = useState<string>("");

  // Export Dialog States
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf" | "excel">("csv");
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([
    { id: "id", label: "Task ID", checked: true },
    { id: "title", label: "Title", checked: true },
    { id: "project", label: "Project", checked: true },
    { id: "status", label: "Status", checked: true },
    { id: "priority", label: "Priority", checked: true },
    { id: "assignees", label: "Assignees", checked: true },
    { id: "dueDate", label: "Due Date", checked: true },
    { id: "progress", label: "Progress", checked: true },
  ]);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportReady, setExportReady] = useState(false);

  // Apply filters
  const filtered = useMemo(() => {
    const today = new Date();
    return tasks.filter((t) => {
      if (t.taskType !== "TASK") return false;
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "open" && t.statusId === "s-done") return false;
      if (filter === "closed" && t.statusId !== "s-done") return false;
      if (filter === "overdue" && (!t.dueDate || isAfter(new Date(t.dueDate), today) || t.statusId === "s-done")) return false;

      // Multi-select Priority filter
      if (filterPriorities.length > 0 && !filterPriorities.includes(t.priority ?? "MEDIUM")) return false;

      // Multi-select Project filter
      if (filterProjects.length > 0 && !filterProjects.includes(t.projectId)) return false;

      // Due date range filter
      if (filterDueDateStart) {
        if (!t.dueDate || new Date(t.dueDate) < new Date(filterDueDateStart + "T00:00:00")) return false;
      }
      if (filterDueDateEnd) {
        if (!t.dueDate || new Date(t.dueDate) > new Date(filterDueDateEnd + "T23:59:59")) return false;
      }

      return true;
    });
  }, [tasks, q, filter, filterPriorities, filterProjects, filterDueDateStart, filterDueDateEnd]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Tasks", color: "var(--color-primary)", items: filtered }];
    if (groupBy === "project") {
      return projects
        .map((p) => ({ key: p.id, label: p.name, color: "var(--color-info)", items: filtered.filter((t) => t.projectId === p.id) }))
        .filter((g) => g.items.length);
    }
    if (groupBy === "priority") {
      const buckets = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
      const colors = ["#dc2626", "#ea580c", "#ca8a04", "#0891b2"];
      return buckets.map((p, i) => ({
        key: p, label: p, color: colors[i],
        items: filtered.filter((t) => (t.priority ?? "MEDIUM") === p),
      })).filter((g) => g.items.length);
    }
    if (groupBy === "assignee") {
      const uids = Array.from(new Set(filtered.flatMap((t) => t.assigneeIds.length ? t.assigneeIds : ["_un"])));
      return uids.map((uid) => ({
        key: uid, label: uid === "_un" ? "Unassigned" : uid, color: "var(--color-primary)",
        items: filtered.filter((t) => uid === "_un" ? t.assigneeIds.length === 0 : t.assigneeIds.includes(uid)),
      })).filter((g) => g.items.length);
    }
    return statuses.map((s) => ({
      key: s.id, label: s.name, color: s.color,
      items: filtered.filter((t) => t.statusId === s.id),
    })).filter((g) => g.items.length);
  }, [filtered, groupBy, statuses, projects]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const bulkSetStatus = async (statusId: string) => {
    for (const id of selected) await updateStatus.mutateAsync({ taskId: id, statusId });
    toast.success(`${selected.size} tasks updated`);
    setSelected(new Set());
  };

  // Reordering columns for export dialog
  const moveColumn = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= exportColumns.length) return;
    const nextCols = [...exportColumns];
    const temp = nextCols[index];
    nextCols[index] = nextCols[nextIndex];
    nextCols[nextIndex] = temp;
    setExportColumns(nextCols);
  };

  const toggleColumnCheck = (index: number) => {
    const nextCols = [...exportColumns];
    nextCols[index] = { ...nextCols[index], checked: !nextCols[index].checked };
    setExportColumns(nextCols);
  };

  // Start realistic async report export progress simulation
  const startExport = () => {
    setIsExporting(true);
    setExportReady(false);
    setExportProgress(0);
    setExportStep("Querying task database...");

    const steps = [
      { prg: 25, label: "Compiling records..." },
      { prg: 55, label: "Formatting layouts..." },
      { prg: 80, label: "Generating export bundle..." },
      { prg: 100, label: "Ready for download!" },
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      setExportProgress((p) => {
        const target = steps[currentStepIdx].prg;
        if (p >= target) {
          if (currentStepIdx < steps.length - 1) {
            currentStepIdx++;
            setExportStep(steps[currentStepIdx].label);
          } else {
            clearInterval(interval);
            setIsExporting(false);
            setExportReady(true);
            toast.success("Report generation complete!");
            return 100;
          }
        }
        return p + 5;
      });
    }, 150);
  };

  return (
    <>
      {isTasksRoot && (
        <>
          <Topbar title="Tasks" />
          <main className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto text-xs relative overflow-hidden">
            {/* Large Background Decorative Route Icon */}
            <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
              <CheckSquare className="h-[420px] w-[420px] opacity-[0.02] -rotate-12 stroke-[1] animate-pulse" />
            </div>

            {/* Hero header banner */}
            <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent p-6 shadow-md rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <CheckSquare className="h-5 w-5" />
                  </span>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Task Pipeline</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Organize, sequence, and execute work items across projects. Balance user load and track completion metrics.
                </p>
                <div className="flex gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
                  <span className="flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> {filtered.length} active tasks</span>
                  <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-indigo-500" /> {tasks.filter((t) => t.taskType === "TASK" && t.statusId === "s-done").length} completed</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 z-10">
                <ZViewSwitcher value={view} onChange={setView} />
                <Button size="sm" onClick={() => setIsExportOpen(true)} variant="outline" className="border-white/10 bg-background/40 hover-lift font-semibold text-xs rounded-xl shadow-xs">
                  <Download className="mr-1 h-3.5 w-3.5" /> Export Report
                </Button>
                <Button size="sm" onClick={() => nav({ to: "/tasks/new" })} className="bg-gradient-primary text-primary-foreground font-semibold hover-lift text-xs rounded-xl shadow-md">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Task
                </Button>
              </div>
            </div>
            <ZToolbar
              left={
                <>
                  <ZChip active={filter === "all"} onClick={() => setFilter("all")}>All</ZChip>
                  <ZChip active={filter === "open"} onClick={() => setFilter("open")}>Open</ZChip>
                  <ZChip active={filter === "overdue"} onClick={() => setFilter("overdue")}>Overdue</ZChip>
                  <ZChip active={filter === "closed"} onClick={() => setFilter("closed")}>Closed</ZChip>

                  <span className="mx-2 h-4 w-px bg-border" />

                  <ZToolStrip>
                    <GroupByMenu value={groupBy} onChange={setGroupBy} />

                    {/* Modern Popover Filter Panel */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                          <Filter className="h-3 w-3" /> Filters
                          {(filterPriorities.length > 0 || filterProjects.length > 0 || filterDueDateStart || filterDueDateEnd) && (
                            <Badge variant="default" className="ml-1 h-4 min-w-4 rounded-full px-1 text-[8px]">
                              {(filterPriorities.length ? 1 : 0) + (filterProjects.length ? 1 : 0) + (filterDueDateStart || filterDueDateEnd ? 1 : 0)}
                            </Badge>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4 space-y-4" align="start">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Filter Panel</h4>
                          <button
                            onClick={() => {
                              setFilterPriorities([]);
                              setFilterProjects([]);
                              setFilterDueDateStart("");
                              setFilterDueDateEnd("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-primary transition"
                          >
                            Reset All
                          </button>
                        </div>

                        {/* Priority Filter */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Priorities</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => {
                              const checked = filterPriorities.includes(p);
                              return (
                                <div key={p} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`prio-${p}`}
                                    checked={checked}
                                    onCheckedChange={(val) => {
                                      if (val) setFilterPriorities((prev) => [...prev, p]);
                                      else setFilterPriorities((prev) => prev.filter((x) => x !== p));
                                    }}
                                  />
                                  <Label htmlFor={`prio-${p}`} className="text-xs font-normal cursor-pointer capitalize">{p.toLowerCase()}</Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Project Filter */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Projects</Label>
                          <div className="max-h-24 overflow-y-auto space-y-2 pr-1">
                            {projects.map((p) => {
                              const checked = filterProjects.includes(p.id);
                              return (
                                <div key={p.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`proj-${p.id}`}
                                    checked={checked}
                                    onCheckedChange={(val) => {
                                      if (val) setFilterProjects((prev) => [...prev, p.id]);
                                      else setFilterProjects((prev) => prev.filter((x) => x !== p.id));
                                    }}
                                  />
                                  <Label htmlFor={`proj-${p.id}`} className="text-xs font-normal cursor-pointer truncate max-w-[200px]" title={p.name}>
                                    {p.name}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Due Date Range */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase text-muted-foreground">Due Date Range</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor="dueStart" className="text-[9px] text-muted-foreground">Start</Label>
                              <Input id="dueStart" type="date" value={filterDueDateStart} onChange={(e) => setFilterDueDateStart(e.target.value)} className="h-7 text-[10px] px-1.5" />
                            </div>
                            <div>
                              <Label htmlFor="dueEnd" className="text-[9px] text-muted-foreground">End</Label>
                              <Input id="dueEnd" type="date" value={filterDueDateEnd} onChange={(e) => setFilterDueDateEnd(e.target.value)} className="h-7 text-[10px] px-1.5" />
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <ZToolBtn icon={ArrowUpDown} label="Sort" />
                    <ZToolBtn icon={Settings2} label="Layout" />
                  </ZToolStrip>
                </>
              }
              right={
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)}
                    className="h-8 w-60 pl-8 text-[12.5px]"
                  />
                </div>
              }
            />

            {view === "list" && (
              <div className="glass-card-green overflow-hidden rounded-2xl relative z-10 p-2 shadow-lg transition-all duration-300">
                {groups.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">No tasks match.</div>
                ) : (
                  groups.map((g) => {
                    const isCollapsed = collapsed[g.key];
                    return (
                      <div key={g.key}>
                        <ZGroupBar
                          label={g.label} count={g.items.length} color={g.color}
                          collapsed={isCollapsed}
                          onToggle={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                        />
                        {!isCollapsed && (
                          /* Scrolling enabled within the Accordion container */
                          <div className="max-h-[350px] overflow-y-auto">
                            <table className="w-full text-[12.5px]">
                              <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground sticky top-0 bg-card z-10 border-b border-border">
                                <tr>
                                  <th className="w-8 px-3 py-1.5"></th>
                                  <th className="px-2 py-1.5 font-medium">Task</th>
                                  <th className="px-2 py-1.5 font-medium">Project</th>
                                  <th className="px-2 py-1.5 font-medium">Priority</th>
                                  <th className="px-2 py-1.5 font-medium">Assignees</th>
                                  <th className="px-2 py-1.5 font-medium">Due</th>
                                  <th className="px-2 py-1.5 font-medium">Progress</th>
                                  <th className="px-2 py-1.5"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.items.map((t) => {
                                  const p = projects.find((x) => x.id === t.projectId);
                                  const s = statuses.find((x) => x.id === t.statusId);
                                  const pct = t.estimatedHours && t.estimatedHours > 0
                                    ? Math.min(100, Math.round(((t.loggedHours ?? 0) / t.estimatedHours) * 100)) : 0;
                                  const overdue = t.dueDate && isAfter(new Date(), new Date(t.dueDate)) && t.statusId !== "s-done";
                                  return (
                                    <tr key={t.id} className={`border-t border-border/60 hover:bg-muted/30 ${selected.has(t.id) ? "bg-primary/5" : ""}`}>
                                      <td className="px-3 py-1.5">
                                        <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <div className="flex items-center gap-2">
                                          {s && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} title={s.name} />}
                                          <Link to="/tasks/$id" params={{ id: t.id }}
                                            className="truncate font-medium text-foreground hover:text-primary hover:underline">
                                            {t.title}
                                          </Link>
                                        </div>
                                        <div className="mt-0.5 ml-4 font-mono text-[10px] text-muted-foreground">{t.id.toUpperCase()}</div>
                                      </td>
                                      <td className="px-2 py-1.5">
                                        {p && <span className="text-[11px] text-muted-foreground">{p.name}</span>}
                                      </td>
                                      <td className="px-2 py-1.5"><ZPriorityPill p={t.priority} /></td>
                                      <td className="px-2 py-1.5"><ZAvatarStack ids={t.assigneeIds} /></td>
                                      <td className={`px-2 py-1.5 font-mono text-[11px] ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                        {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <div className="flex items-center gap-2">
                                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="font-mono text-[10px] text-muted-foreground">{pct}%</span>
                                        </div>
                                      </td>
                                      <td className="px-2 py-1.5 text-right">
                                        <Button asChild size="icon" variant="ghost" className="h-6 w-6">
                                          <Link to="/tasks/$id" params={{ id: t.id }}>
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                          </Link>
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {view === "kanban" && (
              <div className="flex gap-3 overflow-x-auto pb-4 relative z-10">
                {statuses.map((col) => (
                  <div key={col.id} className="flex w-72 shrink-0 flex-col rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md p-3 shadow-md glass-card-green relative z-10 transition-all duration-300">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-[12px] font-semibold">{col.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {filtered.filter((t) => t.statusId === col.id).length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 p-2">
                      {filtered.filter((t) => t.statusId === col.id).map((t) => (
                        <Link key={t.id} to="/tasks/$id" params={{ id: t.id }}
                          className="rounded-xl border border-border bg-card p-3 text-[12px] shadow-sm hover:border-emerald-500/40 hover:shadow-[0_0_12px_rgba(16,185,129,0.1)] transition-all">
                          {t.category && (
                            <span className="inline-block mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{t.category}</span>
                          )}
                          <p className="font-medium leading-snug">{t.title}</p>
                          {t.badges && t.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {t.badges.map(b => (
                                <span key={b} className="text-[8px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded px-1 py-0.5">{b.replace(/_/g,' ')}</span>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <ZPriorityPill p={t.priority} />
                            <ZAvatarStack ids={t.assigneeIds} size={20} max={2} />
                          </div>
                          {t.storyPoints && (
                            <div className="mt-1.5 text-[9px] text-muted-foreground">SP: {t.storyPoints}</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === "calendar" && (
              <CalendarView tasks={filtered} />
            )}

            {view === "gantt" && (
              <GanttChart tasks={filtered} statuses={statuses} projects={projects} />
            )}
          </main>
        </>
      )}

      <Outlet />

      <ZBulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
              <Tag className="h-3 w-3" /> Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statuses.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => bulkSetStatus(s.id)} className="text-xs">
                <span className="mr-2 h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><UserPlus className="h-3 w-3" /> Assign</Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive"
          onClick={() => { toast.success(`${selected.size} archived`); setSelected(new Set()); }}>
          <Trash2 className="h-3 w-3" /> Archive
        </Button>
      </ZBulkBar>

      {/* Async Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={(open) => {
        setIsExportOpen(open);
        if (!open) {
          setIsExporting(false);
          setExportReady(false);
          setExportProgress(0);
        }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Asynchronous Report Export</DialogTitle>
            <DialogDescription>
              Select export formats and customize/reorder columns to generate report.
            </DialogDescription>
          </DialogHeader>

          {!isExporting && !exportReady && (
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="expFormat">Export Format</Label>
                <Select value={exportFormat} onValueChange={(val: any) => setExportFormat(val)}>
                  <SelectTrigger id="expFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Flat Text)</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx Sheets)</SelectItem>
                    <SelectItem value="pdf">PDF (Printable Document)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Choose & Reorder Columns</Label>
                <div className="border border-border rounded-lg divide-y divide-border/60 max-h-[220px] overflow-y-auto">
                  {exportColumns.map((col, idx) => (
                    <div key={col.id} className="flex items-center justify-between p-2 hover:bg-muted/30">
                      <div className="flex items-center space-x-2.5">
                        <Checkbox
                          id={`col-${col.id}`}
                          checked={col.checked}
                          onCheckedChange={() => toggleColumnCheck(idx)}
                        />
                        <Label htmlFor={`col-${col.id}`} className="text-xs font-normal cursor-pointer select-none">
                          {col.label}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveColumn(idx, "up")}
                          title="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-6 w-6"
                          disabled={idx === exportColumns.length - 1}
                          onClick={() => moveColumn(idx, "down")}
                          title="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isExporting && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1.5 w-full max-w-[280px]">
                <h4 className="font-semibold text-sm">{exportStep}</h4>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{exportProgress}% completed</p>
              </div>
            </div>
          )}

          {exportReady && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-semibold text-sm">Export Complete!</h4>
                <p className="text-xs text-muted-foreground">Your {exportFormat.toUpperCase()} report is compiled and ready for delivery.</p>
              </div>
              <Button
                onClick={() => {
                  toast.success(`Downloading report_${Date.now()}.${exportFormat}`);
                  setIsExportOpen(false);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-6"
              >
                Download File
              </Button>
            </div>
          )}

          <DialogFooter>
            {!isExporting && !exportReady && (
              <>
                <Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancel</Button>
                <Button onClick={startExport} className="bg-gradient-primary text-primary-foreground font-semibold">Generate Export</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GroupByMenu({ value, onChange }: { value: GroupBy; onChange: (g: GroupBy) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
          <Layers className="h-3 w-3" /> Group: <span className="font-medium text-foreground capitalize">{value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="text-[10px] uppercase">Group by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(["status", "project", "priority", "assignee", "none"] as GroupBy[]).map((g) => (
          <DropdownMenuItem key={g} onClick={() => onChange(g)} className="text-xs capitalize">{g}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CalendarView({ tasks }: { tasks: ReturnType<typeof useTasks>["data"] }) {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + i); return d;
  });
  return (
    <div className="grid grid-cols-7 gap-1 rounded-md border border-border bg-card p-3">
      {days.map((d) => {
        const dayTasks = (tasks ?? []).filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === d.toDateString());
        return (
          <div key={d.toISOString()} className="min-h-[80px] rounded border border-border/60 bg-background p-1.5">
            <p className="text-[10px] font-mono text-muted-foreground">{format(d, "MMM d")}</p>
            <div className="mt-1 space-y-0.5">
              {dayTasks.slice(0, 3).map((t) => (
                <Link key={t.id} to="/tasks/$id" params={{ id: t.id }}
                  className="block truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary hover:bg-primary/20">
                  {t.title}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
