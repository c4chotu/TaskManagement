import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIssues, useTasks, useProjects, useUsers, useStatuses } from "@/lib/queries";
import { format, isAfter } from "date-fns";
import { Search, Plus, Filter, Layers, ArrowUpDown, AlertOctagon, ShieldAlert, Users, CalendarDays, Flame } from "lucide-react";
import { ZChip } from "@/components/tfp/zoho";
import { ZPageHeader, ZToolStrip, ZToolBtn } from "@/components/zoho/components";

export const Route = createFileRoute("/_app/issues")({
  head: () => ({ meta: [{ title: "Issues — TaskFlow Pro" }] }),
  component: IssuesPage,
});

type GroupBy = "severity" | "project" | "reported" | "none";
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

  // Popover filters state
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterSeverities, setFilterSeverities] = useState<string[]>([]);
  const [filterDateStart, setFilterDateStart] = useState<string>("");
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");

  const rows = useMemo(() => {
    return issues.map((issue) => {
      const task = tasks.find((t) => t.id === issue.taskId);
      const project = projects.find((p) => p.id === task?.projectId);
      const user = users.find((u) => u.id === task?.assigneeIds[0]);
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

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (query && ![row.title, row.issueId, row.projectId, row.reportedBy].some((value) => value?.toLowerCase().includes(query.toLowerCase()))) {
        return false;
      }
      if (filter === "open" && row.statusId === "s-done") return false;
      if (filter === "breached" && !row.slaBreached) return false;
      if (filter === "critical" && row.severity !== "SEV0") return false;

      // Project filter
      if (filterProjects.length > 0 && !filterProjects.includes(row.projectId)) return false;

      // Severity filter
      if (filterSeverities.length > 0 && !filterSeverities.includes(row.severity)) return false;

      // Date range filter
      if (filterDateStart) {
        if (!row.dueDate || new Date(row.dueDate) < new Date(filterDateStart + "T00:00:00")) return false;
      }
      if (filterDateEnd) {
        if (!row.dueDate || new Date(row.dueDate) > new Date(filterDateEnd + "T23:59:59")) return false;
      }

      return true;
    });
  }, [rows, query, filter, filterProjects, filterSeverities, filterDateStart, filterDateEnd]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Issues", color: "#3b82f6", items: filtered }];
    if (groupBy === "project") {
      return projects
        .map((project) => ({
          key: project.id,
          label: project.name,
          color: "var(--color-info)",
          items: filtered.filter((row) => row.projectId === project.id),
        }))
        .filter((group) => group.items.length);
    }
    if (groupBy === "reported") {
      return [
        { key: "reporter", label: "Reported", color: "var(--color-primary)", items: filtered.filter((row) => row.reproducible) },
        { key: "system", label: "System", color: "var(--color-muted)", items: filtered.filter((row) => !row.reproducible) },
      ].filter((group) => group.items.length);
    }
    return [
      { key: "critical", label: "Critical", color: "#dc2626", items: filtered.filter((row) => row.severity === "SEV0") },
      { key: "high", label: "High", color: "#ea580c", items: filtered.filter((row) => row.severity === "SEV1") },
      { key: "medium", label: "Medium", color: "#ca8a04", items: filtered.filter((row) => row.severity === "SEV2") },
      { key: "low", label: "Low", color: "#0891b2", items: filtered.filter((row) => row.severity === "SEV3") },
    ].filter((group) => group.items.length);
  }, [filtered, groupBy, projects]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <>
      <Topbar title="Incident Operations" />
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden text-xs">
        {/* Large Background Decorative Route Icon */}
        <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
          <AlertOctagon className="h-[420px] w-[420px] opacity-[0.02] -rotate-12 stroke-[1] animate-pulse" />
        </div>

        {/* Hero header banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent p-6 shadow-md rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Incident Operations</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor customer reported issues, track service level agreements (SLAs), and assign incident response tasks.
            </p>
            <div className="flex gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1"><AlertOctagon className="h-3.5 w-3.5 text-emerald-500" /> {filtered.length} active incidents</span>
              <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-destructive" /> {rows.filter((row) => row.slaBreached).length} SLA breached</span>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate({ to: "/tasks/new" })} className="bg-gradient-primary text-primary-foreground rounded-xl px-4 py-2 hover-lift transition-all">
            <Plus className="mr-1 h-3.5 w-3.5" /> Report Incident
          </Button>
        </div>

        <Card className="glass-card-green sticky top-24 z-20 rounded-2xl relative">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ZChip active={filter === "all"} onClick={() => setFilter("all")}>All</ZChip>
              <ZChip active={filter === "open"} onClick={() => setFilter("open")}>Open</ZChip>
              <ZChip active={filter === "breached"} onClick={() => setFilter("breached")}>SLA Breached</ZChip>
              <ZChip active={filter === "critical"} onClick={() => setFilter("critical")}>Critical</ZChip>
              <span className="mx-2 h-4 w-px bg-border" />
              <ZToolStrip>
                <ZToolBtn icon={Layers} label="Group" />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-background/50 backdrop-blur-md px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                      <Filter className="h-3 w-3" /> Filter
                      {(filterProjects.length > 0 || filterSeverities.length > 0 || filterDateStart || filterDateEnd) && (
                        <Badge variant="default" className="ml-1 h-4 min-w-4 rounded-full px-1 text-[8px] bg-primary text-primary-foreground">
                          {(filterProjects.length ? 1 : 0) + (filterSeverities.length ? 1 : 0) + (filterDateStart || filterDateEnd ? 1 : 0)}
                        </Badge>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 space-y-4 glass-card border border-white/10 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)] bg-card/75 backdrop-blur-md rounded-2xl" align="start">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Filter Issues</h4>
                      <button
                        onClick={() => {
                          setFilterProjects([]);
                          setFilterSeverities([]);
                          setFilterDateStart("");
                          setFilterDateEnd("");
                        }}
                        className="text-[10px] text-muted-foreground hover:text-primary transition"
                      >
                        Reset All
                      </button>
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
                                id={`issue-proj-${p.id}`}
                                checked={checked}
                                onCheckedChange={(val) => {
                                  if (val) setFilterProjects((prev) => [...prev, p.id]);
                                  else setFilterProjects((prev) => prev.filter((x) => x !== p.id));
                                }}
                              />
                              <Label htmlFor={`issue-proj-${p.id}`} className="text-xs font-normal cursor-pointer truncate max-w-[200px]" title={p.name}>
                                {p.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Severity Filter */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground">Severities</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {["SEV0", "SEV1", "SEV2", "SEV3"].map((sev) => {
                          const checked = filterSeverities.includes(sev);
                          return (
                            <div key={sev} className="flex items-center space-x-2">
                              <Checkbox
                                id={`sev-${sev}`}
                                checked={checked}
                                onCheckedChange={(val) => {
                                  if (val) setFilterSeverities((prev) => [...prev, sev]);
                                  else setFilterSeverities((prev) => prev.filter((x) => x !== sev));
                                }}
                              />
                              <Label htmlFor={`sev-${sev}`} className="text-xs font-normal cursor-pointer">{sev}</Label>
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
                          <Label htmlFor="issueDueStart" className="text-[9px] text-muted-foreground">Start</Label>
                          <Input id="issueDueStart" type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="h-8 text-[10px] px-1.5 bg-background/50 border-white/10 rounded-lg" />
                        </div>
                        <div>
                          <Label htmlFor="issueDueEnd" className="text-[9px] text-muted-foreground">End</Label>
                          <Input id="issueDueEnd" type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="h-8 text-[10px] px-1.5 bg-background/50 border-white/10 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <ZToolBtn icon={ArrowUpDown} label="Sort" />
              </ZToolStrip>
            </div>
            <div className="relative max-w-sm flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search issues..." className="h-10 pl-10 bg-background/50 border-white/10 rounded-lg" />
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {grouped.map((group) => (
            <section key={group.key} className="glass-card-green rounded-2xl transition-all duration-300 relative z-10 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-white/10 bg-muted/50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
                <h3 className="font-semibold text-xs text-foreground">{group.label}</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">{group.items.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="border-b border-white/10 bg-background/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-8 px-3 py-2.5"></th>
                      <th className="px-3 py-2.5">Issue</th>
                      <th className="px-3 py-2.5">Severity</th>
                      <th className="px-3 py-2.5">Module</th>
                      <th className="px-3 py-2.5">Reported by</th>
                      <th className="px-3 py-2.5">SLA</th>
                      <th className="px-3 py-2.5">Reproducible</th>
                      <th className="px-3 py-2.5">Affected version</th>
                      <th className="px-3 py-2.5">Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((row) => {
                      const assignee = users.find((u) => row.assigneeIds[0] === u.id);
                      const status = statuses.find((s) => s.id === row.statusId);
                      const project = projects.find((p) => p.id === row.projectId);
                      return (
                        <tr key={row.issueId} className="border-b border-border/50 hover:bg-muted/40">
                          <td className="px-3 py-3">
                            <Checkbox checked={selected.has(row.issueId)} onCheckedChange={() => toggleSelect(row.issueId)} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <Link to="/incidents/$id" params={{ id: row.taskId }} className="font-medium text-foreground hover:text-primary hover:underline">
                                {row.title}
                              </Link>
                              <div className="text-[10px] text-muted-foreground">
                                {project?.name ?? "Unknown"} · {row.issueId.toUpperCase()}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="secondary" className="text-[10px] uppercase">{row.severity}</Badge>
                          </td>
                          <td className="px-3 py-3">{row.module}</td>
                          <td className="px-3 py-3">{row.reportedBy}</td>
                          <td className="px-3 py-3">
                            <Badge variant={row.slaBreached ? "destructive" : "outline"} className="text-[10px]">
                              {row.slaBreached ? "Breached" : "OK"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">{row.reproducible ? "Yes" : "No"}</td>
                          <td className="px-3 py-3">{row.affectedVersion ?? "—"}</td>
                          <td className="px-3 py-3">{assignee?.name ?? "Unassigned"}</td>
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

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[min(95vw,760px)] -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{selected.size} issues selected</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline">Assign</Button>
              <Button size="sm" variant="outline">Flag SLA</Button>
              <Button size="sm" variant="destructive">Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
