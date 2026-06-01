import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  useCreateTask, useProjects, useStatuses, useUsers, useTeams, useTasks,
} from "@/lib/queries";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, ListChecks, AlertOctagon, Tag, Flag, Calendar,
  Users, Paperclip, Repeat, X,
} from "lucide-react";
import type { Task, TaskCategory, TaskBadge } from "@/lib/types";
import { ZPageHeader } from "@/components/zoho/components";

export const Route = createFileRoute("/_app/tasks/new")({
  head: () => ({ meta: [{ title: "New Task — TaskFlow Pro" }] }),
  component: NewTaskPage,
});

function NewTaskPage() {
  const nav = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: statuses = [] } = useStatuses();
  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams();
  const create = useCreateTask();

  const [taskType, setTaskType] = useState<Task["taskType"]>("TASK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [parentTaskId, setParentTaskId] = useState("none");

  const { data: allProjectTasks = [] } = useTasks(projectId ? { projectId } : undefined);
  const standardTasks = allProjectTasks.filter((t) => t.taskType === "TASK");
  const [teamId, setTeamId] = useState("none");
  const [statusId, setStatusId] = useState("s-todo");
  const [priority, setPriority] = useState<NonNullable<Task["priority"]>>("MEDIUM");
  const [severity, setSeverity] = useState("SEV2");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [category, setCategory] = useState<TaskCategory | "none">("none");
  const [badges, setBadges] = useState<TaskBadge[]>([]);
  const [storyPoints, setStoryPoints] = useState("");

  const toggle = (id: string) =>
    setAssignees((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    setTags((p) => [...p, v]);
    setTagInput("");
  };

  const submit = async (mode: "save" | "another") => {
    if (!title.trim()) return toast.error("Title is required");
    if (!projectId) return toast.error("Pick a project");
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId, statusId, taskType, priority,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        assigneeIds: assignees,
        teamId: teamId === "none" ? undefined : teamId,
        recurrenceRule: recurrence === "none" ? undefined : recurrence,
        parentTaskId: parentTaskId === "none" ? undefined : parentTaskId,
        category: category === "none" ? undefined : category,
        badges: badges.length > 0 ? badges : undefined,
        storyPoints: storyPoints ? Number(storyPoints) : undefined,
      });
      toast.success(`${taskType === "ISSUE" ? "Issue" : "Task"} created`);
      if (mode === "save") nav({ to: "/tasks" });
      else { setTitle(""); setDescription(""); setAssignees([]); setTags([]); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    }
  };

  return (
    <>
      <Topbar title="Create Task" />
      <ZPageHeader
        title={taskType === "ISSUE" ? "Create Issue" : "Create Task"}
        breadcrumbs={[{ label: "Tasks", to: "/tasks" }, { label: "New" }]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/tasks" })}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT — main fields */}
          <div className="space-y-4">
            <Card className="p-5">
              {/* Type toggle */}
              <div className="mb-4 inline-flex rounded-md border border-border bg-muted/30 p-0.5">
                <button onClick={() => setTaskType("TASK")}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${taskType === "TASK" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                  <ListChecks className="h-3.5 w-3.5" /> Task
                </button>
                <button onClick={() => setTaskType("ISSUE")}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${taskType === "ISSUE" ? "bg-destructive text-destructive-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                  <AlertOctagon className="h-3.5 w-3.5" /> Issue
                </button>
              </div>

              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                placeholder={taskType === "ISSUE" ? "Brief issue summary..." : "What needs to be done?"}
                className="mt-1 border-0 border-b text-xl font-semibold focus-visible:ring-0 px-0 rounded-none" />

              {taskType === "ISSUE" && (
                <div className="mt-4">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Associated Task</Label>
                  <Select value={parentTaskId} onValueChange={setParentTaskId}>
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Select Task..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No associated task</SelectItem>
                      {standardTasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.displayId ? `[${t.displayId}] ` : ""}{t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="mt-5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={6} placeholder="Add details, acceptance criteria, links…" className="mt-1" />
              </div>

              <div className="mt-5">
                <Label className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Tag className="h-3 w-3" /> Tags
                </Label>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background p-2">
                  {tags.map((t, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {t}
                      <button onClick={() => setTags((p) => p.filter((_, x) => x !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Add tag…" className="min-w-[100px] flex-1 bg-transparent text-xs outline-none" />
                </div>
              </div>

              <div className="mt-5">
                <Label className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> Attachments
                </Label>
                <div className="mt-1 grid place-items-center rounded-md border border-dashed border-border bg-muted/20 py-6 text-xs text-muted-foreground">
                  Drop files here or click to upload (mock)
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT — meta sidebar */}
          <aside className="space-y-4">
            <Card className="p-4">
              <h4 className="mb-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Details</h4>
              <div className="space-y-3">
                <Field label="Project *">
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Team">
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={statusId} onValueChange={setStatusId}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={<span className="flex items-center gap-1"><Flag className="h-3 w-3" /> Priority</span>}>
                  <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {taskType === "ISSUE" && (
                  <Field label="Severity">
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEV0">SEV0 — Critical</SelectItem>
                        <SelectItem value="SEV1">SEV1 — High</SelectItem>
                        <SelectItem value="SEV2">SEV2 — Medium</SelectItem>
                        <SelectItem value="SEV3">SEV3 — Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field label={<span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Start</span>}>
                  <Input type="date" className="h-8" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
                <Field label={<span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due</span>}>
                  <Input type="date" className="h-8" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
                <Field label="Estimate (h)">
                  <Input type="number" min={0} step={0.5} className="h-8"
                    value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
                </Field>
                <Field label={<span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> Recurrence</span>}>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={<span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Category</span>}>
                  <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {(["FRONTEND","BACKEND","INFRA","DESIGN","QA","SECURITY","DOCS","RESEARCH","BUG","FEATURE"] as TaskCategory[]).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Story Points">
                  <Input type="number" min={0} step={1} className="h-8" placeholder="e.g. 5" value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} />
                </Field>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <Users className="h-3 w-3" /> Assignees
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {users.map((u) => {
                  const on = assignees.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggle(u.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition ${on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="bg-muted text-[8px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {u.name}
                      {on && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Badges */}
            <Card className="p-4">
              <h4 className="mb-3 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Task Badges
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(["URGENT","BLOCKED","CUSTOMER_REPORTED","P0","HOT_FIX","INNOVATION","MILESTONE","GOOD_FIRST","NEEDS_REVIEW","ON_TRACK"] as TaskBadge[]).map(b => {
                  const on = badges.includes(b);
                  return (
                    <button key={b} onClick={() => setBadges(p => on ? p.filter(x => x !== b) : [...p, b])}
                      className={`text-[10px] font-bold uppercase tracking-wide rounded px-2 py-0.5 border transition ${
                        on ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:border-emerald-500/40"
                      }`}>
                      {b.replace(/_/g,' ')}
                    </button>
                  );
                })}
              </div>
            </Card>
          </aside>
        </div>
      </main>

      {/* sticky footer */}
      <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {taskType === "ISSUE" ? "Issue" : "Task"} will be added to <span className="font-semibold text-foreground">{projects.find((p) => p.id === projectId)?.name ?? "—"}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => nav({ to: "/tasks" })}>Cancel</Button>
            <Button variant="outline" onClick={() => submit("another")} disabled={create.isPending}>Save & add another</Button>
            <Button onClick={() => submit("save")} disabled={create.isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
