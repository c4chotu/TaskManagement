import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProjects, useSprints, useTasks, useUpdateTask } from "@/lib/queries";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarRange, Target, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskCreateDialog } from "@/components/tfp/task-create-dialog";

export const Route = createFileRoute("/_app/sprints")({
  head: () => ({ meta: [{ title: "Sprints — TaskFlow Pro" }] }),
  component: SprintsPage,
});

function SprintsPage() {
  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState<string>("");
  const { data: sprints = [] } = useSprints(projectId || undefined);
  const { data: tasks = [] } = useTasks(projectId ? { projectId } : undefined);
  const update = useUpdateTask();
  const [dragId, setDragId] = useState<string | null>(null);

  const cols: { id: string; title: string; statusIds: string[]; tone: string }[] = [
    { id: "todo", title: "To do", statusIds: ["s-backlog", "s-todo"], tone: "border-info/30" },
    { id: "progress", title: "In progress", statusIds: ["s-progress"], tone: "border-primary/30" },
    { id: "review", title: "Review", statusIds: ["s-review", "s-blocked"], tone: "border-warning/30" },
    { id: "done", title: "Done", statusIds: ["s-done"], tone: "border-success/30" },
  ];

  return (
    <>
      <Topbar title="Sprints" actions={<TaskCreateDialog defaultProjectId={projectId} />} />
      <main className="flex-1 space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-3 p-3">
          <CalendarRange className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Filter by project</span>
          <Select value={projectId || "all"} onValueChange={(v) => setProjectId(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>

        {sprints.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No sprints for this project. <Button size="sm" variant="link" className="text-primary"><Plus className="mr-1 h-3 w-3" /> New sprint</Button>
          </Card>
        )}

        {sprints.map((sp) => {
          const sprintTasks = tasks.filter((t) => sp.taskIds.includes(t.id));
          return (
            <Card key={sp.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/10 to-card px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{sp.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${sp.status === "ACTIVE" ? "border-primary/40 text-primary" : sp.status === "COMPLETED" ? "border-muted-foreground/40 text-muted-foreground" : ""}`}>{sp.status}</Badge>
                  </div>
                  {sp.goal && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Target className="h-3 w-3" />{sp.goal}</p>}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(sp.startDate), "MMM d")} → {format(new Date(sp.endDate), "MMM d")}</span>
              </div>

              <div className="grid gap-3 p-3 md:grid-cols-4">
                {cols.map((col) => {
                  const colTasks = sprintTasks.filter((t) => col.statusIds.includes(t.statusId));
                  return (
                    <div
                      key={col.id}
                      className={`min-h-32 rounded-md border ${col.tone} bg-muted/20 p-2`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async () => {
                        if (!dragId) return;
                        const newStatus = col.statusIds[0];
                        await update.mutateAsync({ id: dragId, patch: { statusId: newStatus } });
                        toast.success(`Moved to ${col.title}`);
                        setDragId(null);
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{col.title}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{colTasks.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {colTasks.map((t) => (
                          <Link key={t.id} to="/tasks/$id" params={{ id: t.id }}
                            draggable onDragStart={() => setDragId(t.id)}
                            className="group flex items-start gap-1.5 rounded border border-border bg-card p-2 transition hover:border-primary/40">
                            <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{t.title}</p>
                              <p className="font-mono text-[10px] text-muted-foreground">{t.id.toUpperCase()}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </main>
    </>
  );
}
