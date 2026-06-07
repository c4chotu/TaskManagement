import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIssues, useTasks, useProjects, useUsers, useStatuses } from "@/lib/queries";
import { format, isAfter } from "date-fns";
import { Search, Plus, Filter, Layers, ArrowUpDown, AlertOctagon, ShieldAlert, Flame, SlidersHorizontal, X, AlertTriangle, Activity } from "lucide-react";
import { ZChip } from "@/components/tfp/zoho";
import { DatePicker } from "@/components/ui/date-picker";
import { ZPageHeader, ZToolStrip, ZToolBtn } from "@/components/zoho/components";

export const Route = createFileRoute("/_app/issues")({
  head: () => ({ meta: [{ title: "Issues — TaskFlow Pro" }] }),
  component: IssuesPage,
});

type GroupBy = "severity" | "project" | "reported" | "status" | "priority" | "none";
type Filter = "all" | "open" | "breached" | "critical";

type IssueRow = {
  issueId: string;
  taskId: string;
  title: string;
  statusId: string;
  projectId: string;
  assigneeIds: string[];
  dueDate?: string;
  priority?: string;
  severity: string;
  reportedBy: string;
  module: string;
  slaBreached: boolean;
  affectedVersion?: string;
  reproducible: boolean;
};

function IssuesPage() {
  const navigate = useNavigate();
  const { data: issues = [] } = useIssues();
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();
  const { data: statuses = [] } = useStatuses();

  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("severity");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Left Filter Panel
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterSeverities, setFilterSeverities] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterSlaBreached, setFilterSlaBreached] = useState(false);
  const [filterDateStart, setFilterDateStart] = useState<string>("");
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");

  const activeFilterCount = filterProjects.length + filterSeverities.length + filterPriorities.length +
    (filterSlaBreached ? 1 : 0) + (filterDateStart || filterDateEnd ? 1 : 0);

  const resetFilters = () => {
    setFilterProjects([]); setFilterSeverities([]); setFilterPriorities([]);
    setFilterSlaBreached(false); setFilterDateStart(""); setFilterDateEnd("");
  };

  const rows = useMemo(() => {
    return issues.map((issue) => {
      const task = tasks.find((t) => t.id === issue.taskId);
      const project = projects.find((p) => p.id === task?.projectId);
      return {
        issueId: issue.id,
        taskId: issue.taskId,
        title: task?.title ?? "Untitled issue",
        statusId: task?.statusId ?? "",
        projectId: project?.id ?? "",
        assigneeIds: task?.assigneeIds ?? [],
        dueDate: task?.dueDate,
        priority: task?.priority,
        severity: issue.severity,
        reportedBy: issue.customerName ?? (issue.customerReported ? "Reporter" : "System"),
        module: project?.name ?? "Unknown",
        slaBreached: issue.slaBreached,
        affectedVersion: issue.affectedVersion,
        reproducible: issue.customerReported,
      };
    });
  }, [issues, tasks, projects, users]);

  const sev0Count = rows.filter(r => r.severity === "SEV0" && r.statusId !== "s-done").length;
  const sev1Count = rows.filter(r => r.severity === "SEV1" && r.statusId !== "s-done").length;
  const sev2Count = rows.filter(r => r.severity === "SEV2" && r.statusId !== "s-done").length;
  const sev3Count = rows.filter(r => r.severity === "SEV3" && r.statusId !== "s-done").length;
  const breachCount = rows.filter(r => r.slaBreached).length;

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (query && ![row.title, row.issueId, row.projectId, row.reportedBy].some((v) => v?.toLowerCase().includes(query.toLowerCase()))) return false;
      if (filter === "open" && row.statusId === "s-done") return false;
      if (filter === "breached" && !row.slaBreached) return false;
      if (filter === "critical" && row.severity !== "SEV0") return false;

      if (filterProjects.length > 0 && !filterProjects.includes(row.projectId)) return false;
      if (filterSeverities.length > 0 && !filterSeverities.includes(row.severity)) return false;
      if (filterPriorities.length > 0 && !filterPriorities.includes(row.priority ?? "MEDIUM")) return false;
      if (filterSlaBreached && !row.slaBreached) return false;
      if (filterDateStart) { if (!row.dueDate || new Date(row.dueDate) < new Date(filterDateStart + "T00:00:00")) return false; }
      if (filterDateEnd) { if (!row.dueDate || new Date(row.dueDate) > new Date(filterDateEnd + "T23:59:59")) return false; }
      return true;
    });
  }, [rows, query, filter, filterProjects, filterSeverities, filterPriorities, filterSlaBreached, filterDateStart, filterDateEnd]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Issues", color: "#3b82f6", items: filtered }];
    if (groupBy === "project") {
      return projects.map((p) => ({
        key: p.id, label: p.name, color: "var(--color-info)",
        items: filtered.filter((row) => row.projectId === p.id),
      })).filter((g) => g.items.length);
    }
    if (groupBy === "reported") {
      return [
        { key: "reporter", label: "Customer Reported", color: "var(--color-primary)", items: filtered.filter((row) => row.reproducible) },
        { key: "system", label: "Internal / System", color: "var(--color-muted)", items: filtered.filter((row) => !row.reproducible) },
      ].filter((g) => g.items.length);
    }
    if (groupBy === "status") {
      return statuses.map((s) => ({
        key: s.id, label: s.name, color: s.color,
        items: filtered.filter((row) => row.statusId === s.id),
      })).filter((g) => g.items.length);
    }
    if (groupBy === "priority") {
      const buckets = [
        { key: "CRITICAL", label: "Critical", color: "#dc2626" },
        { key: "HIGH", label: "High", color: "#ea580c" },
        { key: "MEDIUM", label: "Medium", color: "#ca8a04" },
        { key: "LOW", label: "Low", color: "#0891b2" },
      ];
      return buckets.map((b) => ({
        key: b.key, label: b.label, color: b.color,
        items: filtered.filter((row) => (row.priority ?? "MEDIUM") === b.key),
      })).filter((g) => g.items.length);
    }
    return [
      { key: "critical", label: "SEV0 — Critical", color: "#dc2626", items: filtered.filter((row) => row.severity === "SEV0") },
      { key: "high", label: "SEV1 — High", color: "#ea580c", items: filtered.filter((row) => row.severity === "SEV1") },
      { key: "medium", label: "SEV2 — Medium", color: "#ca8a04", items: filtered.filter((row) => row.severity === "SEV2") },
      { key: "low", label: "SEV3 — Low", color: "#0891b2", items: filtered.filter((row) => row.severity === "SEV3") },
    ].filter((g) => g.items.length);
  }, [filtered, groupBy, projects, statuses]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const SEV_COLORS: Record<string, string> = {
    SEV0: "bg-red-500/10 text-red-400 border-red-500/20",
    SEV1: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    SEV2: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    SEV3: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <>
      <Topbar title="Incident Operations" />
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Filter Panel ──────────────────────────────────────────── */}
        <aside
          className={`flex-shrink-0 overflow-y-auto border-r border-border/60 bg-card/50 backdrop-blur-md transition-all duration-300 ease-in-out ${filterPanelOpen ? "w-64" : "w-0 overflow-hidden"}`}
          style={{ minWidth: filterPanelOpen ? "16rem" : "0" }}
        >
          {filterPanelOpen && (
            <div className="p-4 space-y-5 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3 w-3" /> Filters
                </h3>
                <div className="flex items-center gap-1">
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-[10px] text-primary hover:underline">Reset</button>
                  )}
                  <button onClick={() => setFilterPanelOpen(false)} className="text-muted-foreground hover:text-foreground rounded p-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Group By */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Group By</Label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                  <SelectTrigger className="h-8 text-[11px]">
                    <Layers className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {([
                      ["severity", "Severity"],
                      ["project", "Project"],
                      ["reported", "Reported By"],
                      ["status", "Status"],
                      ["priority", "Priority"],
                      ["none", "No Grouping"],
                    ] as [GroupBy, string][]).map(([g, label]) => (
                      <SelectItem key={g} value={g} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Filters */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Filter</Label>
                <div className="space-y-1">
                  {(["all", "open", "breached", "critical"] as Filter[]).map((f) => {
                    const labels: Record<Filter, string> = { all: "All Issues", open: "Open", breached: "SLA Breached", critical: "Critical (SEV0)" };
                    return (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors
                          ${filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
                        {labels[f]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Filter */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Severity</Label>
                <div className="space-y-1.5">
                  {["SEV0", "SEV1", "SEV2", "SEV3"].map((sev) => (
                    <div key={sev} className="flex items-center space-x-2">
                      <Checkbox id={`sev-${sev}`} checked={filterSeverities.includes(sev)}
                        onCheckedChange={(val) => {
                          if (val) setFilterSeverities((prev) => [...prev, sev]);
                          else setFilterSeverities((prev) => prev.filter((x) => x !== sev));
                        }} />
                      <Label htmlFor={`sev-${sev}`} className={`text-[11px] cursor-pointer font-medium px-1.5 py-0.5 rounded border ${SEV_COLORS[sev]}`}>{sev}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
                <div className="space-y-1.5">
                  {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => {
                    const colors: Record<string, string> = { CRITICAL: "text-red-500", HIGH: "text-orange-500", MEDIUM: "text-yellow-500", LOW: "text-blue-400" };
                    return (
                      <div key={p} className="flex items-center space-x-2">
                        <Checkbox id={`iprio-${p}`} checked={filterPriorities.includes(p)}
                          onCheckedChange={(val) => {
                            if (val) setFilterPriorities((prev) => [...prev, p]);
                            else setFilterPriorities((prev) => prev.filter((x) => x !== p));
                          }} />
                        <Label htmlFor={`iprio-${p}`} className={`text-[11px] font-medium cursor-pointer capitalize ${colors[p]}`}>{p.toLowerCase()}</Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</Label>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {projects.map((p) => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox id={`iproj-${p.id}`} checked={filterProjects.includes(p.id)}
                        onCheckedChange={(val) => {
                          if (val) setFilterProjects((prev) => [...prev, p.id]);
                          else setFilterProjects((prev) => prev.filter((x) => x !== p.id));
                        }} />
                      <Label htmlFor={`iproj-${p.id}`} className="text-[11px] cursor-pointer truncate">{p.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* SLA Breached Toggle */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SLA</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sla-breached" checked={filterSlaBreached} onCheckedChange={(val) => setFilterSlaBreached(!!val)} />
                  <Label htmlFor="sla-breached" className="text-[11px] cursor-pointer text-destructive font-medium">SLA Breached only</Label>
                </div>
              </div>

              {/* Due Date Range */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date Range</Label>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="issueDueStart" className="text-[9px] text-muted-foreground mb-1 block">From</Label>
                    <DatePicker value={filterDateStart} onChange={(date) => setFilterDateStart(date || "")} className="h-7 text-[10px]" />
                  </div>
                  <div>
                    <Label htmlFor="issueDueEnd" className="text-[9px] text-muted-foreground mb-1 block">To</Label>
                    <DatePicker value={filterDateEnd} onChange={(date) => setFilterDateEnd(date || "")} className="h-7 text-[10px]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        <main className="flex-1 space-y-4 p-5 overflow-auto relative text-xs">
          {/* Large Background Decorative Route Icon */}
          <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
            <AlertOctagon className="h-[320px] w-[320px] opacity-[0.02] -rotate-12 stroke-[1] animate-pulse" />
          </div>

          {/* Hero header banner */}
          <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent p-5 shadow-md rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ShieldAlert className="h-4 w-4 animate-pulse" />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Incident Operations</h1>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Monitor issues, track SLA compliance, and coordinate incident response.
              </p>
              <div className="flex gap-4 text-[10px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1"><AlertOctagon className="h-3 w-3 text-emerald-500" /> {filtered.length} active incidents</span>
                <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-destructive" /> {rows.filter((r) => r.slaBreached).length} SLA breached</span>
                {activeFilterCount > 0 && (
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Filter className="h-3 w-3" /> {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                  </span>
                )}
              </div>
            </div>
            <Button size="sm" onClick={() => navigate({ to: "/tasks/new" })} className="bg-gradient-primary text-primary-foreground rounded-xl px-4 py-2 hover-lift transition-all">
              <Plus className="mr-1 h-3.5 w-3.5" /> Report Incident
            </Button>
          </div>

          {/* Premium Stat strip */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-6 z-10 relative">
            <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
              <div className="absolute right-2 top-2 text-red-500/10 pointer-events-none">
                <AlertOctagon className="h-10 w-10 animate-pulse" />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV0 Critical</div>
              <div className="text-2xl font-extrabold text-red-500">{sev0Count}</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
              <div className="absolute right-2 top-2 text-orange-500/10 pointer-events-none">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV1 High</div>
              <div className="text-2xl font-extrabold text-orange-500">{sev1Count}</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV2 Medium</div>
              <div className="text-2xl font-extrabold text-yellow-500">{sev2Count}</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV3 Low</div>
              <div className="text-2xl font-extrabold text-blue-500">{sev3Count}</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all col-span-2 sm:col-span-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SLA Breached</div>
              <div className="text-2xl font-extrabold text-red-500">{breachCount}</div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all col-span-2 sm:col-span-1">
              <div className="absolute right-2 top-2 text-primary/10 pointer-events-none">
                <Activity className="h-10 w-10" />
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">MTTR (30d)</div>
              <div className="text-2xl font-extrabold text-primary">2.4h</div>
            </div>
          </section>

          {/* Toolbar */}
          <Card className="glass-card-green sticky top-0 z-20 rounded-2xl relative">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Panel Toggle */}
                <button
                  onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors
                    ${filterPanelOpen || activeFilterCount > 0
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground"}`}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-[8px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </button>

                <span className="h-4 w-px bg-border" />

                <ZChip active={filter === "all"} onClick={() => setFilter("all")}>All</ZChip>
                <ZChip active={filter === "open"} onClick={() => setFilter("open")}>Open</ZChip>
                <ZChip active={filter === "breached"} onClick={() => setFilter("breached")}>SLA Breached</ZChip>
                <ZChip active={filter === "critical"} onClick={() => setFilter("critical")}>Critical</ZChip>

                <span className="h-4 w-px bg-border" />

                <ZToolStrip>
                  <DropdownGroupByMenu value={groupBy} onChange={setGroupBy} />
                  <ZToolBtn icon={ArrowUpDown} label="Sort" />
                </ZToolStrip>
              </div>
              <div className="relative max-w-sm flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search issues..." className="h-9 pl-10 bg-background/50 border-white/10 rounded-lg text-xs" />
              </div>
            </div>
          </Card>

          {/* Issue Groups */}
          <div className="space-y-3">
            {grouped.map((group) => (
              <section key={group.key} className="glass-card-green rounded-2xl transition-all duration-300 relative z-10 overflow-hidden">
                <div 
                  className="flex items-center gap-3 border-b border-white/10 bg-muted/40 px-4 py-2.5"
                  style={{ borderLeft: `4px solid ${group.color}` }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
                  <h3 className="font-semibold text-xs text-foreground">{group.label}</h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">{group.items.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[11px]">
                    <thead className="border-b border-white/10 bg-background/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-8 px-3 py-2"></th>
                        <th className="px-3 py-2">Issue</th>
                        <th className="px-3 py-2">
                          <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            Severity <Filter className="h-2.5 w-2.5" />
                          </button>
                        </th>
                        <th className="px-3 py-2">Module</th>
                        <th className="px-3 py-2">Reported by</th>
                        <th className="px-3 py-2">
                          <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            SLA <Filter className="h-2.5 w-2.5" />
                          </button>
                        </th>
                        <th className="px-3 py-2">Reproducible</th>
                        <th className="px-3 py-2">Affected version</th>
                        <th className="px-3 py-2">Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((row) => {
                        const assignee = users.find((u) => row.assigneeIds[0] === u.id);
                        const status = statuses.find((s) => s.id === row.statusId);
                        const project = projects.find((p) => p.id === row.projectId);
                        return (
                          <tr key={row.issueId} className="border-b border-border/50 hover:bg-muted/40 hover-lift transition-all duration-200">
                            <td className="px-3 py-2.5">
                              <Checkbox checked={selected.has(row.issueId)} onCheckedChange={() => toggleSelect(row.issueId)} />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="space-y-0.5">
                                <Link to="/incidents/$id" params={{ id: row.taskId }} className="font-medium text-foreground hover:text-primary hover:underline">
                                  {row.title}
                                </Link>
                                <div className="text-[9px] text-muted-foreground">
                                  {project?.name ?? "Unknown"} · {row.issueId.toUpperCase()}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEV_COLORS[row.severity] ?? ""}`}>
                                {row.severity}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">{row.module}</td>
                            <td className="px-3 py-2.5">{row.reportedBy}</td>
                            <td className="px-3 py-2.5">
                              <Badge variant={row.slaBreached ? "destructive" : "outline"} className="text-[10px]">
                                {row.slaBreached ? "⚠ Breached" : "✓ OK"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">{row.reproducible ? "Yes" : "No"}</td>
                            <td className="px-3 py-2.5">{row.affectedVersion ?? "—"}</td>
                            <td className="px-3 py-2.5">{assignee?.name ?? "Unassigned"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
            {filtered.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">No issues match the current filters.</Card>
            )}
          </div>
        </main>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[min(95vw,720px)] -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{selected.size} issues selected</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-xs">Assign</Button>
              <Button size="sm" variant="outline" className="text-xs">Flag SLA</Button>
              <Button size="sm" variant="destructive" className="text-xs">Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Severity colors const used in table
const SEV_COLORS: Record<string, string> = {
  SEV0: "bg-red-500/10 text-red-400 border-red-500/20",
  SEV1: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  SEV2: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  SEV3: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function DropdownGroupByMenu({ value, onChange }: { value: GroupBy; onChange: (g: GroupBy) => void }) {
  const options: [GroupBy, string][] = [
    ["severity", "Severity"],
    ["project", "Project"],
    ["reported", "Reported By"],
    ["status", "Status"],
    ["priority", "Priority"],
    ["none", "No Grouping"],
  ];
  const label = options.find(([g]) => g === value)?.[1] ?? value;
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as GroupBy)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground appearance-none pr-5 cursor-pointer"
      >
        {options.map(([g, l]) => <option key={g} value={g}>{l}</option>)}
      </select>
      <Layers className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
    </div>
  );
}
