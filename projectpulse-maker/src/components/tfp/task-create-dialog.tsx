import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCreateTask, useProjects, useStatuses, useUsers, useTeams } from "@/lib/queries";
import { Plus, Sparkles, AlertOctagon, ListChecks, Calendar, Flag, X } from "lucide-react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";

export function TaskCreateDialog({
  defaultProjectId,
  trigger,
}: {
  defaultProjectId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: projects = [] } = useProjects();
  const { data: statuses = [] } = useStatuses();
  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams();
  const create = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [teamId, setTeamId] = useState("");
  const [statusId, setStatusId] = useState("s-todo");
  const [taskType, setTaskType] = useState<Task["taskType"]>("TASK");
  const [priority, setPriority] = useState<NonNullable<Task["priority"]>>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatusId("s-todo");
    setTaskType("TASK");
    setPriority("MEDIUM");
    setDueDate("");
    setEstimatedHours("");
    setAssignees([]);
    setTeamId("");
    setRecurrenceRule("");
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!projectId) return toast.error("Pick a project");
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        statusId,
        taskType,
        priority,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        assigneeIds: assignees,
        teamId: teamId === "none" ? undefined : teamId || undefined,
        recurrenceRule: recurrenceRule === "none" ? undefined : recurrenceRule || undefined,
      });
      toast.success("Task created");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create task");
    }
  };

  const toggleAssignee = (id: string) =>
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="mr-1.5 h-4 w-4" /> New task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-primary/20 bg-card p-0 sm:max-w-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-card to-card px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Create new{" "}
              {taskType === "ISSUE" ? "incident" : "task"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              onClick={() => setTaskType("TASK")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${taskType === "TASK" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ListChecks className="h-3 w-3" /> Task
            </button>
            <button
              onClick={() => setTaskType("ISSUE")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition ${taskType === "ISSUE" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <AlertOctagon className="h-3 w-3" /> Incident
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Title *
            </Label>
            <Input
              id="title"
              placeholder={
                taskType === "ISSUE" ? "Brief incident summary…" : "What needs to be done?"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="desc"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Description
            </Label>
            <Textarea
              id="desc"
              placeholder="Add detail, links, repro steps…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Project *
              </Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Team
              </Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Flag className="h-3 w-3" /> Priority
              </Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as NonNullable<Task["priority"]>)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Calendar className="h-3 w-3" /> Due
              </Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estimate (h)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recurrence
            </Label>
            <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
              <SelectTrigger>
                <SelectValue placeholder="Does not repeat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Assignees
            </Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background/40 p-2">
              {users.map((u) => {
                const on = assignees.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleAssignee(u.id)}
                    className={`group flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition ${on ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="bg-muted text-[8px]">
                        {u.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {u.name}
                    {on && <X className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
            {assignees.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {assignees.length} selected
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={create.isPending}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {create.isPending
              ? "Creating…"
              : `Create ${taskType === "ISSUE" ? "incident" : "task"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
