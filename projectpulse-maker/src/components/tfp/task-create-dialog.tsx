import { useState, useMemo, useEffect, useRef } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useCreateTask, useProjects, useStatuses, useUsers, useTeams, useProjectMembers, useProject, useSprints, usePhases, useUploadAttachment } from "@/lib/queries";
import { Plus, Sparkles, AlertOctagon, ListChecks, Calendar, Flag, X, Paperclip, Clock, Repeat, Tag, Code, List, ListOrdered, Link2, Users } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
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
  const [teamId, setTeamId] = useState("none");
  const [statusId, setStatusId] = useState("");
  const [sprintId, setSprintId] = useState("none");
  const [phaseId, setPhaseId] = useState("none");
  const [taskType, setTaskType] = useState<Task["taskType"]>("TASK");
  const [priority, setPriority] = useState<NonNullable<Task["priority"]>>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState("none");
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state variables once data loads or changes
  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(defaultProjectId || projects[0].id);
    }
  }, [projects, projectId, defaultProjectId]);

  useEffect(() => {
    if (statuses.length > 0) {
      const def = statuses.find((s) => s.isDefault)?.id || statuses[0]?.id;
      if (def && (!statusId || !statuses.some((s) => s.id === statusId))) {
        setStatusId(def);
      }
    }
  }, [statuses, statusId]);

  useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId || projects[0]?.id || "");
      setTitle("");
      setDescription("");
      setTeamId("none");
      setSprintId("none");
      setPhaseId("none");
      setTaskType("TASK");
      setPriority("MEDIUM");
      setDueDate("");
      setEstimatedHours("");
      setAssignees([]);
      setRecurrenceRule("none");
      setCategory("none");
      setTaskFiles([]);
    }
  }, [open, defaultProjectId]);

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

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatusId(statuses.find((s) => s.isDefault)?.id || statuses[0]?.id || "s-todo");
    setSprintId("none");
    setPhaseId("none");
    setTaskType("TASK");
    setPriority("MEDIUM");
    setDueDate("");
    setEstimatedHours("");
    setAssignees([]);
    setTeamId("none");
    setRecurrenceRule("none");
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
        ...(phaseId && phaseId !== "none" ? { phaseId } as any : {}),
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
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 transition rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" /> New task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-primary/20 bg-card p-0 sm:max-w-3xl overflow-hidden rounded-2xl shadow-glow animate-in fade-in duration-200">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border-b border-border/60 px-6 py-4 flex items-center justify-between">
          <div className="space-y-1">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                {taskType === "ISSUE" ? "Initialize Incident Report" : "Create New Task Operations"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="inline-flex rounded-xl border border-border bg-background p-1 shadow-sm shrink-0">
            <button
              onClick={() => setTaskType("TASK")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${taskType === "TASK" ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ListChecks className="h-3.5 w-3.5" /> Task Flow
            </button>
            <button
              onClick={() => setTaskType("ISSUE")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${taskType === "ISSUE" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <AlertOctagon className="h-3.5 w-3.5" /> Incident Issue
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="px-6 py-5 max-h-[72vh] overflow-y-auto scrollbar-thin space-y-5">
          
          {/* Prominent Title Field (Always Visible at Top) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              {taskType === "ISSUE" ? "Incident Summary *" : "Task Title *"}
            </Label>
            <Input
              id="title"
              placeholder={
                taskType === "ISSUE" ? "Brief incident summary…" : "What needs to be done?"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-0 border-b border-border text-lg font-bold focus-visible:ring-0 focus-visible:border-primary px-0 rounded-none bg-transparent transition"
              autoFocus
            />
          </div>

          {/* Accordion Group */}
          <Accordion type="multiple" defaultValue={["info", "description", "members"]} className="w-full space-y-4">
            
            {/* Section 1: Task Information */}
            <AccordionItem value="info" className="border border-border/60 rounded-xl bg-muted/5 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/10 font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between [&[data-state=open]>svg]:rotate-180">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Task Information
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Project */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" /> Project *
                    </Label>
                    <Select value={activeProjectId} onValueChange={setProjectId}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/80">
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Team */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Users className="h-3 w-3 text-primary" /> Team
                    </Label>
                    <Select value={teamId} onValueChange={setTeamId}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/80">
                        <SelectItem value="none" className="text-xs text-muted-foreground">None</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <ListChecks className="h-3 w-3 text-primary" /> Status
                    </Label>
                    <Select value={activeStatusId} onValueChange={setStatusId}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/80">
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sprints / Phases Conditional */}
                  {((project?.type === "SCRUM" && sprints.length > 0) || (project?.type === "WATERFALL" && phases.length > 0)) && (
                    <div className="space-y-1.5">
                      {project?.type === "SCRUM" && (
                        <>
                          <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <Clock className="h-3 w-3 text-primary" /> Sprint
                          </Label>
                          <Select value={sprintId} onValueChange={setSprintId}>
                            <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                              <SelectValue placeholder="Select sprint" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/80">
                              <SelectItem value="none" className="text-xs text-muted-foreground">None</SelectItem>
                              {sprints.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                      {project?.type === "WATERFALL" && sprints.length > 0 && (
                        <>
                          <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <Clock className="h-3 w-3 text-primary" /> Phase
                          </Label>
                          <Select value={sprintId} onValueChange={setSprintId}>
                            <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                              <SelectValue placeholder="Select phase" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/80">
                              <SelectItem value="none" className="text-xs text-muted-foreground">None</SelectItem>
                              {sprints.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  )}

                  {/* Priority */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Flag className="h-3 w-3 text-primary" /> Priority
                    </Label>
                    <Select
                      value={priority}
                      onValueChange={(v) => setPriority(v as NonNullable<Task["priority"]>)}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/80">
                        <SelectItem value="LOW" className="text-xs text-blue-500 font-semibold">Low</SelectItem>
                        <SelectItem value="MEDIUM" className="text-xs text-amber-500 font-semibold">Medium</SelectItem>
                        <SelectItem value="HIGH" className="text-xs text-orange-500 font-semibold">High</SelectItem>
                        <SelectItem value="CRITICAL" className="text-xs text-red-500 font-bold">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="h-3 w-3 text-primary" /> Due Date
                    </Label>
                    <DatePicker value={dueDate} onChange={(date) => setDueDate(date || "")} />
                  </div>

                  {/* Estimate Hours */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3 w-3 text-primary" /> Estimate (h)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-center"
                      placeholder="0.0"
                    />
                  </div>

                  {/* Recurrence */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Repeat className="h-3 w-3 text-primary" /> Recurrence
                    </Label>
                    <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                        <SelectValue placeholder="Does not repeat" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/80">
                        <SelectItem value="none" className="text-xs text-muted-foreground">Does not repeat</SelectItem>
                        <SelectItem value="WEEKLY" className="text-xs">Weekly</SelectItem>
                        <SelectItem value="MONTHLY" className="text-xs">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Tag className="h-3 w-3 text-primary" /> Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/60 focus:ring-primary focus:border-primary">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/80">
                        <SelectItem value="none" className="text-xs text-muted-foreground">No Category</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                        <div className="p-1 border-t border-border mt-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start text-[10px] h-7 text-primary hover:text-primary-foreground hover:bg-primary rounded-lg"
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
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Task Description & Attachments */}
            <AccordionItem value="description" className="border border-border/60 rounded-xl bg-muted/5 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/10 font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between [&[data-state=open]>svg]:rotate-180">
                <span className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Task Description & Attachments
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                
                {/* Description details */}
                <div className="space-y-3">
                  {/* Formatting Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/40">
                    <button
                      type="button"
                      title="Bold"
                      onClick={() => insertMarkdown("**", "**")}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition text-xs font-bold px-2"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      title="Italic"
                      onClick={() => insertMarkdown("*", "*")}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition text-xs italic px-2"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      title="Underline"
                      onClick={() => insertMarkdown("<u>", "</u>")}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition text-xs underline px-2"
                    >
                      U
                    </button>
                    <div className="w-px h-4 bg-border mx-1" />
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
                      title="Link"
                      onClick={() => insertMarkdown("[", "](url)")}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Textarea
                    ref={textareaRef}
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
                    className="text-xs bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary rounded-xl"
                  />
                </div>

                {/* Attachments Dropzone */}
                <div className="space-y-2">
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
                    className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-background hover:bg-primary/5 hover:border-primary/40 cursor-pointer py-4 text-xs text-muted-foreground transition duration-300 shadow-sm"
                  >
                    <Paperclip className="h-6 w-6 text-primary mb-1.5 animate-pulse" />
                    <span>Drag & drop files here, or <span className="text-primary font-bold hover:underline">browse</span></span>
                    <input
                      id="dialog-task-file-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          setTaskFiles((prev) => [...prev, ...Array.from(files)]);
                        }
                      }}
                    />
                  </div>
                  {taskFiles.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {taskFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-semibold">{file.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5.5 w-5.5 text-muted-foreground hover:text-destructive hover:bg-transparent"
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
              </AccordionContent>
            </AccordionItem>

            {/* Section 3: Member Selection */}
            <AccordionItem value="members" className="border border-border/60 rounded-xl bg-muted/5 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/10 font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between [&[data-state=open]>svg]:rotate-180">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Member Selection
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/5 p-3">
                  {filteredUsers.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">No members found in this project.</span>
                  ) : (
                    filteredUsers.map((u) => {
                      const on = assignees.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleAssignee(u.id)}
                          className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-300 ${on ? "border-primary bg-primary/10 text-foreground font-semibold" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                        >
                          <Avatar className="h-4.5 w-4.5">
                            <AvatarFallback className="bg-muted-foreground/15 text-[8px] font-bold text-foreground">
                              {u.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{u.name}</span>
                          {on && <X className="h-3 w-3 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

        </div>

        {/* Footer Actions */}
        <DialogFooter className="border-t border-border bg-muted/10 px-6 py-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl border border-border/80">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={create.isPending}
            className="bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition rounded-xl"
          >
            {create.isPending
              ? "Creating…"
              : `Create ${taskType === "ISSUE" ? "Incident" : "Task"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
