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
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { useProjects, useStatuses, useTasks, useUpdateTaskStatus, useSprints, useUsers, useUpdateTask, useProjectMembers, useTeams, usePhases } from "@/lib/queries";
import { format, isAfter } from "date-fns";
import {
  Search, Plus, Filter, Layers, Settings2, Tag,
  Trash2, UserPlus, MoreHorizontal, Check,
  CheckSquare, X, ChevronDown, ChevronUp, SlidersHorizontal, FolderOpen,
  AlertTriangle, TrendingUp, BarChart3, ChevronLeft, ChevronRight,
} from "lucide-react";
import { ZViewSwitcher, type ZView, ZPriorityPill, ZBulkBar, ZToolStrip, ZToolBtn } from "@/components/zoho/components";
import { GanttChart } from "@/components/tfp/gantt-chart";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — TaskFlow Pro" }] }),
  component: TasksPage,
});

type GroupBy = "status" | "project" | "priority" | "assignee" | "category" | "phase" | "none";
type FilterMode = "all" | "open" | "closed" | "overdue";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

function AssigneeSelectorDropdown({ task, users }: { task: any; users: any[] }) {
  const { data: members = [] } = useProjectMembers(task.projectId);
  const updateTask = useUpdateTask();

  const projectUsers = useMemo(() => {
    return members.map((m: any) => users.find(u => u.id === m.userId)).filter(Boolean);
  }, [members, users]);

  const toggleAssignee = (userId: string) => {
    const isAssigned = task.assigneeIds.includes(userId);
    const newAssigneeIds = isAssigned
      ? task.assigneeIds.filter((id: string) => id !== userId)
      : [...task.assigneeIds, userId];
    updateTask.mutate({ id: task.id, patch: { assigneeIds: newAssigneeIds } });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 focus:outline-none transition-transform active:scale-95 hover:opacity-85">
          {task.assigneeIds.length === 0 ? (
            <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground flex items-center justify-center text-[10px] font-bold text-muted-foreground hover:bg-muted" title="Assign User">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
          ) : (
            <div className="flex -space-x-1.5">
              {task.assigneeIds.slice(0, 3).map((uid: string) => {
                const u = users.find(x => x.id === uid);
                return (
                  <div key={uid} className="h-6 w-6 rounded-full bg-primary/15 border border-border flex items-center justify-center text-[9px] font-bold text-primary" title={u?.name}>
                    {u?.name?.slice(0, 2).toUpperCase() ?? "?"}
                  </div>
                );
              })}
              {task.assigneeIds.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                  +{task.assigneeIds.length - 3}
                </div>
              )}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase">Assign Members</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projectUsers.length === 0 ? (
          <div className="p-2 text-xs text-muted-foreground text-center">No project members found</div>
        ) : (
          projectUsers.map((u: any) => {
            const isAssigned = task.assigneeIds.includes(u.id);
            return (
              <DropdownMenuItem
                key={u.id}
                className="text-xs flex items-center gap-2 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  toggleAssignee(u.id);
                }}
              >
                <Checkbox checked={isAssigned} className="mr-2" />
                <span className="truncate">{u.name}</span>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TasksPage() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isTasksRoot = pathname === "/tasks";
  const updateTask = useUpdateTask();

  const [q, setQ] = useState("");
  const [view, setView] = useState<ZView>("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterPhases, setFilterPhases] = useState<string[]>([]);
  const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
  const [filterDueDateStart, setFilterDueDateStart] = useState<string>("");
  const [filterDueDateEnd, setFilterDueDateEnd] = useState<string>("");

  // Zoho-style Accordion Filter states
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [filterTaskName, setFilterTaskName] = useState("");
  const [filterProjectGroups, setFilterProjectGroups] = useState<string[]>([]);
  const [filterProjectStatuses, setFilterProjectStatuses] = useState<string[]>([]);
  const [filterCompletionPercentage, setFilterCompletionPercentage] = useState<number | null>(null);
  const [filterCompletionOperator, setFilterCompletionOperator] = useState<"eq" | "gt" | "lt">("eq");
  const [filterPriorityOperator, setFilterPriorityOperator] = useState<"is" | "is_not">("is");
  const [filterStartDateOperator, setFilterStartDateOperator] = useState<string>("Custom"); // Today, Yesterday, Tomorrow, Custom, etc.
  const [filterRecurrences, setFilterRecurrences] = useState<string[]>([]);
  const [filterTimeSpanOperator, setFilterTimeSpanOperator] = useState<"eq" | "gt" | "lt">("eq");
  const [filterTimeSpanVal, setFilterTimeSpanVal] = useState<number | null>(null);
  const [filterCreatedTimeOperator, setFilterCreatedTimeOperator] = useState<string>("Custom");
  const [matchMode, setMatchMode] = useState<"any" | "all">("all");
  const [filterTeams, setFilterTeams] = useState<string[]>([]);

  const [filterSections, setFilterSections] = useState<Record<string, boolean>>({
    taskName: false,
    project: false,
    projectGroup: false,
    projectStatus: false,
    status: false,
    completionPercentage: false,
    owner: false,
    associatedTeam: false,
    priority: true, // expanded by default
    startDate: true, // expanded by default
    dueDate: false,
    timeSpan: false,
    recurrence: false,
    createdTime: false,
  });

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("tfp-visible-columns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { }
    }
    return {
      task: true,
      project: true,
      projectGroup: true,
      projectStatus: true,
      priority: true,
      assignees: true,
      associatedTeam: true,
      startDate: true,
      due: true,
      timeSpan: true,
      recurrence: true,
      createdTime: true,
      progress: true,
      completionPercentage: true,
      category: true,
      storyPoints: true,
      taskType: true,
    };
  });

  const gridTemplateColumns = useMemo(() => {
    const cols = ["48px"];
    if (visibleColumns.task) cols.push("280px");
    if (visibleColumns.project) cols.push("160px");
    if (visibleColumns.projectGroup) cols.push("140px");
    if (visibleColumns.projectStatus) cols.push("120px");
    if (visibleColumns.priority) cols.push("110px");
    if (visibleColumns.assignees) cols.push("130px");
    if (visibleColumns.associatedTeam) cols.push("140px");
    if (visibleColumns.startDate) cols.push("110px");
    if (visibleColumns.due) cols.push("130px");
    if (visibleColumns.timeSpan) cols.push("110px");
    if (visibleColumns.recurrence) cols.push("110px");
    if (visibleColumns.createdTime) cols.push("140px");
    if (visibleColumns.progress) cols.push("120px");
    if (visibleColumns.completionPercentage) cols.push("120px");
    if (visibleColumns.category) cols.push("120px");
    if (visibleColumns.storyPoints) cols.push("100px");
    if (visibleColumns.taskType) cols.push("100px");
    cols.push("40px");
    return cols.join(" ");
  }, [visibleColumns]);

  const filterParams = useMemo(() => {
    return {
      projectId: filterProjects.length === 1 ? filterProjects[0] : undefined,
      priority: filterPriorities.length === 1 && filterPriorityOperator === "is" ? filterPriorities[0] : undefined,
      phaseId: filterPhases.length === 1 ? filterPhases[0] : undefined,
      category: filterCategories.length === 1 ? filterCategories[0] : undefined,
      statusId: filterStatuses.length === 1 ? filterStatuses[0] : undefined,
      assigneeId: filterAssignees.length === 1 ? filterAssignees[0] : undefined,
      dueDateFrom: filterDueDateStart || undefined,
      dueDateTo: filterDueDateEnd || undefined,
      taskType: "TASK" as const,
    };
  }, [filterProjects, filterPriorities, filterPriorityOperator, filterPhases, filterCategories, filterStatuses, filterAssignees, filterDueDateStart, filterDueDateEnd]);

  const { data: tasks = [] } = useTasks(filterParams);
  const { data: statuses = [] } = useStatuses();
  const { data: projects = [] } = useProjects();
  const { data: sprints = [] } = useSprints();
  const { data: phasesList = [] } = usePhases();
  const allPhasesAndSprints = useMemo(() => [...sprints, ...phasesList], [sprints, phasesList]);
  const phases = allPhasesAndSprints; // Alias to keep compatibility
  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams();
  const updateStatus = useUpdateTaskStatus();

  const statusGroups = useMemo(() => {
    const todoIds: string[] = [];
    const progressIds: string[] = [];
    const reviewIds: string[] = [];
    const doneIds: string[] = [];

    statuses.forEach(s => {
      const nameLower = s.name.toLowerCase();
      const cat = (s.category || "").toUpperCase();

      if (cat === "COMPLETED" || nameLower.includes("closed") || nameLower === "done") {
        doneIds.push(s.id);
      } else if (nameLower.includes("review") || nameLower.includes("qa") || nameLower.includes("deploy") || cat === "BLOCKED" || nameLower.includes("blocked")) {
        reviewIds.push(s.id);
      } else if (cat === "PLANNING" || nameLower.includes("backlog") || nameLower.includes("to do") || nameLower === "todo" || nameLower === "open" || nameLower === "reopened") {
        todoIds.push(s.id);
      } else {
        progressIds.push(s.id);
      }
    });

    return { todoIds, progressIds, reviewIds, doneIds };
  }, [statuses]);

  const isDoneStatus = (statusId: string) => {
    return statusGroups.doneIds.includes(statusId) || statusId === "s-done";
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (q || filterTaskName) count++;
    if (filterPriorities.length > 0) count++;
    if (filterProjects.length > 0) count++;
    if (filterStatuses.length > 0) count++;
    if (filterCategories.length > 0) count++;
    if (filterPhases.length > 0) count++;
    if (filterAssignees.length > 0) count++;
    if (filterTeams.length > 0) count++;
    if (filterProjectGroups.length > 0) count++;
    if (filterProjectStatuses.length > 0) count++;
    if (filterCompletionPercentage !== null) count++;
    if (filterDueDateStart || filterDueDateEnd) count++;
    if (filterStartDateOperator !== "Custom") count++;
    if (filterTimeSpanVal !== null) count++;
    if (filterRecurrences.length > 0) count++;
    return count;
  }, [q, filterTaskName, filterPriorities, filterProjects, filterStatuses, filterCategories, filterPhases, filterAssignees, filterTeams, filterProjectGroups, filterProjectStatuses, filterCompletionPercentage, filterDueDateStart, filterDueDateEnd, filterStartDateOperator, filterTimeSpanVal, filterRecurrences]);

  const ALL_CATEGORIES = ["FRONTEND", "BACKEND", "INFRA", "DESIGN", "QA", "SECURITY", "DOCS", "RESEARCH", "BUG", "FEATURE"];

  const resetFilters = () => {
    setFilterPriorities([]); setFilterProjects([]); setFilterStatuses([]);
    setFilterCategories([]); setFilterPhases([]); setFilterAssignees([]);
    setFilterDueDateStart(""); setFilterDueDateEnd(""); setFilterTaskName("");
    setFilterProjectGroups([]); setFilterProjectStatuses([]); setFilterCompletionPercentage(null);
    setFilterStartDateOperator("Custom"); setFilterTimeSpanVal(null); setFilterRecurrences([]);
    setFilterTeams([]);
    setPage(1);
  };

  // Apply filters
  const filtered = useMemo(() => {
    const today = new Date();
    return tasks.filter((t) => {
      if (t.taskType !== "TASK") return false;

      // Define check results for each active filter
      const checks: Array<{ active: boolean; matches: boolean }> = [];

      // 1. Text Search Query / Task Name
      const activeSearch = !!(q || filterTaskName);
      if (activeSearch) {
        const queryText = (q || filterTaskName).toLowerCase();
        checks.push({
          active: true,
          matches: t.title.toLowerCase().includes(queryText) || t.id.toLowerCase().includes(queryText)
        });
      }

      // 2. Project
      checks.push({
        active: filterProjects.length > 0,
        matches: filterProjects.includes(t.projectId)
      });

      // 3. Project Group
      checks.push({
        active: filterProjectGroups.length > 0,
        matches: filterProjectGroups.includes(projects.find(p => p.id === t.projectId)?.group || "Engineering")
      });

      // 4. Project Status
      checks.push({
        active: filterProjectStatuses.length > 0,
        matches: filterProjectStatuses.includes("Active") // mock project status match
      });

      // 5. Status
      checks.push({
        active: filterStatuses.length > 0,
        matches: filterStatuses.includes(t.statusId)
      });

      // 6. Completion Percentage
      const localComp = Number(localStorage.getItem(`task-completion-${t.id}`) || 0);
      checks.push({
        active: filterCompletionPercentage !== null,
        matches: filterCompletionOperator === "eq" ? localComp === filterCompletionPercentage :
          filterCompletionOperator === "gt" ? localComp > (filterCompletionPercentage ?? 0) :
            localComp < (filterCompletionPercentage ?? 0)
      });

      // 7. Owner
      checks.push({
        active: filterAssignees.length > 0,
        matches: t.assigneeIds.some((id: string) => filterAssignees.includes(id))
      });

      // 8. Associated Team
      checks.push({
        active: filterTeams.length > 0,
        matches: filterTeams.includes(t.teamId || "")
      });

      // 9. Priority
      checks.push({
        active: filterPriorities.length > 0,
        matches: filterPriorityOperator === "is"
          ? filterPriorities.includes(t.priority ?? "MEDIUM")
          : !filterPriorities.includes(t.priority ?? "MEDIUM")
      });

      // 10. Start Date
      if (filterStartDateOperator && filterStartDateOperator !== "Custom") {
        let matchesDate = false;
        if (t.startDate) {
          const startDateObj = new Date(t.startDate);
          const diffDays = Math.floor((startDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (filterStartDateOperator === "Today") {
            matchesDate = diffDays === 0;
          } else if (filterStartDateOperator === "Yesterday") {
            matchesDate = diffDays === -1;
          } else if (filterStartDateOperator === "Tomorrow") {
            matchesDate = diffDays === 1;
          }
        }
        checks.push({ active: true, matches: matchesDate });
      }

      // 11. Due Date
      const hasDueDateFilter = !!(filterDueDateStart || filterDueDateEnd);
      if (hasDueDateFilter) {
        let matchesDue = true;
        if (filterDueDateStart && (!t.dueDate || new Date(t.dueDate) < new Date(filterDueDateStart + "T00:00:00"))) matchesDue = false;
        if (filterDueDateEnd && (!t.dueDate || new Date(t.dueDate) > new Date(filterDueDateEnd + "T23:59:59"))) matchesDue = false;
        checks.push({ active: true, matches: matchesDue });
      }

      // 12. Time Span
      const localTimeSpan = Number(localStorage.getItem(`task-duration-${t.id}`) || 0);
      checks.push({
        active: filterTimeSpanVal !== null,
        matches: filterTimeSpanOperator === "eq" ? localTimeSpan === filterTimeSpanVal :
          filterTimeSpanOperator === "gt" ? localTimeSpan > (filterTimeSpanVal ?? 0) :
            localTimeSpan < (filterTimeSpanVal ?? 0)
      });

      // 13. Recurrence
      const localRecur = localStorage.getItem(`task-recurrence-${t.id}`) || "None";
      checks.push({
        active: filterRecurrences.length > 0,
        matches: filterRecurrences.includes(localRecur)
      });

      // filter quick filter mode (all, open, closed, overdue)
      if (filter === "open" && isDoneStatus(t.statusId)) return false;
      if (filter === "closed" && !isDoneStatus(t.statusId)) return false;
      if (filter === "overdue" && (!t.dueDate || isAfter(new Date(t.dueDate), today) || isDoneStatus(t.statusId))) return false;

      // evaluate active checks based on matchMode
      const activeChecks = checks.filter(c => c.active);
      if (activeChecks.length === 0) return true;

      if (matchMode === "all") {
        return activeChecks.every(c => c.matches);
      } else {
        return activeChecks.some(c => c.matches);
      }
    });
  }, [tasks, q, filter, filterTaskName, filterProjects, filterProjectGroups, filterProjectStatuses, filterStatuses, filterCompletionPercentage, filterCompletionOperator, filterAssignees, filterTeams, filterPriorities, filterPriorityOperator, filterStartDateOperator, filterDueDateStart, filterDueDateEnd, filterTimeSpanOperator, filterTimeSpanVal, filterRecurrences, matchMode, projects, statusGroups]);

  // Quick stats for hero
  const totalActive = filtered.filter(t => !isDoneStatus(t.statusId)).length;
  const totalCompleted = tasks.filter(t => t.taskType === "TASK" && isDoneStatus(t.statusId)).length;
  const overdueCount = tasks.filter(t => t.taskType === "TASK" && t.dueDate && isAfter(new Date(), new Date(t.dueDate)) && !isDoneStatus(t.statusId)).length;

  // Grouped (for list view)
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Tasks", color: "var(--color-primary)", items: filtered }];
    if (groupBy === "project") {
      return projects
        .map((p) => ({ key: p.id, label: p.name, color: "#6366f1", items: filtered.filter((t) => t.projectId === p.id) }))
        .filter((g) => g.items.length);
    }
    if (groupBy === "priority") {
      const buckets = [
        { key: "CRITICAL", label: "Critical", color: "#dc2626" },
        { key: "HIGH", label: "High", color: "#ea580c" },
        { key: "MEDIUM", label: "Medium", color: "#ca8a04" },
        { key: "LOW", label: "Low", color: "#0891b2" },
      ];
      return buckets.map((b) => ({ ...b, items: filtered.filter((t) => (t.priority ?? "MEDIUM") === b.key) })).filter((g) => g.items.length);
    }
    if (groupBy === "category") {
      const getTaskListGroup = (t: any) => {
        if (t.category && t.category !== "none") return t.category;
        if (t.phaseId && t.phaseId !== "none") {
          const ph = allPhasesAndSprints.find(p => p.id.toLowerCase() === t.phaseId.toLowerCase());
          return ph ? ph.name : t.phaseId;
        }
        if (t.sprintId && t.sprintId !== "none") {
          const sp = allPhasesAndSprints.find(p => p.id.toLowerCase() === t.sprintId.toLowerCase());
          return sp ? sp.name : t.sprintId;
        }
        return "No TaskList";
      };

      const cats = Array.from(new Set(filtered.map(getTaskListGroup)));
      return cats.map((cat) => ({
        key: cat,
        label: cat,
        color: "#8b5cf6",
        items: filtered.filter((t) => getTaskListGroup(t) === cat)
      })).filter((g) => g.items.length);
    }
    if (groupBy === "phase") {
      const getPhaseId = (t: any) => {
        const id = t.phaseId || t.sprintId;
        return (id && id !== "none") ? id.toLowerCase() : "_no_phase";
      };
      const phaseIds = Array.from(new Set(filtered.map(getPhaseId)));
      return phaseIds.map((pid) => {
        const ph = phases.find((p) => p.id.toLowerCase() === pid);
        return { key: pid, label: ph?.name ?? (pid === "_no_phase" ? "No Phase" : pid), color: "#06b6d4", items: filtered.filter((t) => getPhaseId(t) === pid) };
      }).filter((g) => g.items.length);
    }
    if (groupBy === "assignee") {
      const uids = Array.from(new Set(filtered.flatMap((t) => t.assigneeIds.length ? t.assigneeIds : ["_un"])));
      return uids.map((uid) => {
        const u = users.find((x) => x.id === uid);
        return { key: uid, label: uid === "_un" ? "Unassigned" : (u?.name ?? uid), color: "#10b981", items: filtered.filter((t) => uid === "_un" ? t.assigneeIds.length === 0 : t.assigneeIds.includes(uid)) };
      }).filter((g) => g.items.length);
    }
    return statuses.map((s) => ({ key: s.id, label: s.name, color: s.color, items: filtered.filter((t) => t.statusId === s.id) })).filter((g) => g.items.length);
  }, [filtered, groupBy, statuses, projects, phases, users]);

  // Pagination on flat filtered (for "none" grouping or overall count)
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginatedFiltered = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Paginate within each group
  const paginateGroup = (items: typeof filtered) => items.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const bulkSetStatus = async (statusId: string) => {
    for (const id of selected) await updateStatus.mutateAsync({ taskId: id, statusId });
    toast.success(`${selected.size} tasks updated`);
    setSelected(new Set());
  };

  // Task icon color per status category
  const getTaskIcon = (t: typeof filtered[0]) => {
    const s = statuses.find((x) => x.id === t.statusId);
    const isDone = isDoneStatus(t.statusId) || s?.name?.toLowerCase().includes("done");
    return isDone ? (
      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20 shrink-0">
        <Check className="h-4 w-4 text-emerald-500" />
      </div>
    ) : t.taskType === "ISSUE" ? (
      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-orange-500/15 border border-orange-500/20 shrink-0">
        <AlertTriangle className="h-4 w-4 text-orange-400" />
      </div>
    ) : (
      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0">
        <CheckSquare className="h-4 w-4 text-primary" />
      </div>
    );
  };

  const PRIORITY_PILL: Record<string, string> = {
    CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-sm hover:bg-red-500/15",
    HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 shadow-sm hover:bg-orange-500/15",
    MEDIUM: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 shadow-sm hover:bg-yellow-500/15",
    LOW: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-sm hover:bg-blue-500/15",
  };

  return (
    <>
      {isTasksRoot && (
        <>
          <Topbar title="Tasks" />
          <div className="flex flex-1 overflow-hidden">
            {/* ── Main Content ──────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Task Overview Strip */}
              <div className="px-6 pt-5 pb-3 flex-shrink-0">
                <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 dark:from-card dark:via-card dark:to-emerald-950/20 p-5 shadow-sm">
                  {/* Decorative clipboard illustration with interactive + button */}
                  <div className="absolute right-6 top-[7.5rem] -translate-y-1/2 opacity-95 hidden md:block z-10 anim-hover-wrapper">
                    <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Yatra+One&family=Caveat:wght@700&display=swap');
                      .font-namaste { font-family: 'Yatra One', 'Caveat', cursive; }

                      /* ── ruled lines: visible by default, fade out on hover ── */
                      .cb-line {
                        transition: opacity 0.3s ease;
                        opacity: 1;
                      }
                      .anim-hover-wrapper:hover .cb-line { opacity: 0; }

                      /* ── dot pulses ── */
                      @keyframes dotPulse1 { 0%,100%{r:4;opacity:1} 50%{r:6;opacity:.7} }
                      @keyframes dotPulse2 { 0%,100%{r:3;opacity:1} 50%{r:5;opacity:.7} }
                      @keyframes dotPulse3 { 0%,100%{r:5;opacity:.5} 50%{r:7.5;opacity:.3} }
                      .dot-y { animation: dotPulse1 2s ease-in-out infinite; }
                      .dot-g { animation: dotPulse2 2s ease-in-out 0.6s infinite; }
                      .dot-p { animation: dotPulse3 2s ease-in-out 1.2s infinite; }

                      /* ── typewriter widths ── */
                      @keyframes typeLine1 { from{width:0} to{width:52px} }
                      @keyframes typeLine2 { from{width:0} to{width:36px} }

                      /* ── fade out after written ── */
                      @keyframes fadeOut {
                        0%,75%{opacity:1} 100%{opacity:0}
                      }

                      /* ── single pencil journey: line1 → snap down → line2 → fade ──
                         Total duration: 1.6s
                         0%–47%  : slide right on line 1  (0s → 0.75s)
                         47%–53% : jump down to line 2    (invisible snap)
                         53%–87% : slide right on line 2  (0.85s → 1.4s)
                         87%–100%: fade out               (1.4s → 1.6s)
                      */
                      @keyframes pencilJourney {
                        0%   { left: 28px; top: 38px; opacity: 0; }
                        3%   { opacity: 1; }
                        47%  { left: 82px; top: 38px; opacity: 1; }
                        48%  { left: 82px; top: 38px; opacity: 0; }
                        52%  { left: 28px; top: 54px; opacity: 0; }
                        53%  { left: 28px; top: 54px; opacity: 1; }
                        87%  { left: 66px; top: 54px; opacity: 1; }
                        100% { left: 70px; top: 54px; opacity: 0; }
                      }

                      /* ── caret blink ── */
                      @keyframes blinkCaret {
                        from,to{border-color:transparent} 50%{border-color:#10b981}
                      }

                      /* text base */
                      .type-l1, .type-l2 {
                        display: inline-block;
                        overflow: hidden;
                        white-space: nowrap;
                        width: 0;
                        font-size: 11px;
                        line-height: 1.5;
                        border-right: 2px solid transparent;
                      }

                      /* pencil base — single element */
                      .pencil-one {
                        position: absolute;
                        font-size: 13px;
                        opacity: 0;
                        pointer-events: none;
                        filter: drop-shadow(0 1px 2px rgba(0,0,0,.15));
                        transform: rotate(40deg);
                        line-height: 1;
                      }

                      /* ── on hover ── */
                      .anim-hover-wrapper:hover .type-l1 {
                        animation:
                          typeLine1 0.75s steps(6) 0.3s forwards,
                          blinkCaret 0.45s step-end 0.3s 2,
                          fadeOut 3s ease 1.05s forwards;
                      }
                      .anim-hover-wrapper:hover .type-l2 {
                        animation:
                          typeLine2 0.55s steps(4) 1.15s forwards,
                          blinkCaret 0.45s step-end 1.15s 3,
                          fadeOut 3s ease 1.7s forwards;
                      }
                      /* single pencil over full journey */
                      .anim-hover-wrapper:hover .pencil-one {
                        animation: pencilJourney 1.6s linear 0.3s forwards;
                      }
                    `}</style>

                    <div className="relative w-[120px] h-[100px]">
                      {/* SVG clipboard — lines fade on hover */}
                      <svg width="120" height="100" viewBox="0 0 160 130" fill="none" className="pointer-events-none absolute inset-0">
                        <rect x="30" y="20" width="90" height="100" rx="8" fill="white" stroke="#10b981" strokeWidth="2" className="dark:fill-slate-900" />
                        <rect x="55" y="10" width="40" height="18" rx="4" fill="#10b981" />
                        {/* ruled lines — visible initially, hide on hover */}
                        <line className="cb-line" x1="45" y1="52" x2="105" y2="52" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
                        <line className="cb-line" x1="45" y1="67" x2="98"  y2="67" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
                        <line className="cb-line" x1="45" y1="82" x2="102" y2="82" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
                        {/* pulsing dots */}
                        <circle cx="135" cy="35" r="4" fill="#fbbf24" className="dot-y" />
                        <circle cx="145" cy="55" r="3" fill="#34d399" className="dot-g" />
                        <circle cx="20"  cy="100" r="5" fill="#a78bfa" className="dot-p" />
                      </svg>

                      {/* Single pencil — travels across both lines */}
                      <span className="pencil-one">✏️</span>

                      {/* Two-line typewriter text inside clipboard body */}
                      <div className="absolute left-[28px] top-[33px] pointer-events-none flex flex-col gap-[5px]">
                        <span className="type-l1 font-namaste font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
                          Create
                        </span>
                        <span className="type-l2 font-namaste font-bold text-emerald-700 dark:text-emerald-300 tracking-wide">
                          Task
                        </span>
                      </div>

                      {/* + button at the clipboard clip */}
                      <button
                        onClick={() => nav({ to: "/tasks/new" })}
                        className="absolute left-[40px] top-[0px] h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group/btn cursor-pointer"
                        title="New Task"
                      >
                        <Plus className="h-4.5 w-4.5 transition-transform group-hover/btn:rotate-90 duration-300" />
                        <span className="absolute -inset-1 rounded-full border border-primary/50 animate-ping opacity-60 pointer-events-none"></span>
                      </button>
                    </div>
                  </div>

                  <div className="relative flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Task Overview</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Track and manage your tasks efficiently</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <ZViewSwitcher value={view} onChange={setView} />
                        <Button size="sm" onClick={() => nav({ to: "/tasks/new" })} className="h-8 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary hover:to-primary/80 text-primary-foreground font-semibold shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.5)] border-0 text-xs md:hidden">
                          <Plus className="mr-1 h-3.5 w-3.5" /> New Task
                        </Button>
                      </div>
                    </div>

                    {/* 5 colorful stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-3xl">
                      {[
                        { key: "all", label: "All Tasks", value: tasks.filter(t => t.taskType === "TASK").length, color: "emerald", filterFn: () => { setFilter("all"); setFilterStatuses([]); } },
                        { key: "todo", label: "To Do", value: tasks.filter(t => t.taskType === "TASK" && (statusGroups.todoIds.includes(t.statusId) || t.statusId === "s-todo" || t.statusId === "s-open")).length, color: "amber", filterFn: () => { setFilter("open"); setFilterStatuses(statusGroups.todoIds); } },
                        { key: "progress", label: "In Progress", value: tasks.filter(t => t.taskType === "TASK" && (statusGroups.progressIds.includes(t.statusId) || t.statusId === "s-progress" || t.statusId === "s-in-progress")).length, color: "orange", filterFn: () => { setFilter("open"); setFilterStatuses(statusGroups.progressIds); } },
                        { key: "review", label: "In Review", value: tasks.filter(t => t.taskType === "TASK" && (statusGroups.reviewIds.includes(t.statusId) || t.statusId === "s-review")).length, color: "violet", filterFn: () => { setFilter("open"); setFilterStatuses(statusGroups.reviewIds); } },
                        { key: "done", label: "Done", value: tasks.filter(t => t.taskType === "TASK" && isDoneStatus(t.statusId)).length, color: "blue", filterFn: () => { setFilter("closed"); setFilterStatuses(statusGroups.doneIds); } },
                      ].map((s) => {
                        const palettes: Record<string, string> = {
                          emerald: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400",
                          amber: "from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400",
                          orange: "from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20 border-orange-200/60 dark:border-orange-800/40 text-orange-600 dark:text-orange-400",
                          violet: "from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20 border-violet-200/60 dark:border-violet-800/40 text-violet-600 dark:text-violet-400",
                          blue: "from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-400",
                        };
                        return (
                          <button
                            key={s.key}
                            onClick={() => { s.filterFn(); setPage(1); }}
                            className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${palettes[s.color]} px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${s.color}-400`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{s.label}</div>
                            <div className="mt-1.5 text-2xl font-extrabold tracking-tight">{s.value}</div>
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-current opacity-40 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>


              {/* Toolbar */}
              <div className="px-6 py-2 flex-shrink-0">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-md px-4 py-2.5 shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter Panel Toggle */}
                    <button
                      onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all hover-lift
                        ${filterPanelOpen || activeFilterCount > 0
                          ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"}`}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="ml-1 h-4 min-w-4 rounded-full bg-primary text-[9px] text-white font-bold flex items-center justify-center px-1">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    <span className="h-4 w-px bg-border" />

                    {/* Quick filter chips */}
                    {(["all", "open", "overdue", "closed"] as FilterMode[]).map((f) => (
                      <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all border hover-lift
                          ${filter === f
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 bg-background/50"}`}>
                        {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                        {f === "overdue" && overdueCount > 0 && (
                          <span className="ml-1.5 text-[9px] bg-red-500 text-white rounded-full px-1.5 py-0.5">{overdueCount}</span>
                        )}
                      </button>
                    ))}

                    <span className="h-4 w-px bg-border" />

                    {/* Group By dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-background/50 transition-all hover-lift">
                          <Layers className="h-3.5 w-3.5" />
                          Group: <span className="text-foreground font-semibold capitalize">{groupBy === "none" ? "None" : groupBy === "category" ? "TaskList" : groupBy}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel className="text-[10px] uppercase">Group By</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(["status", "project", "priority", "assignee", "category", "phase", "none"] as GroupBy[]).map(g => (
                          <DropdownMenuItem key={g} onClick={() => setGroupBy(g)} className="text-xs capitalize cursor-pointer">
                            {groupBy === g && <Check className="h-3 w-3 mr-2" />}
                            {g === "none" ? "No Grouping" : g === "category" ? "TaskList" : g}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-background/50 transition-all hover-lift">
                          <Settings2 className="h-3.5 w-3.5" /> Layout
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-[10px] uppercase">Toggle Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.keys(visibleColumns).map((col) => (
                          <DropdownMenuItem
                            key={col}
                            className="text-xs flex items-center justify-between cursor-pointer"
                            onSelect={(e) => {
                              e.preventDefault();
                              setVisibleColumns((prev) => {
                                const next = { ...prev, [col]: !prev[col] };
                                localStorage.setItem("tfp-visible-columns", JSON.stringify(next));
                                return next;
                              });
                            }}
                          >
                            <span className="capitalize">{col === "category" ? "TaskList" : col.replace(/([A-Z])/g, " $1")}</span>
                            {visibleColumns[col] && <Check className="h-3.5 w-3.5 text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks…  ⌘K" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                      className="h-8 w-52 pl-9 text-[12px] rounded-lg bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-emerald-500 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-auto px-6 pb-6 space-y-2">
                {view === "list" && (
                  <>
                    {groups.length === 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
                        <CheckSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                        No tasks match the current filters.
                      </div>
                    ) : (
                      groups.map((g) => {
                        const isCollapsed = collapsed[g.key];
                        const groupItems = paginateGroup(g.items);
                        return (
                          <div key={g.key} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
                            {/* Group Header */}
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b border-border/40"
                              onClick={() => setCollapsed(c => ({ ...c, [g.key]: !c[g.key] }))}
                            >
                              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                              <span className="font-semibold text-sm text-foreground">{g.label}</span>
                              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">({g.items.length})</span>
                              <span className="ml-auto text-muted-foreground">
                                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                              </span>
                            </button>

                            {!isCollapsed && (
                              <div className="overflow-x-auto scrollbar-thin w-full">
                                <div className="min-w-max">
                                  {/* Column Headers */}
                                  <div
                                    className="grid gap-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/40 py-2"
                                    style={{ gridTemplateColumns }}
                                  >
                                    <div className="sticky left-0 bg-muted z-20 pl-4 w-12 flex items-center" />
                                    {visibleColumns.task && (
                                      <div className="sticky left-[48px] bg-muted z-20 border-r border-border/40 pr-3 flex items-center">
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Task Name <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.project && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Project <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.projectGroup && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Project Group <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.projectStatus && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Project Status <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.priority && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Priority <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.assignees && <div>Owner</div>}
                                    {visibleColumns.associatedTeam && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Associated Team <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.startDate && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Start Date <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.due && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Due Date <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.timeSpan && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Time Span <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.recurrence && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Recurrence <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.createdTime && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Created Time <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.progress && <div>Progress</div>}
                                    {visibleColumns.completionPercentage && (
                                      <div>
                                        <button onClick={() => setFilterPanelOpen(true)} className="flex items-center gap-1 hover:text-foreground">
                                          Completion % <Filter className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {visibleColumns.category && <div>TaskList</div>}
                                    {visibleColumns.storyPoints && <div>Story Points</div>}
                                    {visibleColumns.taskType && <div>Task Type</div>}
                                    <div className="pr-4" />
                                  </div>

                                  {/* Task Rows */}
                                  {groupItems.map((t) => {
                                    const p = projects.find((x) => x.id === t.projectId);
                                    const s = statuses.find((x) => x.id === t.statusId);
                                    const pct = t.estimatedHours && t.estimatedHours > 0
                                      ? Math.min(100, Math.round(((t.loggedHours ?? 0) / t.estimatedHours) * 100)) : 0;
                                    const isDone = isDoneStatus(t.statusId) || s?.name?.toLowerCase().includes("done");

                                    return (
                                      <div key={t.id}
                                        className={`grid gap-0 items-center py-2.5 border-b border-border/20 hover:bg-muted/30 cursor-pointer transition-all duration-200 group hover-lift ${selected.has(t.id) ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary" : ""}`}
                                        style={{ gridTemplateColumns }}
                                        onClick={() => nav({ to: "/tasks/$id", params: { id: t.id } })}
                                      >
                                        <div className="sticky left-0 bg-card/60 group-hover:bg-muted/30 backdrop-blur z-20 pl-4 w-12 flex items-center transition-colors shrink-0 animate-in fade-in" onClick={e => e.stopPropagation()}>
                                          <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                                        </div>

                                        {/* Task name + ID */}
                                        {visibleColumns.task && (
                                          <div className="sticky left-[48px] bg-card/60 group-hover:bg-muted/30 backdrop-blur z-20 border-r border-border/40 pr-3 flex items-center gap-2.5 min-w-0 transition-colors">
                                            {/* Status-colored icon */}
                                            <div onClick={e => e.stopPropagation()}>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <button
                                                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all hover:bg-muted/80 active:scale-95 ${isDone ? "bg-emerald-500/10 border-emerald-500/20" : "bg-primary/8 border-primary/15"}`}
                                                    title={`Change status (current: ${s?.name ?? "Unknown"})`}
                                                  >
                                                    {isDone
                                                      ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                      : <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                                    }
                                                  </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-48">
                                                  <DropdownMenuLabel className="text-[10px] uppercase">Set Status</DropdownMenuLabel>
                                                  <DropdownMenuSeparator />
                                                  {statuses.map(st => (
                                                    <DropdownMenuItem
                                                      key={st.id}
                                                      className="text-xs flex items-center gap-2 cursor-pointer"
                                                      onClick={() => updateStatus.mutate({ taskId: t.id, statusId: st.id })}
                                                    >
                                                      <span className="h-2 w-2 rounded-full" style={{ background: st.color }} />
                                                      <span>{st.name}</span>
                                                      {t.statusId === st.id && <Check className="h-3 w-3 ml-auto text-primary" />}
                                                    </DropdownMenuItem>
                                                  ))}
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                                {t.title}
                                              </div>
                                              <div className="font-mono text-[9px] text-muted-foreground truncate">{t.id?.toUpperCase()}</div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Project */}
                                        {visibleColumns.project && (
                                          <div className="flex items-center gap-1.5 min-w-0 pr-2" onClick={e => e.stopPropagation()}>
                                            <FolderOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                            <button
                                              onClick={() => nav({ to: "/projects/$id", params: { id: t.projectId } })}
                                              className="text-[11px] text-muted-foreground truncate hover:text-primary hover:underline font-semibold"
                                            >
                                              {p?.name ?? "—"}
                                            </button>
                                          </div>
                                        )}

                                        {/* Project Group */}
                                        {visibleColumns.projectGroup && (
                                          <div className="text-[11px] text-muted-foreground truncate pr-2">
                                            {p?.group || "Engineering"}
                                          </div>
                                        )}

                                        {/* Project Status */}
                                        {visibleColumns.projectStatus && (
                                          <div className="text-[11px] text-muted-foreground truncate pr-2">
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 rounded bg-muted/30">Active</Badge>
                                          </div>
                                        )}

                                        {/* Priority */}
                                        {visibleColumns.priority && (
                                          <div onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button className="focus:outline-none transition-transform active:scale-95">
                                                  {t.priority ? (
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${PRIORITY_PILL[t.priority] ?? ""}`}>
                                                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                      {t.priority.charAt(0) + t.priority.slice(1).toLowerCase()}
                                                    </span>
                                                  ) : <span className="text-muted-foreground text-[11px]">—</span>}
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start">
                                                <DropdownMenuLabel className="text-[10px] uppercase">Set Priority</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(prio => (
                                                  <DropdownMenuItem
                                                    key={prio}
                                                    className="text-xs capitalize cursor-pointer"
                                                    onClick={() => updateTask.mutate({ id: t.id, patch: { priority: prio as any } })}
                                                  >
                                                    {prio.toLowerCase()}
                                                    {t.priority === prio && <Check className="h-3 w-3 ml-auto text-primary" />}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}

                                        {/* Assignees */}
                                        {visibleColumns.assignees && (
                                          <div onClick={e => e.stopPropagation()}>
                                            <AssigneeSelectorDropdown task={t} users={users} />
                                          </div>
                                        )}

                                        {/* Associated Team */}
                                        {visibleColumns.associatedTeam && (
                                          <div className="text-[11px] text-muted-foreground truncate font-medium pr-2">
                                            {teams.find(tm => tm.id === t.teamId)?.name || "—"}
                                          </div>
                                        )}

                                        {/* Start Date */}
                                        {visibleColumns.startDate && (
                                          <div className="text-[11px] text-muted-foreground font-mono pr-2">
                                            {t.startDate ? format(new Date(t.startDate), "yyyy-MM-dd") : "—"}
                                          </div>
                                        )}

                                        {/* Due */}
                                        {visibleColumns.due && (
                                          <div className="flex items-center min-w-0" onClick={e => e.stopPropagation()}>
                                            <Input
                                              type="date"
                                              value={t.dueDate ? t.dueDate.split("T")[0] : ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const formattedDate = val ? new Date(val).toISOString() : undefined;
                                                updateTask.mutate({ id: t.id, patch: { dueDate: formattedDate } });
                                              }}
                                              className="h-7 border-0 bg-transparent hover:bg-muted/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring text-[11px] font-mono p-1 rounded min-w-[110px]"
                                            />
                                          </div>
                                        )}

                                        {/* Time Span */}
                                        {visibleColumns.timeSpan && (
                                          <div className="text-[11px] text-muted-foreground font-mono pr-2">
                                            {localStorage.getItem(`task-duration-${t.id}`) ? `${localStorage.getItem(`task-duration-${t.id}`)} days` : "—"}
                                          </div>
                                        )}

                                        {/* Recurrence */}
                                        {visibleColumns.recurrence && (
                                          <div className="text-[11px] text-muted-foreground pr-2">
                                            {localStorage.getItem(`task-recurrence-${t.id}`) || "None"}
                                          </div>
                                        )}

                                        {/* Created Time */}
                                        {visibleColumns.createdTime && (
                                          <div className="text-[11px] text-muted-foreground font-mono pr-2">
                                            {t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd HH:mm") : "—"}
                                          </div>
                                        )}

                                        {/* Progress */}
                                        {visibleColumns.progress && (
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[9px] font-mono text-muted-foreground w-7 text-right">{pct}%</span>
                                          </div>
                                        )}

                                        {/* Completion Percentage */}
                                        {visibleColumns.completionPercentage && (
                                          <div className="text-[11px] font-mono text-muted-foreground pr-2 text-center w-full">
                                            {localStorage.getItem(`task-completion-${t.id}`) || "0"}%
                                          </div>
                                        )}

                                        {/* Category */}
                                        {visibleColumns.category && (
                                          <div onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button className="focus:outline-none transition-transform active:scale-95 text-[11px] hover:bg-muted/40 px-2 py-0.5 rounded border border-transparent hover:border-border/40">
                                                  {(() => {
                                                    if (t.category) {
                                                      return (
                                                        <span className="font-semibold text-primary truncate max-w-[80px] block">
                                                          {t.category}
                                                        </span>
                                                      );
                                                    }
                                                    if (t.phaseId && t.phaseId !== "none") {
                                                      const ph = allPhasesAndSprints.find(p => p.id.toLowerCase() === t.phaseId?.toLowerCase());
                                                      return (
                                                        <span className="font-semibold text-cyan-600 truncate max-w-[80px] block">
                                                          {ph ? ph.name : t.phaseId}
                                                        </span>
                                                      );
                                                    }
                                                    if (t.sprintId && t.sprintId !== "none") {
                                                      const sp = allPhasesAndSprints.find(p => p.id.toLowerCase() === t.sprintId?.toLowerCase());
                                                      return (
                                                        <span className="font-semibold text-indigo-600 truncate max-w-[80px] block">
                                                          {sp ? sp.name : t.sprintId}
                                                        </span>
                                                      );
                                                    }
                                                    return <span className="text-muted-foreground">—</span>;
                                                  })()}
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start">
                                                <DropdownMenuLabel className="text-[10px] uppercase">Set TaskList</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {ALL_CATEGORIES.map(cat => (
                                                  <DropdownMenuItem
                                                    key={cat}
                                                    className="text-xs cursor-pointer"
                                                    onClick={() => updateTask.mutate({ id: t.id, patch: { category: cat as any } })}
                                                  >
                                                    {cat}
                                                    {t.category === cat && <Check className="h-3 w-3 ml-auto text-primary" />}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}

                                        {/* Story Points */}
                                        {visibleColumns.storyPoints && (
                                          <div className="flex items-center min-w-0" onClick={e => e.stopPropagation()}>
                                            <Input
                                              type="number"
                                              value={t.storyPoints ?? ""}
                                              onChange={(e) => {
                                                const val = e.target.value === "" ? undefined : Number(e.target.value);
                                                updateTask.mutate({ id: t.id, patch: { storyPoints: val } });
                                              }}
                                              placeholder="—"
                                              className="h-7 border-0 bg-transparent hover:bg-muted/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring text-[11px] font-mono p-1 rounded w-16 text-center"
                                            />
                                          </div>
                                        )}

                                        {/* Task Type */}
                                        {visibleColumns.taskType && (
                                          <div onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button className="focus:outline-none transition-transform active:scale-95 text-[11px] hover:bg-muted/40 px-2 py-0.5 rounded border border-transparent hover:border-border/40">
                                                  <span className="font-semibold truncate max-w-[80px] block">
                                                    {t.taskType ?? "—"}
                                                  </span>
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="start">
                                                <DropdownMenuLabel className="text-[10px] uppercase">Set Type</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {["TASK", "ISSUE"].map(type => (
                                                  <DropdownMenuItem
                                                    key={type}
                                                    className="text-xs cursor-pointer"
                                                    onClick={() => updateTask.mutate({ id: t.id, patch: { taskType: type as any } })}
                                                  >
                                                    {type}
                                                    {t.taskType === type && <Check className="h-3 w-3 ml-auto text-primary" />}
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}

                                        {/* Actions */}
                                        <div className="pr-4 flex justify-end" onClick={e => e.stopPropagation()}>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => nav({ to: "/tasks/$id", params: { id: t.id } })}>
                                                Open Details
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              {statuses.map(s => (
                                                <DropdownMenuItem key={s.id} className="text-xs" onClick={() => updateStatus.mutateAsync({ taskId: t.id, statusId: s.id })}>
                                                  <span className="h-2 w-2 rounded-full mr-2" style={{ background: s.color }} />
                                                  Set as {s.name}
                                                </DropdownMenuItem>
                                              ))}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Pagination Footer */}
                    {filtered.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-3 text-xs text-muted-foreground">
                        <span>Showing {Math.min((page - 1) * rowsPerPage + 1, filtered.length)}–{Math.min(page * rowsPerPage, filtered.length)} of {filtered.length} tasks</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                              className="h-7 w-7 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted/60 transition-colors">
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                              const pg = totalPages <= 5 ? i + 1 : i + Math.max(1, page - 2);
                              return (
                                <button key={pg} onClick={() => setPage(pg)}
                                  className={`h-7 w-7 rounded-full text-xs font-medium transition-colors ${page === pg ? "bg-primary text-white" : "border border-border hover:bg-muted/60"}`}>
                                  {pg}
                                </button>
                              );
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                              className="h-7 w-7 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted/60 transition-colors">
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>Rows per page:</span>
                            <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setPage(1); }}>
                              <SelectTrigger className="h-7 w-16 text-xs border-border/60">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROWS_PER_PAGE_OPTIONS.map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {view === "kanban" && (
                  <div className="flex gap-3 overflow-x-auto pb-4">
                    {statuses.map((col) => (
                      <div key={col.id} className="flex w-64 shrink-0 flex-col rounded-2xl border border-border/60 bg-card p-3">
                        <div className="flex items-center gap-2 border-b border-border px-1 pb-2 mb-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                          <span className="text-xs font-semibold">{col.name}</span>
                          <span className="ml-auto text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {filtered.filter((t) => t.statusId === col.id).length}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {filtered.filter((t) => t.statusId === col.id).map((t) => (
                            <div key={t.id} onClick={() => nav({ to: "/tasks/$id", params: { id: t.id } })}
                              className="rounded-xl border border-border bg-background p-2.5 text-xs shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                              {(() => {
                                const taskListName = t.category
                                  ? t.category
                                  : (t.phaseId && t.phaseId !== "none"
                                    ? (allPhasesAndSprints.find(p => p.id.toLowerCase() === t.phaseId?.toLowerCase())?.name || t.phaseId)
                                    : (t.sprintId && t.sprintId !== "none"
                                      ? (allPhasesAndSprints.find(p => p.id.toLowerCase() === t.sprintId?.toLowerCase())?.name || t.sprintId)
                                      : null
                                    )
                                  );
                                if (!taskListName) return null;
                                return (
                                  <span className="inline-block mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                    {taskListName}
                                  </span>
                                );
                              })()}
                              <p className="font-medium leading-snug">{t.title}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <ZPriorityPill p={t.priority} />
                                {t.assigneeIds[0] && (
                                  <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[8px] font-bold text-primary">
                                    {users.find(u => u.id === t.assigneeIds[0])?.name?.slice(0, 2).toUpperCase() ?? "?"}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {view === "gantt" && <GanttChart tasks={filtered} statuses={statuses} projects={projects} />}
              </div>
            </main>

            {/* ── Right Filter Panel ─────────────────────────────────────── */}
            <aside
              className={`flex-shrink-0 overflow-y-auto border-l border-border/60 bg-card/50 backdrop-blur-md transition-all duration-300 ease-in-out ${filterPanelOpen ? "w-64" : "w-0 overflow-hidden"}`}
              style={{ minWidth: filterPanelOpen ? "16rem" : "0" }}
            >
              {filterPanelOpen && (
                <div className="p-4 space-y-4 text-xs flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-[14px] font-bold text-foreground">Filter</span>
                    <div className="flex items-center gap-2">
                      <button onClick={resetFilters} className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-600 transition-colors">Reset</button>
                      <button onClick={() => setFilterPanelOpen(false)} className="text-muted-foreground hover:text-foreground rounded p-0.5">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Search Input */}
                  <div className="relative shrink-0">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter Search"
                      value={filterSearchQuery}
                      onChange={e => setFilterSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-[11px] bg-muted/20 border-border/50 rounded-md focus-visible:ring-1 focus-visible:ring-emerald-500"
                    />
                  </div>

                  {/* Accordion Sections */}
                  <div className="space-y-1 overflow-y-auto flex-1 pr-1">
                    {[
                      { key: "taskName", label: "Task Name" },
                      { key: "project", label: "Project" },
                      { key: "projectGroup", label: "Project Group" },
                      { key: "projectStatus", label: "Project Status" },
                      { key: "status", label: "Status" },
                      { key: "completionPercentage", label: "Completion Percentage" },
                      { key: "owner", label: "Owner" },
                      { key: "associatedTeam", label: "Associated Team" },
                      { key: "priority", label: "Priority" },
                      { key: "startDate", label: "Start date" },
                      { key: "dueDate", label: "Due Date" },
                      { key: "timeSpan", label: "Time Span" },
                      { key: "recurrence", label: "Recurrence" },
                      { key: "createdTime", label: "Created Time" },
                    ]
                      .filter(sec => sec.label.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                      .map(sec => {
                        const isOpen = filterSections[sec.key];
                        return (
                          <div key={sec.key} className="border-b border-border/20 last:border-0 py-0.5">
                            <button
                              onClick={() => setFilterSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                              className={`w-full flex items-center justify-between py-1.5 px-2 text-[11px] font-semibold hover:bg-muted/40 transition-all rounded ${isOpen ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" : "text-foreground"
                                }`}
                            >
                              <span>{sec.label}</span>
                              {isOpen ? <ChevronUp className="h-3 w-3 text-current" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            </button>

                            {isOpen && (
                              <div className="p-2.5 bg-muted/10 rounded-md mt-1 mb-2 space-y-2 border border-border/30">
                                {sec.key === "taskName" && (
                                  <Input
                                    placeholder="Filter Search"
                                    value={filterTaskName}
                                    onChange={e => { setFilterTaskName(e.target.value); setPage(1); }}
                                    className="h-8 text-xs bg-background"
                                  />
                                )}

                                {sec.key === "project" && (
                                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {projects.map(p => (
                                      <div key={p.id} className="flex items-center space-x-2 py-0.5">
                                        <Checkbox
                                          id={`f-proj-${p.id}`}
                                          checked={filterProjects.includes(p.id)}
                                          onCheckedChange={val => {
                                            if (val) setFilterProjects(prev => [...prev, p.id]);
                                            else setFilterProjects(prev => prev.filter(x => x !== p.id));
                                            setPage(1);
                                          }}
                                        />
                                        <Label htmlFor={`f-proj-${p.id}`} className="text-[11px] cursor-pointer truncate font-medium">{p.name}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {sec.key === "projectGroup" && (
                                  <div className="space-y-1">
                                    {["Engineering", "Design", "Marketing", "Core"].map(g => (
                                      <div key={g} className="flex items-center space-x-2 py-0.5">
                                        <Checkbox
                                          id={`f-pg-${g}`}
                                          checked={filterProjectGroups.includes(g)}
                                          onCheckedChange={val => {
                                            if (val) setFilterProjectGroups(prev => [...prev, g]);
                                            else setFilterProjectGroups(prev => prev.filter(x => x !== g));
                                            setPage(1);
                                          }}
                                        />
                                        <Label htmlFor={`f-pg-${g}`} className="text-[11px] cursor-pointer font-medium">{g}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {sec.key === "projectStatus" && (
                                  <div className="space-y-1">
                                    {["Active", "Planning", "Completed", "On Hold"].map(st => (
                                      <div key={st} className="flex items-center space-x-2 py-0.5">
                                        <Checkbox
                                          id={`f-pstat-${st}`}
                                          checked={filterProjectStatuses.includes(st)}
                                          onCheckedChange={val => {
                                            if (val) setFilterProjectStatuses(prev => [...prev, st]);
                                            else setFilterProjectStatuses(prev => prev.filter(x => x !== st));
                                            setPage(1);
                                          }}
                                        />
                                        <Label htmlFor={`f-pstat-${st}`} className="text-[11px] cursor-pointer font-medium">{st}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {sec.key === "status" && (
                                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {statuses.map(s => (
                                      <div key={s.id} className="flex items-center space-x-2 py-0.5">
                                        <Checkbox
                                          id={`f-stat-${s.id}`}
                                          checked={filterStatuses.includes(s.id)}
                                          onCheckedChange={val => {
                                            if (val) setFilterStatuses(prev => [...prev, s.id]);
                                            else setFilterStatuses(prev => prev.filter(x => x !== s.id));
                                            setPage(1);
                                          }}
                                        />
                                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                                        <Label htmlFor={`f-stat-${s.id}`} className="text-[11px] cursor-pointer truncate font-medium">{s.name}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {sec.key === "completionPercentage" && (
                                  <div className="space-y-2">
                                    <Select value={filterCompletionOperator} onValueChange={(val: any) => setFilterCompletionOperator(val)}>
                                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="eq" className="text-xs">Is Equal To</SelectItem>
                                        <SelectItem value="gt" className="text-xs">Is Greater Than</SelectItem>
                                        <SelectItem value="lt" className="text-xs">Is Less Than</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="Percentage (0-100)"
                                      value={filterCompletionPercentage ?? ""}
                                      onChange={e => {
                                        const val = e.target.value === "" ? null : Number(e.target.value);
                                        setFilterCompletionPercentage(val);
                                        setPage(1);
                                      }}
                                      className="h-8 text-xs bg-background"
                                    />
                                  </div>
                                )}

                                {sec.key === "owner" && (
                                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {users.map(u => (
                                      <div key={u.id} className="flex items-center space-x-2 py-0.5">
                                        <Checkbox
                                          id={`f-owner-${u.id}`}
                                          checked={filterAssignees.includes(u.id)}
                                          onCheckedChange={val => {
                                            if (val) setFilterAssignees(prev => [...prev, u.id]);
                                            else setFilterAssignees(prev => prev.filter(x => x !== u.id));
                                            setPage(1);
                                          }}
                                        />
                                        <Label htmlFor={`f-owner-${u.id}`} className="text-[11px] cursor-pointer truncate font-medium">{u.name}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {sec.key === "associatedTeam" && (
                                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {teams.map(t => (
                                      <div key={t.id} className="flex items-center space-x-2 py-0.5">
                                        <Checkbox
                                          id={`f-team-${t.id}`}
                                          checked={filterTeams.includes(t.id)}
                                          onCheckedChange={val => {
                                            if (val) setFilterTeams(prev => [...prev, t.id]);
                                            else setFilterTeams(prev => prev.filter(x => x !== t.id));
                                            setPage(1);
                                          }}
                                        />
                                        <Label htmlFor={`f-team-${t.id}`} className="text-[11px] cursor-pointer truncate font-medium">{t.name}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {sec.key === "priority" && (
                                  <div className="space-y-2">
                                    <Select value={filterPriorityOperator} onValueChange={(val: any) => setFilterPriorityOperator(val)}>
                                      <SelectTrigger className="h-8 text-[11px] bg-background"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="is" className="text-xs">Is</SelectItem>
                                        <SelectItem value="is_not" className="text-xs">Is Not</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <div className="space-y-1 pt-1">
                                      {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => {
                                        const colors: Record<string, string> = { CRITICAL: "text-red-500", HIGH: "text-orange-500", MEDIUM: "text-yellow-500", LOW: "text-blue-400" };
                                        return (
                                          <div key={p} className="flex items-center space-x-2">
                                            <Checkbox id={`f-prio-${p}`} checked={filterPriorities.includes(p)} onCheckedChange={(val) => {
                                              if (val) setFilterPriorities(prev => [...prev, p]);
                                              else setFilterPriorities(prev => prev.filter(x => x !== p));
                                              setPage(1);
                                            }} />
                                            <Label htmlFor={`f-prio-${p}`} className={`text-[11px] font-medium cursor-pointer capitalize ${colors[p]}`}>{p.toLowerCase()}</Label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {sec.key === "startDate" && (
                                  <div className="space-y-2">
                                    <Select value={filterStartDateOperator} onValueChange={(val) => { setFilterStartDateOperator(val); setPage(1); }}>
                                      <SelectTrigger className="h-8 text-[11px] bg-background"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Today" className="text-xs">Today</SelectItem>
                                        <SelectItem value="Yesterday" className="text-xs">Yesterday</SelectItem>
                                        <SelectItem value="Tomorrow" className="text-xs">Tomorrow</SelectItem>
                                        <SelectItem value="Custom" className="text-xs">Custom</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {filterStartDateOperator !== "Custom" ? (
                                      <Input
                                        readOnly
                                        value={`\${${filterStartDateOperator.toUpperCase()}}`}
                                        className="h-8 text-xs bg-muted/40 font-mono text-muted-foreground"
                                      />
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground italic">No custom start date set</span>
                                    )}
                                  </div>
                                )}

                                {sec.key === "dueDate" && (
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-[9px] text-muted-foreground">From</Label>
                                      <Input type="date" value={filterDueDateStart} onChange={(e) => { setFilterDueDateStart(e.target.value); setPage(1); }} className="h-7 text-[10px] bg-background" />
                                    </div>
                                    <div>
                                      <Label className="text-[9px] text-muted-foreground">To</Label>
                                      <Input type="date" value={filterDueDateEnd} onChange={(e) => { setFilterDueDateEnd(e.target.value); setPage(1); }} className="h-7 text-[10px] bg-background" />
                                    </div>
                                  </div>
                                )}

                                {sec.key === "timeSpan" && (
                                  <div className="space-y-2">
                                    <Select value={filterTimeSpanOperator} onValueChange={(val: any) => setFilterTimeSpanOperator(val)}>
                                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="eq" className="text-xs">Is Equal To</SelectItem>
                                        <SelectItem value="gt" className="text-xs">Is Greater Than</SelectItem>
                                        <SelectItem value="lt" className="text-xs">Is Less Than</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      placeholder="Duration in days"
                                      value={filterTimeSpanVal ?? ""}
                                      onChange={e => {
                                        const val = e.target.value === "" ? null : Number(e.target.value);
                                        setFilterTimeSpanVal(val);
                                        setPage(1);
                                      }}
                                      className="h-8 text-xs bg-background"
                                    />
                                  </div>
                                )}

                                {sec.key === "recurrence" && (
                                  <div className="space-y-1">
                                    {["None", "Daily", "Weekly", "Monthly"].map(r => (
                                      <div key={r} className="flex items-center space-x-2 py-0.5">
                                        <Checkbox
                                          id={`f-rec-${r}`}
                                          checked={filterRecurrences.includes(r)}
                                          onCheckedChange={val => {
                                            if (val) setFilterRecurrences(prev => [...prev, r]);
                                            else setFilterRecurrences(prev => prev.filter(x => x !== r));
                                            setPage(1);
                                          }}
                                        />
                                        <Label htmlFor={`f-rec-${r}`} className="text-[11px] cursor-pointer font-medium">{r}</Label>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {sec.key === "createdTime" && (
                                  <div className="space-y-2">
                                    <Select value={filterCreatedTimeOperator} onValueChange={(val) => { setFilterCreatedTimeOperator(val); setPage(1); }}>
                                      <SelectTrigger className="h-8 text-[11px] bg-background"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Today" className="text-xs">Today</SelectItem>
                                        <SelectItem value="Yesterday" className="text-xs">Yesterday</SelectItem>
                                        <SelectItem value="ThisWeek" className="text-xs">This Week</SelectItem>
                                        <SelectItem value="Custom" className="text-xs">Custom</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Match logic toggles */}
                  <div className="pt-3 border-t border-border/40 space-y-2 shrink-0">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Match Condition</Label>
                    <div className="flex flex-col gap-2 bg-muted/10 p-2 rounded border border-border/30">
                      <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setMatchMode("any")}>
                        <input type="radio" checked={matchMode === "any"} readOnly className="text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium text-foreground">Any of these</span>
                      </div>
                      <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setMatchMode("all")}>
                        <input type="radio" checked={matchMode === "all"} readOnly className="text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium text-foreground">All of these</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}

      <Outlet {...({ context: { filteredTasks: filtered, statuses, projects, users, teams } } as any)} />

      {/* Bulk Action Bar */}
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
    </>
  );
}
