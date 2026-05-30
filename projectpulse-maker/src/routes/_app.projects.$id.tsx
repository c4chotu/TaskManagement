import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useAddDependency,
  useDependencies,
  useProject,
  useRemoveDependency,
  useStatuses,
  useTasks,
  useUpdateTaskStatus,
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
  useUsers,
} from "@/lib/queries";
import { ArrowLeft, AlertTriangle, GripVertical, Link2, X, Plus, Users, ShieldAlert } from "lucide-react";
import { StatusDot } from "@/components/tfp/badges";
import { useState } from "react";
import type { Task } from "@/lib/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { AssigneeStack } from "@/components/tfp/task-quick-edit";
import { TaskCreateDialog } from "@/components/tfp/task-create-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/projects/$id")({
  head: () => ({ meta: [{ title: "Project — TaskFlow Pro" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const { data: project } = useProject(id);
  if (!project) {
    return (
      <>
        <Topbar title="Project" />
        <main className="p-6">
          <Card className="p-8 text-center text-sm text-muted-foreground">Project not found.</Card>
        </main>
      </>
    );
  }
  return (
    <>
      <Topbar title={project.name} actions={<TaskCreateDialog defaultProjectId={id} />} />
      <main className="flex-1 space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              to="/projects"
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> All projects
            </Link>
            <h2 className="text-xl font-semibold tracking-tight">{project.name}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {project.type}
          </Badge>
        </div>

        <Tabs defaultValue="dashboard">
          <div className="border-b mb-4">
            <TabsList className="h-12 w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger value="dashboard" className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">Dashboard</TabsTrigger>
              <TabsTrigger value="tasks" className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">Tasks</TabsTrigger>
              <TabsTrigger value="milestones" className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">Milestones</TabsTrigger>
              <TabsTrigger value="timesheet" className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">Timesheet</TabsTrigger>
              <TabsTrigger value="issues" className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">Issues</TabsTrigger>
              <TabsTrigger value="team" className="relative h-12 rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground">Users</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-0 outline-none">
            <ProjectDashboardTab projectId={id} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-0 outline-none">
            <Tabs defaultValue="kanban" className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="kanban">Kanban</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                  <TabsTrigger value="gantt">Timeline</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="kanban" className="mt-0"><KanbanBoard projectId={id} /></TabsContent>
              <TabsContent value="list" className="mt-0"><TaskListView projectId={id} /></TabsContent>
              <TabsContent value="gantt" className="mt-0"><GanttView projectId={id} /></TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="milestones" className="mt-0 outline-none">
            <ProjectMilestonesTab />
          </TabsContent>
          <TabsContent value="timesheet" className="mt-0 outline-none">
            <ProjectTimesheetTab />
          </TabsContent>
          <TabsContent value="issues" className="mt-0 outline-none">
            <ProjectIssuesTab projectId={id} />
          </TabsContent>
          <TabsContent value="team" className="mt-0 outline-none">
            <ProjectMembersView projectId={id} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function ProjectDashboardTab({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <div className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Task Completion</h3>
          <p className="text-3xl font-bold mt-2">68%</p>
          <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '68%' }} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Open Issues</h3>
          <p className="text-3xl font-bold mt-2 text-destructive">3</p>
          <p className="text-xs text-muted-foreground mt-2">1 critical severity</p>
        </div>
      </Card>
      <Card>
        <div className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Hours Logged</h3>
          <p className="text-3xl font-bold mt-2">142h</p>
          <p className="text-xs text-muted-foreground mt-2">This week</p>
        </div>
      </Card>
      <Card>
        <div className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Team Size</h3>
          <p className="text-3xl font-bold mt-2">12</p>
          <p className="text-xs text-muted-foreground mt-2">Active contributors</p>
        </div>
      </Card>
    </div>
  );
}

function ProjectMilestonesTab() {
  return (
    <Card>
      <div className="p-6 text-center py-12">
        <h3 className="text-lg font-medium">Milestones</h3>
        <p className="text-muted-foreground mt-2 text-sm">Define key phases and deliverables for your project. (Coming soon)</p>
      </div>
    </Card>
  );
}

function ProjectTimesheetTab() {
  return (
    <Card>
      <div className="p-6 text-center py-12">
        <h3 className="text-lg font-medium">Project Timesheet</h3>
        <p className="text-muted-foreground mt-2 text-sm">Review hours logged by your team against tasks in this project. (Timesheet Module integration coming soon)</p>
      </div>
    </Card>
  );
}

function ProjectIssuesTab({ projectId }: { projectId: string }) {
  return (
    <Card>
      <div className="p-6 text-center py-12">
        <h3 className="text-lg font-medium">Linked Incidents</h3>
        <p className="text-muted-foreground mt-2 text-sm">View SEV0-SEV3 incidents affecting this project's infrastructure. (Coming soon)</p>
      </div>
    </Card>
  );
}

function KanbanBoard({ projectId }: { projectId: string }) {
  const { data: statuses = [] } = useStatuses(projectId);
  const { data: tasks = [] } = useTasks({ projectId });
  const update = useUpdateTaskStatus();
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
      {statuses.map((col) => {
        const colTasks = tasks.filter((t) => t.statusId === col.id);
        const breached = col.wipLimit && colTasks.length > col.wipLimit;
        return (
          <div
            key={col.id}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async () => {
              if (!dragId) return;
              if (col.requiresComment) {
                const comment = window.prompt("This status requires a comment:");
                if (!comment) return toast.error("Comment required for Blocked");
                await update.mutateAsync({ taskId: dragId, statusId: col.id, comment });
              } else {
                await update.mutateAsync({ taskId: dragId, statusId: col.id });
              }
              setDragId(null);
              toast.success(`Moved to ${col.name}`);
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <StatusDot color={col.color} />
                <span className="text-xs font-semibold uppercase tracking-wide">{col.name}</span>
                <Badge variant="outline" className="h-4 px-1 font-mono text-[10px]">
                  {colTasks.length}
                  {col.wipLimit ? `/${col.wipLimit}` : ""}
                </Badge>
              </div>
              {breached && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
            </div>
            <div className="flex flex-col gap-2 p-2">
              {colTasks.map((t) => (
                <TaskCard key={t.id} task={t} draggable onDragStart={() => setDragId(t.id)} />
              ))}
              {colTasks.length === 0 && (
                <div className="rounded-md border border-dashed border-border/50 p-4 text-center text-[10px] text-muted-foreground">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TaskCard({
  task,
  draggable,
  onDragStart,
}: {
  task: Task;
  draggable?: boolean;
  onDragStart?: () => void;
}) {
  return (
    <Link
      to="/tasks/$id"
      params={{ id: task.id }}
      draggable={draggable}
      onDragStart={onDragStart}
      className="group block rounded-md border border-border bg-card p-3 transition hover:border-primary/40 hover:shadow-glow"
    >
      <div className="flex items-start gap-2">
        {draggable && (
          <GripVertical className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              {task.id.toUpperCase()}
            </span>
            {task.taskType === "ISSUE" && (
              <Badge
                variant="outline"
                className="h-4 border-destructive/30 px-1 text-[10px] text-destructive"
              >
                Issue
              </Badge>
            )}
            {task.priority && <PriorityDot priority={task.priority} />}
          </div>
          <p className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>
          <div className="mt-2 flex items-center justify-between">
            <AssigneeStack ids={task.assigneeIds} />
            {task.dueDate && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function PriorityDot({ priority }: { priority: NonNullable<Task["priority"]> }) {
  const color =
    priority === "CRITICAL"
      ? "bg-destructive"
      : priority === "HIGH"
        ? "bg-warning"
        : priority === "MEDIUM"
          ? "bg-info"
          : "bg-muted-foreground";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} title={priority} />;
}

function TaskListView({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useTasks({ projectId });
  const { data: statuses = [] } = useStatuses(projectId);
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Task</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Assignees</th>
            <th className="px-4 py-2">Due</th>
            <th className="px-4 py-2">Hours</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const s = statuses.find((x) => x.id === t.statusId);
            return (
              <tr key={t.id} className="border-b border-border/50 transition hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link to="/tasks/$id" params={{ id: t.id }} className="block">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {t.id.toUpperCase()}
                    </span>
                    <p className="font-medium">{t.title}</p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {s && (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <StatusDot color={s.color} />
                      {s.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AssigneeStack ids={t.assigneeIds} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {t.loggedHours ?? 0} / {t.estimatedHours ?? 0}h
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function GanttView({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useTasks({ projectId });
  const { data: project } = useProject(projectId);
  const { data: deps = [] } = useDependencies(projectId);
  const addDep = useAddDependency();
  const rmDep = useRemoveDependency();
  const navigate = useNavigate();
  const [linkMode, setLinkMode] = useState(false);
  const [predecessor, setPredecessor] = useState<string | null>(null);

  if (!project) return null;
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const span = end - start || 1;
  const dated = tasks.filter((t) => t.dueDate);

  const handleBarClick = async (taskId: string) => {
    if (!linkMode) {
      navigate({ to: "/tasks/$id", params: { id: taskId } });
      return;
    }
    if (!predecessor) {
      setPredecessor(taskId);
      toast.message("Predecessor set", { description: "Now click the successor task" });
      return;
    }
    if (predecessor === taskId) {
      setPredecessor(null);
      return;
    }
    try {
      await addDep.mutateAsync({ predecessorId: predecessor, successorId: taskId, type: "FS" });
      toast.success(`Linked ${predecessor.toUpperCase()} → ${taskId.toUpperCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to link");
    }
    setPredecessor(null);
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-mono uppercase text-muted-foreground">
          {format(new Date(start), "MMM d, yyyy")} → {format(new Date(end), "MMM d, yyyy")}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={linkMode ? "default" : "outline"}
            className={`h-7 text-xs ${linkMode ? "bg-gradient-primary text-primary-foreground" : ""}`}
            onClick={() => {
              setLinkMode((v) => !v);
              setPredecessor(null);
            }}
          >
            <Link2 className="mr-1 h-3 w-3" /> {linkMode ? "Linking…" : "Edit dependencies"}
          </Button>
        </div>
      </div>
      {linkMode && (
        <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          {predecessor ? (
            <>
              Predecessor: <span className="font-mono">{predecessor.toUpperCase()}</span> — click a
              successor task bar to link.
            </>
          ) : (
            <>Click a task bar to set the predecessor.</>
          )}
        </div>
      )}

      <div className="space-y-2">
        {dated.map((t) => {
          const ts = new Date(t.createdAt).getTime();
          const te = new Date(t.dueDate!).getTime();
          const left = Math.max(0, ((ts - start) / span) * 100);
          const width = Math.max(2, ((te - ts) / span) * 100);
          const taskDeps = deps.filter((d) => d.successorId === t.id);
          const taskSuccs = deps.filter((d) => d.predecessorId === t.id);
          const isPred = predecessor === t.id;
          return (
            <div key={t.id} className="grid grid-cols-[200px_1fr] items-center gap-3">
              <div className="min-w-0 truncate text-xs">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t.id.toUpperCase()}
                </span>
                <p className="truncate">{t.title}</p>
                {(taskDeps.length > 0 || taskSuccs.length > 0) && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {taskDeps.length > 0 && (
                      <span>
                        after: {taskDeps.map((d) => d.predecessorId.toUpperCase()).join(", ")}
                      </span>
                    )}
                    {taskDeps.length > 0 && taskSuccs.length > 0 && " · "}
                    {taskSuccs.length > 0 && (
                      <span>
                        before: {taskSuccs.map((d) => d.successorId.toUpperCase()).join(", ")}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="relative h-6 rounded bg-muted/40">
                <button
                  onClick={() => handleBarClick(t.id)}
                  className={`absolute top-1 h-4 cursor-pointer rounded transition ${isPred ? "bg-warning shadow-glow ring-2 ring-warning" : "bg-gradient-primary shadow-glow hover:brightness-110"}`}
                  style={{ left: `${left}%`, width: `${Math.min(100 - left, width)}%` }}
                  title={linkMode ? "Click to set/link" : "Open task"}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Link2 className="h-3 w-3" /> Dependencies ({deps.length})
        </h4>
        {deps.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No dependencies yet. Toggle "Edit dependencies" and click two task bars to link them.
          </p>
        )}
        <ul className="space-y-1">
          {deps.map((d) => {
            const p = tasks.find((t) => t.id === d.predecessorId);
            const s = tasks.find((t) => t.id === d.successorId);
            return (
              <li
                key={d.id}
                className="group flex items-center justify-between gap-2 rounded border border-border bg-muted/20 px-2 py-1.5 text-xs"
              >
                <span className="truncate">
                  <span className="font-mono">{p?.id.toUpperCase()}</span> {p?.title} →{" "}
                  <span className="font-mono">{s?.id.toUpperCase()}</span> {s?.title}
                </span>
                <button
                  onClick={async () => {
                    await rmDep.mutateAsync(d.id);
                    toast.success("Removed");
                  }}
                  className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function ProjectMembersView({ projectId }: { projectId: string }) {
  const { data: members = [], isLoading: loadingMembers } = useProjectMembers(projectId);
  const { data: users = [] } = useUsers();
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();

  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("PROJECT_MEMBER");

  const handleAddMember = async () => {
    if (!selectedUserId) return toast.error("Please select a user");
    try {
      await addMember.mutateAsync({ projectId, userId: selectedUserId, role: selectedRole });
      toast.success("Project member added successfully!");
      setOpen(false);
      setSelectedUserId("");
      setSelectedRole("PROJECT_MEMBER");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this member from the project?")) return;
    try {
      await removeMember.mutateAsync({ projectId, userId });
      toast.success("Member removed from project");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member");
    }
  };

  const nonMembers = users.filter(
    (u) => !members.some((m) => m.userId === u.id)
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Project Members ({members.length})
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Project Member</DialogTitle>
              <DialogDescription>
                Select a user from your organization to collaborate on this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select User</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nonMembers.length === 0 ? (
                      <SelectItem value="_none" disabled>All users are already members</SelectItem>
                    ) : (
                      nonMembers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Project Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROJECT_OWNER">Project Owner</SelectItem>
                    <SelectItem value="PROJECT_ADMIN">Project Admin</SelectItem>
                    <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                    <SelectItem value="PROJECT_MEMBER">Project Member</SelectItem>
                    <SelectItem value="PROJECT_VIEWER">Project Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} size="sm" className="bg-gradient-primary text-primary-foreground">
                Add to Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadingMembers ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No members assigned to this project.</p>
      ) : (
        <div className="divide-y divide-border/50">
          {members.map((m: any) => {
            const u = users.find((x) => x.id === m.userId);
            return (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-muted text-xs">
                      {u?.name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-semibold">{u?.name || "Unknown User"}</h4>
                    <p className="text-xs text-muted-foreground">{u?.email || ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider">
                    {m.role?.replace("_", " ")}
                  </Badge>
                  <Button
                    onClick={() => handleRemoveMember(m.userId)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
