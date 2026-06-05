import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { useState, useMemo, useEffect, useRef } from "react";
import {
  useCreateTask, useProjects, useStatuses, useUsers, useTeams, useTasks, useProjectMembers, useProject, useSprints, usePhases, useUploadAttachment, useTask,
} from "@/lib/queries";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, ListChecks, AlertOctagon, Tag, Flag, Calendar,
  Users, Paperclip, Repeat, X, ChevronDown, ChevronUp, Code, List, ListOrdered, Link2, Info, Clock, Bell
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import type { Task, TaskCategory, TaskBadge } from "@/lib/types";

export const Route = createFileRoute("/_app/tasks/new")({
  validateSearch: (search: Record<string, unknown>): { parentTaskId?: string; projectId?: string } => {
    return {
      parentTaskId: (search.parentTaskId as string) || undefined,
      projectId: (search.projectId as string) || undefined,
    };
  },
  head: () => ({ meta: [{ title: "New Task — TaskFlow Pro" }] }),
  component: NewTaskPage,
});

function NewTaskPage() {
  const nav = useNavigate();
  const { parentTaskId, projectId: initialProjectId } = Route.useSearch();

  const { data: parentTask } = useTask(parentTaskId === "none" ? undefined : parentTaskId);
  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState("");
  
  const activeProjectId = projectId || initialProjectId || parentTask?.projectId || projects[0]?.id || "";

  useEffect(() => {
    if (parentTask?.projectId) {
      setProjectId(parentTask.projectId);
    } else if (initialProjectId) {
      setProjectId(initialProjectId);
    }
  }, [parentTask, initialProjectId]);

  const { data: project } = useProject(activeProjectId);
  const { data: sprints = [] } = useSprints(activeProjectId);
  const { data: statuses = [] } = useStatuses(activeProjectId);
  const { data: users = [] } = useUsers();
  const { data: projectMembers = [] } = useProjectMembers(activeProjectId);
  const { data: teams = [] } = useTeams();
  const create = useCreateTask();
  const uploadAttachment = useUploadAttachment();
  const [taskFiles, setTaskFiles] = useState<File[]>([]);

  const projectMemberUserIds = useMemo(() => new Set(projectMembers.map((m: any) => m.userId)), [projectMembers]);
  const filteredUsers = useMemo(() => {
    if (!activeProjectId) return [];
    return users.filter((u) => projectMemberUserIds.has(u.id));
  }, [users, projectMemberUserIds, activeProjectId]);

  const [taskType, setTaskType] = useState<Task["taskType"]>("TASK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [teamId, setTeamId] = useState("none");
  const [sprintId, setSprintId] = useState("none");
  const [statusId, setStatusId] = useState("s-todo");
  const [priority, setPriority] = useState<NonNullable<Task["priority"]> | "NONE">("NONE");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [billingType, setBillingType] = useState("HOURLY");
  const [reminder, setReminder] = useState("none");

  const [descExpanded, setDescExpanded] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(true);

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
  const [badges, setBadges] = useState<TaskBadge[]>([]);
  const [storyPoints, setStoryPoints] = useState("");

  const activeStatusId = statuses.some((s) => s.id === statusId)
    ? statusId
    : (statuses.find((s) => s.isDefault)?.id || statuses[0]?.id || statusId);

  useEffect(() => {
    if (parentTask && parentTask.sprintId) {
      setSprintId(parentTask.sprintId);
    }
  }, [parentTask]);

  const toggle = (id: string) =>
    setAssignees((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    setTags((p) => [...p, v]);
    setTagInput("");
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = prefix + selected + suffix;
    setDescription(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleCancel = () => {
    if (parentTaskId && parentTaskId !== "none") {
      nav({ to: `/tasks/${parentTaskId}` });
    } else {
      nav({ to: "/tasks" });
    }
  };

  const submit = async (mode: "save" | "another") => {
    if (!title.trim()) return toast.error("Title is required");
    if (!activeProjectId) return toast.error("Pick a project");
    try {
      const createdTask = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: activeProjectId,
        statusId: activeStatusId,
        taskType,
        priority: priority === "NONE" ? undefined : (priority as any),
        dueDate: dueDate || undefined,
        startDate: startDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        assigneeIds: assignees,
        teamId: teamId === "none" ? undefined : teamId,
        recurrenceRule: recurrence === "none" ? undefined : recurrence,
        parentTaskId: parentTaskId === "none" ? undefined : parentTaskId,
        category: category === "none" ? undefined : (category as TaskCategory),
        badges: badges.length > 0 ? badges : undefined,
        storyPoints: storyPoints ? Number(storyPoints) : undefined,
        sprintId: sprintId === "none" ? undefined : sprintId || undefined,
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

      toast.success(`${parentTaskId && parentTaskId !== "none" ? "Subtask" : "Task"} created`);
      if (mode === "save") {
        if (parentTaskId && parentTaskId !== "none") {
          nav({ to: `/tasks/${parentTaskId}` });
        } else {
          nav({ to: "/tasks" });
        }
      } else {
        setTitle("");
        setDescription("");
        setAssignees([]);
        setTags([]);
        setTaskFiles([]);
        setEstimatedHours("");
        setStartDate("");
        setDueDate("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    }
  };  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col glass-card shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-muted/5 px-6 py-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 tracking-tight text-foreground">
              <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
              {parentTask ? "Add Subtask Flow" : (taskType === "ISSUE" ? "Report Incident Operations" : "Initialize New Task")}
            </h2>
            {parentTask && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Subtask of <span className="font-semibold text-emerald-500">{parentTask.title}</span>
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Title and Type Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-xl border border-border bg-background/50 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setTaskType("TASK")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
                    taskType === "TASK"
                      ? "bg-emerald-500 text-white shadow-sm scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" /> Task Flow
                </button>
                <button
                  type="button"
                  onClick={() => setTaskType("ISSUE")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${
                    taskType === "ISSUE"
                      ? "bg-red-500 text-white shadow-sm scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertOctagon className="h-3.5 w-3.5" /> Incident Issue
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                {taskType === "ISSUE" ? "Incident Summary *" : "Task Title *"}
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                placeholder={taskType === "ISSUE" ? "Brief incident summary..." : "What needs to be done?"}
                className="border-0 border-b border-border/50 text-lg font-bold focus-visible:ring-0 focus-visible:border-emerald-500 px-0 rounded-none bg-transparent transition-all duration-300"
              />
            </div>
          </div>

          {/* Collapsible Description Section */}
          <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/5">
            <button
              type="button"
              onClick={() => setDescExpanded(!descExpanded)}
              className="flex items-center justify-between w-full p-4 font-semibold text-sm hover:bg-muted/20 transition text-left"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-500" />
                Description & Attachments
              </span>
              {descExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {descExpanded && (
              <div className="p-4 pt-0 space-y-4 border-t border-border/40 animate-in slide-in-from-top-1 duration-200">
                
                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/40 rounded-lg border border-border/40 mt-3">
                  <button
                    type="button"
                    title="Bold"
                    onClick={() => insertMarkdown("**", "**")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <span className="font-bold text-xs px-1">B</span>
                  </button>
                  <button
                    type="button"
                    title="Italic"
                    onClick={() => insertMarkdown("*", "*")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <span className="italic text-xs px-1">I</span>
                  </button>
                  <button
                    type="button"
                    title="Underline"
                    onClick={() => insertMarkdown("<u>", "</u>")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <span className="underline text-xs px-1">U</span>
                  </button>
                  <button
                    type="button"
                    title="Code block"
                    onClick={() => insertMarkdown("```\n", "\n```")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <Code className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Bullet List"
                    onClick={() => insertMarkdown("- ", "")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Numbered List"
                    onClick={() => insertMarkdown("1. ", "")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Quote"
                    onClick={() => insertMarkdown("> ", "")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <span className="font-serif font-bold text-xs px-1">“</span>
                  </button>
                  <button
                    type="button"
                    title="Link"
                    onClick={() => insertMarkdown("[", "](url)")}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Textarea
                  ref={textareaRef}
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
                            const newVal =
                              description.substring(0, start) + markdownImage + description.substring(end);
                            setDescription(newVal);
                            toast.success("Image embedded in description");
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }
                  }}
                  rows={4}
                  placeholder="Describe details, acceptance criteria, links... Paste images to embed inline"
                  className="w-full text-sm border-border focus-visible:ring-1 focus-visible:ring-teal-500 bg-background"
                />

                {/* Drag-and-Drop file attachment zone */}
                <div
                  onClick={() => document.getElementById("task-file-input")?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      setTaskFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files || [])]);
                    }
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer py-5 text-xs text-muted-foreground transition-all duration-300 shadow-sm"
                >
                  <Paperclip className="h-5.5 w-5.5 text-emerald-500 mb-1.5 animate-pulse" />
                  <span className="font-medium">
                    Drag & drop files here, or{" "}
                    <span className="text-emerald-500 font-bold hover:underline">browse files</span>
                  </span>
                  <input
                    id="task-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setTaskFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                      }
                    }}
                  />
                </div>

                {/* Attachment list */}
                {taskFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {taskFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collapsible Task Information Section */}
          <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/5">
            <button
              type="button"
              onClick={() => setInfoExpanded(!infoExpanded)}
              className="flex items-center justify-between w-full p-4 font-semibold text-sm hover:bg-muted/20 transition text-left"
            >
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 text-teal-500" />
                Task Information
              </span>
              {infoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {infoExpanded && (
              <div className="p-6 pt-0 border-t border-border/40 animate-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                  
                  {/* Project */}
                  <Field label="Project *">
                    <Select value={activeProjectId} onValueChange={setProjectId} disabled={!!parentTask}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue placeholder="Select Project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Team */}
                  <Field label="Team">
                    <Select value={teamId} onValueChange={setTeamId}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Team</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Status */}
                  <Field label="Status">
                    <Select value={statusId} onValueChange={setStatusId}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                              {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Sprint/Phase */}
                  {project?.type === "SCRUM" && sprints.length > 0 && (
                    <Field label="Sprint">
                      <Select value={sprintId} onValueChange={setSprintId}>
                        <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                          <SelectValue placeholder="Select Sprint" />
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
                    </Field>
                  )}
                  {project?.type === "WATERFALL" && sprints.length > 0 && (
                    <Field label="Phase">
                      <Select value={sprintId} onValueChange={setSprintId}>
                        <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                          <SelectValue placeholder="Select Phase" />
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
                    </Field>
                  )}

                  {/* Priority */}
                  <Field label="Priority">
                    <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Work Hours */}
                  <Field label="Work Hours (h)">
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        className="h-9 text-xs pl-8 focus-visible:ring-teal-500"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        placeholder="e.g. 4.5"
                      />
                      <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                    </div>
                  </Field>

                  {/* Start Date */}
                  <Field label="Start Date">
                    <DatePicker
                      value={startDate}
                      onChange={(dateStr) => setStartDate(dateStr || "")}
                      placeholder="Start date"
                    />
                  </Field>

                  {/* Due Date */}
                  <Field label="Due Date">
                    <DatePicker
                      value={dueDate}
                      onChange={(dateStr) => setDueDate(dateStr || "")}
                      placeholder="Due date"
                    />
                  </Field>

                  {/* Billing Type */}
                  <Field label="Billing Type">
                    <Select value={billingType} onValueChange={setBillingType}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOURLY">Hourly Billing</SelectItem>
                        <SelectItem value="FIXED">Fixed Price</SelectItem>
                        <SelectItem value="NON_BILLABLE">Non-billable</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Reminder */}
                  <Field label="Reminder">
                    <Select value={reminder} onValueChange={setReminder}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Reminder</SelectItem>
                        <SelectItem value="due">At Due Time</SelectItem>
                        <SelectItem value="15m">15 Minutes Before</SelectItem>
                        <SelectItem value="1h">1 Hour Before</SelectItem>
                        <SelectItem value="1d">1 Day Before</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Category */}
                  <Field label="Category">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Recurrence */}
                  <Field label="Recurrence">
                    <Select value={recurrence} onValueChange={setRecurrence}>
                      <SelectTrigger className="h-9 text-xs focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Does Not Repeat</SelectItem>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {/* Owner / Assignees Section */}
                <div className="mt-6 space-y-2">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-teal-500" /> Assignees (Owner)
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border border-border/55 rounded-xl">
                    {filteredUsers.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        Add members to the project first
                      </span>
                    ) : (
                      filteredUsers.map((u) => {
                        const on = assignees.includes(u.id);
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => toggle(u.id)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
                              on
                                ? "border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-200"
                                : "border-border text-muted-foreground hover:border-teal-500/40 hover:bg-muted/50"
                            }`}
                          >
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="bg-muted text-[8px] font-bold">
                                {u.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {u.name}
                            {on && <X className="h-3 w-3 text-teal-500" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Tags Section */}
                <div className="mt-6 space-y-2">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-teal-500" /> Tags
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-background p-2 focus-within:border-teal-500 transition">
                    {tags.map((t, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 bg-teal-500/10 border border-teal-500/20 text-teal-900 dark:text-teal-200 text-xs py-0.5">
                        {t}
                        <button type="button" onClick={() => setTags((p) => p.filter((_, x) => x !== i))}>
                          <X className="h-3 w-3 text-teal-500 hover:text-teal-600" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Add tag and press Enter..."
                      className="min-w-[120px] flex-1 bg-transparent text-xs outline-none p-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-20 border-t border-white/10 bg-card/90 backdrop-blur px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Will be added to project <span className="font-bold text-foreground underline">{projects.find((p) => p.id === activeProjectId)?.name ?? "—"}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleCancel} className="text-xs rounded-xl">Cancel</Button>
              <Button variant="outline" onClick={() => submit("another")} disabled={create.isPending} className="text-xs rounded-xl border-border/60 hover-lift">Save & Add More</Button>
              <Button
                onClick={() => submit("save")}
                disabled={create.isPending}
                className={`text-xs font-bold rounded-xl shadow-lg px-4 py-2 hover-lift transition-all duration-300 text-white ${
                  taskType === "ISSUE"
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/10"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10"
                }`}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {create.isPending ? "Creating..." : parentTask ? "Add Subtask" : (taskType === "ISSUE" ? "Report Incident" : "Create Task")}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
      {children}
    </div>
  );
}
