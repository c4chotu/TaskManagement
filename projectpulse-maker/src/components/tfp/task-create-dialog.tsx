import { useState, useMemo } from "react";
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
import { useCreateTask, useProjects, useStatuses, useUsers, useTeams, useProjectMembers, useProject, useSprints, usePhases, useUploadAttachment } from "@/lib/queries";
import { Plus, Sparkles, AlertOctagon, ListChecks, Calendar, Flag, X, Paperclip } from "lucide-react";
import { toast } from "sonner";
import type { Task, TaskCategory } from "@/lib/types";

export function TaskCreateDialog({
  defaultProjectId,
  trigger,
}: {
  defaultProjectId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const activeProjectId = projectId || projects[0]?.id || "";

  const { data: project } = useProject(activeProjectId);
  const { data: sprints = [] } = useSprints(activeProjectId);
  const { data: phases = [] } = usePhases(activeProjectId);
  const { data: statuses = [] } = useStatuses(activeProjectId);
  const { data: users = [] } = useUsers();
  const { data: projectMembers = [] } = useProjectMembers(activeProjectId);
  const { data: teams = [] } = useTeams();
  const create = useCreateTask();
  const uploadAttachment = useUploadAttachment();

  const projectMemberUserIds = useMemo(() => new Set(projectMembers.map((m: any) => m.userId)), [projectMembers]);
  const filteredUsers = useMemo(() => {
    if (!activeProjectId) return [];
    return users.filter((u) => projectMemberUserIds.has(u.id));
  }, [users, projectMemberUserIds, activeProjectId]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [statusId, setStatusId] = useState("s-todo");
  const [sprintId, setSprintId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [taskType, setTaskType] = useState<Task["taskType"]>("TASK");
  const [priority, setPriority] = useState<NonNullable<Task["priority"]>>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState("");
  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tfp.customCategories");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return ["FRONTEND", "BACKEND", "INFRA", "DESIGN", "QA", "SECURITY", "DOCS", "RESEARCH", "BUG", "FEATURE"];
  });
  const [category, setCategory] = useState<string>("none");
  const [taskFiles, setTaskFiles] = useState<File[]>([]);

  const activeStatusId = statuses.some((s) => s.id === statusId)
    ? statusId
    : (statuses.find((s) => s.isDefault)?.id || statuses[0]?.id || statusId);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatusId("s-todo");
    setSprintId("");
    setPhaseId("");
    setTaskType("TASK");
    setPriority("MEDIUM");
    setDueDate("");
    setEstimatedHours("");
    setAssignees([]);
    setTeamId("");
    setRecurrenceRule("");
    setCategory("none");
    setTaskFiles([]);
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!activeProjectId) return toast.error("Pick a project");
    try {
      const createdTask = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: activeProjectId,
        statusId: activeStatusId,
        sprintId: sprintId === "none" ? undefined : sprintId || undefined,
        phaseId: phaseId === "none" ? undefined : phaseId || undefined,
        taskType,
        priority,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        assigneeIds: assignees,
        teamId: teamId === "none" ? undefined : teamId || undefined,
        recurrenceRule: recurrenceRule === "none" ? undefined : recurrenceRule || undefined,
        category: category === "none" ? undefined : (category as TaskCategory),
      });

      for (const file of taskFiles) {
        try {
          await uploadAttachment.mutateAsync({
            taskId: createdTask.id,
            file,
          });
        } catch (uploadErr) {
          console.error("Failed to upload attachment", file.name, uploadErr);
        }
      }

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

        <div className="grid gap-4 px-6 pb-4 max-h-[65vh] overflow-y-auto">
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
              placeholder="Add detail, links, repro steps… (Paste images to embed inline)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={async (e) => {
                const items = e.clipboardData.items;
                for (const item of items) {
                  if (item.type.indexOf("image") !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        const markdownImage = `\n![pasted image](${base64})\n`;
                        const textarea = e.currentTarget;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newVal = description.substring(0, start) + markdownImage + description.substring(end);
                        setDescription(newVal);
                        toast.success("Image embedded in description");
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }
              }}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Project *
              </Label>
              <Select value={activeProjectId} onValueChange={setProjectId}>
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
              <Select value={activeStatusId} onValueChange={setStatusId}>
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

          {((project?.type === "SCRUM" && sprints.length > 0) || (project?.type === "WATERFALL" && phases.length > 0)) && (
            <div className="grid grid-cols-1 gap-3">
              {project?.type === "SCRUM" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sprint</Label>
                  <Select value={sprintId} onValueChange={setSprintId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {project?.type === "WATERFALL" && sprints.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phase</Label>
                  <Select value={sprintId} onValueChange={setSprintId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sprints.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
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
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <div className="p-1 border-t border-border mt-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-[11px] h-7 text-primary hover:text-primary-foreground hover:bg-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        const name = prompt("Enter new category name:");
                        if (name && name.trim()) {
                          const clean = name.trim().toUpperCase();
                          if (!categories.includes(clean)) {
                            const updated = [...categories, clean];
                            setCategories(updated);
                            localStorage.setItem("tfp.customCategories", JSON.stringify(updated));
                            setCategory(clean);
                            toast.success(`Category "${clean}" added`);
                          } else {
                            setCategory(clean);
                          }
                        }
                      }}
                    >
                      + Add Category
                    </Button>
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Assignees
            </Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background/40 p-2">
              {filteredUsers.map((u) => {
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

          <div className="space-y-1.5 mt-2">
            <Label className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Paperclip className="h-3 w-3" /> Attachments
            </Label>
            <div
              onClick={() => document.getElementById("dialog-task-file-input")?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setTaskFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                }
              }}
              className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer py-4 text-xs text-muted-foreground transition duration-200"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground/60 mb-1" />
              <span>Drag & drop files here, or <span className="text-primary font-medium hover:underline">browse</span></span>
              <input
                id="dialog-task-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setTaskFiles((prev) => [...prev, ...Array.from(e.target.files)]);
                  }
                }}
              />
            </div>
            {taskFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {taskFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded border border-border bg-muted/30 px-2 py-1 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaskFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
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
