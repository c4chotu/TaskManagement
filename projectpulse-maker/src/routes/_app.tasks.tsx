import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useProjects, useStatuses, useTasks } from "@/lib/queries";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskCreateDialog } from "@/components/tfp/task-create-dialog";
import {
  AssigneeStack,
  TaskStatusSelect,
  TaskAssignPopover,
} from "@/components/tfp/task-quick-edit";
import { ZGroupBar, ZToolbar, ZChip } from "@/components/tfp/zoho";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — TaskFlow Pro" }] }),
  component: TasksPage,
});

type GroupBy = "status" | "project" | "none";
type Filter = "all" | "open" | "closed" | "mine" | "issues";

function TasksPage() {
  const { data: tasks = [] } = useTasks();
  const { data: statuses = [] } = useStatuses();
  const { data: projects = [] } = useProjects();
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "open" && t.statusId === "s-done") return false;
      if (filter === "closed" && t.statusId !== "s-done") return false;
      if (filter === "issues" && t.taskType !== "ISSUE") return false;
      return true;
    });
  }, [tasks, q, filter]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Tasks", color: "var(--color-primary)", items: filtered }];
    if (groupBy === "project") {
      return projects
        .map((p) => ({
          key: p.id,
          label: p.name,
          color: "var(--color-info)",
          items: filtered.filter((t) => t.projectId === p.id),
        }))
        .filter((g) => g.items.length);
    }
    // status
    return statuses
      .map((s) => ({
        key: s.id,
        label: s.name,
        color: s.color,
        items: filtered.filter((t) => t.statusId === s.id),
      }))
      .filter((g) => g.items.length);
  }, [filtered, groupBy, statuses, projects]);

  return (
    <>
      <Topbar title="Tasks" actions={<TaskCreateDialog />} />
      <main className="flex-1 space-y-3 p-5">
        <ZToolbar
          left={
            <>
              <ZChip active={filter === "all"} onClick={() => setFilter("all")}>All</ZChip>
              <ZChip active={filter === "open"} onClick={() => setFilter("open")}>Open</ZChip>
              <ZChip active={filter === "closed"} onClick={() => setFilter("closed")}>Closed</ZChip>
              <ZChip active={filter === "issues"} onClick={() => setFilter("issues")}>Issues</ZChip>
              <span className="mx-2 h-4 w-px bg-border" />
              <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Group by</span>
              <ZChip active={groupBy === "status"} onClick={() => setGroupBy("status")}>Status</ZChip>
              <ZChip active={groupBy === "project"} onClick={() => setGroupBy("project")}>Project</ZChip>
              <ZChip active={groupBy === "none"} onClick={() => setGroupBy("none")}>None</ZChip>
            </>
          }
          right={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8 w-60 pl-8 text-[12.5px]"
              />
            </div>
          }
        />

        <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
          {groups.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No tasks match.</div>
          ) : (
            groups.map((g) => {
              const isCollapsed = collapsed[g.key];
              return (
                <div key={g.key}>
                  <ZGroupBar
                    label={g.label}
                    count={g.items.length}
                    color={g.color}
                    collapsed={isCollapsed}
                    onToggle={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                  />
                  {!isCollapsed && (
                    <table className="w-full text-[12.5px]">
                      <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-1.5 font-medium">ID</th>
                          <th className="px-2 py-1.5 font-medium">Title</th>
                          <th className="px-2 py-1.5 font-medium">Project</th>
                          <th className="px-2 py-1.5 font-medium">Status</th>
                          <th className="px-2 py-1.5 font-medium">Assignees</th>
                          <th className="px-2 py-1.5 font-medium">Due</th>
                          <th className="px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((t) => {
                          const s = statuses.find((x) => x.id === t.statusId);
                          const p = projects.find((x) => x.id === t.projectId);
                          return (
                            <tr key={t.id} className="border-t border-border/60 hover:bg-muted/30">
                              <td className="px-4 py-1.5 font-mono text-[10.5px] text-muted-foreground">
                                {t.id.toUpperCase()}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-2">
                                  <Link
                                    to="/tasks/$id"
                                    params={{ id: t.id }}
                                    className="text-foreground hover:text-primary hover:underline"
                                  >
                                    {t.title}
                                  </Link>
                                  {t.taskType === "ISSUE" && (
                                    <Badge
                                      variant="outline"
                                      className="h-4 border-destructive/30 px-1 text-[9px] uppercase text-destructive"
                                    >
                                      Issue
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                {p && (
                                  <Link
                                    to="/projects/$id"
                                    params={{ id: p.id }}
                                    className="text-[11px] text-info hover:underline"
                                  >
                                    {p.name}
                                  </Link>
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                {s ? <TaskStatusSelect task={t} compact /> : null}
                              </td>
                              <td className="px-2 py-1.5">
                                <AssigneeStack ids={t.assigneeIds} />
                              </td>
                              <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                                {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <TaskAssignPopover task={t} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
