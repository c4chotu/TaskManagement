import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useProjects, useStatuses, useTasks } from "@/lib/queries";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { StatusDot } from "@/components/tfp/badges";
import { Badge } from "@/components/ui/badge";
import { TaskCreateDialog } from "@/components/tfp/task-create-dialog";
import {
  AssigneeStack,
  TaskStatusSelect,
  TaskAssignPopover,
} from "@/components/tfp/task-quick-edit";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Tasks — TaskFlow Pro" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks = [] } = useTasks();
  const { data: statuses = [] } = useStatuses();
  const { data: projects = [] } = useProjects();
  const [q, setQ] = useState("");

  const filtered = tasks.filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Topbar title="All Tasks" actions={<TaskCreateDialog />} />
      <main className="flex-1 space-y-4 p-6">
        <Card className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Assignees</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const s = statuses.find((x) => x.id === t.statusId);
                const p = projects.find((x) => x.id === t.projectId);
                return (
                  <tr key={t.id} className="border-b border-border/50 transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to="/tasks/$id" params={{ id: t.id }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {t.id.toUpperCase()}
                          </span>
                          {t.taskType === "ISSUE" && (
                            <Badge
                              variant="outline"
                              className="h-4 border-destructive/30 px-1 text-[10px] text-destructive"
                            >
                              Issue
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{t.title}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p && (
                        <Link
                          to="/projects/$id"
                          params={{ id: p.id }}
                          className="hover:text-primary"
                        >
                          {p.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s ? <TaskStatusSelect task={t} compact /> : null}
                    </td>
                    <td className="px-4 py-3">
                      <AssigneeStack ids={t.assigneeIds} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TaskAssignPopover task={t} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
