import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateProject, useCreateSprint, useCreateTask, useUsers, useAddProjectMember, useTeams, useUploadProjectAttachment, useAddProjectTeam } from "@/lib/queries";
import { tokenStore, apiRequest } from "@/lib/api";
import { Plus, Trash2, Calendar, ArrowLeft, Layers, CheckSquare, Save, User, Clock, AlertCircle, Settings, Check, UploadCloud, X, FileText, Paperclip } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { mockAttachments } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/projects/new")({
  head: () => ({ meta: [{ title: "Create Project — TaskFlow Pro" }] }),
  component: CreateProjectPage,
});

interface TaskBlueprint {
  tempId: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeId: string;
  estimatedHours: number;
  dueDate: string;
}

interface PhaseBlueprint {
  tempId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  tasks: TaskBlueprint[];
  estimatedHours: number;
}

function humanSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function CreateProjectPage() {
  const navigate = useNavigate();
  const { data: users = [] } = useUsers();
  const { data: teams = [] } = useTeams();
  
  const createProject = useCreateProject();
  const createSprint = useCreateSprint();
  const createTask = useCreateTask();
  const addProjectMember = useAddProjectMember();
  const uploadProjectAttachment = useUploadProjectAttachment();
  const addProjectTeam = useAddProjectTeam();

  // Project Owner and Teams State
  const [ownerId, setOwnerId] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Project General Details State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"KANBAN" | "SCRUM" | "WATERFALL">("KANBAN");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [estimatedHours, setEstimatedHours] = useState<number>(100);

  // Staged Project Files State
  const [projectFiles, setProjectFiles] = useState<Array<{
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
  }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addStagedFiles(e.target.files);
    }
  };

  const addStagedFiles = (files: FileList) => {
    const newFiles = Array.from(files).map(file => ({
      id: `staged-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setProjectFiles(prev => [...prev, ...newFiles]);
    toast.success(`Staged ${newFiles.length} file(s)`);
  };

  const handleRemoveStagedFile = (id: string) => {
    setProjectFiles(prev => prev.filter(f => f.id !== id));
  };

  // Phase and Task blueprints state
  const [phases, setPhases] = useState<PhaseBlueprint[]>([]);

  // Add Phase Handler
  const handleAddPhase = () => {
    const nextIndex = phases.length + 1;
    setPhases([
      ...phases,
      {
        tempId: `phase-${Date.now()}-${Math.random()}`,
        name: `Phase ${nextIndex}: Milestone Objectives`,
        goal: "",
        startDate: startDate,
        endDate: format(addDays(new Date(startDate), 14), "yyyy-MM-dd"),
        tasks: [],
        estimatedHours: 20,
      }
    ]);
  };

  // Delete Phase Handler
  const handleDeletePhase = (phaseTempId: string) => {
    setPhases(phases.filter(p => p.tempId !== phaseTempId));
  };

  // Add Task to Phase Handler
  const handleAddTask = (phaseTempId: string) => {
    const phase = phases.find(p => p.tempId === phaseTempId);
    if (!phase) return;

    setPhases(phases.map(p => {
      if (p.tempId !== phaseTempId) return p;
      return {
        ...p,
        tasks: [
          ...p.tasks,
          {
            tempId: `task-${Date.now()}-${Math.random()}`,
            title: "Task Title",
            description: "",
            priority: "MEDIUM",
            assigneeId: "",
            estimatedHours: 4,
            dueDate: p.endDate,
          }
        ]
      };
    }));
  };

  // Delete Task Handler
  const handleDeleteTask = (phaseTempId: string, taskTempId: string) => {
    setPhases(phases.map(p => {
      if (p.tempId !== phaseTempId) return p;
      return {
        ...p,
        tasks: p.tasks.filter(t => t.tempId !== taskTempId)
      };
    }));
  };

  // Update Phase Handler
  const handleUpdatePhase = (phaseTempId: string, fields: Partial<PhaseBlueprint>) => {
    setPhases(phases.map(p => {
      if (p.tempId !== phaseTempId) return p;
      return { ...p, ...fields };
    }));
  };

  // Update Task Handler
  const handleUpdateTask = (phaseTempId: string, taskTempId: string, fields: Partial<TaskBlueprint>) => {
    setPhases(phases.map(p => {
      if (p.tempId !== phaseTempId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.tempId !== taskTempId) return t;
          return { ...t, ...fields };
        })
      };
    }));
  };

  // Form submission handler
  const handleSaveProject = async () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    const loadId = toast.loading("Configuring project timeline and blueprint...");
    try {
      // 1. Create project
      const proj = await createProject.mutateAsync({
        name,
        description,
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: "ACTIVE",
        progress: 0,
        estimatedHours,
      });

      // Collect unique assignee IDs (excluding empty ones and the current user who is auto-owner)
      const currentUser = tokenStore.getUser<{ id: string }>();
      const currentUserId = currentUser?.id;
      const assigneeIdsToAdd = new Set<string>();
      for (const phase of phases) {
        for (const t of phase.tasks) {
          if (t.assigneeId && t.assigneeId !== currentUserId) {
            assigneeIdsToAdd.add(t.assigneeId);
          }
        }
      }

      // Add Project Owner if specified
      if (ownerId && ownerId !== currentUserId) {
        await addProjectMember.mutateAsync({
          projectId: proj.id,
          userId: ownerId,
          role: "PROJECT_OWNER",
        });
      }

      // Add Associated Teams and Team Members of selected teams
      for (const teamId of selectedTeamIds) {
        try {
          await addProjectTeam.mutateAsync({ projectId: proj.id, teamId });
          const teamMembers = await apiRequest<any[]>(`/teams/${teamId}/members`);
          for (const tm of teamMembers) {
            if (tm.userId && tm.userId !== ownerId && tm.userId !== currentUserId) {
              assigneeIdsToAdd.add(tm.userId);
            }
          }
        } catch (teamErr) {
          console.error("Failed to associate team or add members", teamId, teamErr);
        }
      }

      for (const userId of assigneeIdsToAdd) {
        await addProjectMember.mutateAsync({
          projectId: proj.id,
          userId,
          role: "PROJECT_MEMBER",
        });
      }

      // Save staged project files to project attachments
      for (const fileObj of projectFiles) {
        try {
          await uploadProjectAttachment.mutateAsync({
            projectId: proj.id,
            file: fileObj.file
          });
        } catch (uploadErr) {
          console.error("Failed to upload project document", fileObj.name, uploadErr);
        }
      }

      // 2. Loop through phases
      for (const phase of phases) {
        const createdTaskIds: string[] = [];

        // Create tasks inside this phase
        for (const t of phase.tasks) {
          const createdTask = await createTask.mutateAsync({
            title: t.title,
            description: t.description || `Task scoped under ${phase.name}`,
            projectId: proj.id,
            statusId: "s-todo",
            taskType: "TASK",
            priority: t.priority,
            dueDate: new Date(t.dueDate).toISOString(),
            assigneeIds: t.assigneeId ? [t.assigneeId] : [],
            estimatedHours: t.estimatedHours,
          });
          createdTaskIds.push(createdTask.id);
        }

        // Create Sprint (Phase/Milestone)
        await createSprint.mutateAsync({
          projectId: proj.id,
          name: phase.name,
          goal: phase.goal || `Blueprint deliverables for ${phase.name}`,
          startDate: new Date(phase.startDate).toISOString(),
          endDate: new Date(phase.endDate).toISOString(),
          status: "PLANNED",
          taskIds: createdTaskIds,
          estimatedHours: phase.estimatedHours,
        });
      }

      toast.success("Project blueprint created and scheduled successfully!", { id: loadId });
      navigate({ to: "/projects" });
    } catch (err) {
      toast.error("Failed to save blueprint: " + (err instanceof Error ? err.message : String(err)), { id: loadId });
    }
  };

  // Stats calculation
  const totalPhases = phases.length;
  const totalTasks = phases.reduce((acc, p) => acc + p.tasks.length, 0);
  const totalHours = phases.reduce((acc, p) => acc + p.tasks.reduce((sum, t) => sum + t.estimatedHours, 0), 0);

  return (
    <>
      <Topbar title="Create Detailed Project" />
      <main className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto text-xs">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
          </Link>
          
          <Button 
            onClick={handleSaveProject} 
            className="bg-gradient-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-glow transition-all gap-1.5"
          >
            <Save className="h-4 w-4" /> Save Project Blueprint
          </Button>
        </div>

        {/* Info Grid (Sticky stats / counts) */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/10 hover:border-primary/20 transition-all flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Phases / Milestones</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{totalPhases}</p>
            </div>
          </Card>
          <Card className="p-4 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/10 hover:border-primary/20 transition-all flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-primary" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Task Count</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{totalTasks}</p>
            </div>
          </Card>
          <Card className="p-4 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/10 hover:border-primary/20 transition-all flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Estimated Allocation</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{totalHours} Hours</p>
            </div>
          </Card>
          <Card className="p-4 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/10 hover:border-primary/20 transition-all flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Project Timeline</span>
              <p className="text-[11px] font-bold text-foreground mt-0.5">
                {startDate ? format(new Date(startDate), "MMM d") : "Start"} → {endDate ? format(new Date(endDate), "MMM d, yyyy") : "End"}
              </p>
            </div>
          </Card>
        </div>

        {/* Two-Column Creator layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Section: Phase Blueprint Creator */}
          <div className="space-y-6 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Project Milestones & Phase Scaffolding
              </h2>
              <Button size="sm" onClick={handleAddPhase} variant="outline" className="border-dashed hover:border-primary/50 text-xs rounded-xl gap-1">
                <Plus className="h-4 w-4" /> Add Phase
              </Button>
            </div>

            {phases.length === 0 ? (
              <Card className="p-12 text-center text-xs text-muted-foreground rounded-2xl border-dashed bg-card/45 border-white/15 backdrop-blur-sm shadow-md">
                No phases defined yet. Start planning by clicking the "+ Add Phase" button.
              </Card>
            ) : (
              <div className="space-y-6">
                {phases.map((phase, pIdx) => {
                  const hasTasks = phase.tasks.length > 0;
                  
                  return (
                    <Card key={phase.tempId} className="border border-white/10 shadow-xl shadow-indigo-500/5 rounded-2xl p-5 bg-card/55 backdrop-blur-md space-y-4 relative group hover:border-primary/25 transition-all">
                      {/* Phase Header Controls */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-3">
                        <div className="flex-1 min-w-0">
                          <Input 
                            value={phase.name} 
                            onChange={(e) => handleUpdatePhase(phase.tempId, { name: e.target.value })}
                            className="text-sm font-bold text-foreground border-transparent hover:border-border/60 bg-transparent px-2 h-8 rounded-lg focus-visible:ring-primary focus-visible:bg-card w-full max-w-lg"
                            placeholder="Phase Title"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-semibold">Hours:</span>
                            <Input 
                              type="number"
                              value={phase.estimatedHours || 0}
                              onChange={(e) => handleUpdatePhase(phase.tempId, { estimatedHours: Number(e.target.value) })}
                              className="h-7 w-[60px] text-[10px] px-2 rounded-lg bg-transparent border-border/60 text-center font-bold"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-semibold">Start:</span>
                            <Input 
                              type="date"
                              value={phase.startDate}
                              onChange={(e) => handleUpdatePhase(phase.tempId, { startDate: e.target.value })}
                              className="h-7 w-[125px] text-[10px] px-2 rounded-lg bg-transparent border-border/60 font-semibold"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-semibold">End:</span>
                            <Input 
                              type="date"
                              value={phase.endDate}
                              onChange={(e) => handleUpdatePhase(phase.tempId, { endDate: e.target.value })}
                              className="h-7 w-[125px] text-[10px] px-2 rounded-lg bg-transparent border-border/60 font-semibold"
                            />
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 hover:bg-destructive/15 hover:text-destructive text-muted-foreground rounded-lg transition-colors"
                            onClick={() => handleDeletePhase(phase.tempId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Phase Goal/Goal description */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Phase Deliverables Goal</Label>
                        <Textarea 
                          placeholder="Describe the milestone objective or goal for this phase..." 
                          value={phase.goal}
                          onChange={(e) => handleUpdatePhase(phase.tempId, { goal: e.target.value })}
                          className="text-xs h-14 rounded-xl resize-none bg-background/40"
                        />
                      </div>

                      {/* Phase Tasks Scaffolder */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                            <CheckSquare className="h-3.5 w-3.5 text-primary" /> Phase Tasks Blueprint ({phase.tasks.length})
                          </h4>
                          <Button size="sm" onClick={() => handleAddTask(phase.tempId)} variant="outline" className="h-7 text-[10px] px-2 rounded-lg border-dashed text-primary border-primary/20 hover:bg-primary/5">
                            <Plus className="h-3 w-3 mr-1" /> Add Task Blueprint
                          </Button>
                        </div>

                        {phase.tasks.length === 0 ? (
                          <div className="text-center py-4 bg-muted/20 border border-border/40 rounded-xl text-muted-foreground italic text-[10px]">
                            No tasks created for this phase. Add tasks inline to pre-populate.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {phase.tasks.map((task, tIdx) => (
                              <div key={task.tempId} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-card/75 border border-white/10 p-3 rounded-xl hover:border-primary/30 transition-all shadow-sm">
                                {/* Title Input */}
                                <div className="md:col-span-4 space-y-1">
                                  <Input 
                                    value={task.title}
                                    onChange={(e) => handleUpdateTask(phase.tempId, task.tempId, { title: e.target.value })}
                                    className="h-8 text-xs font-semibold px-2 rounded-lg bg-background/50"
                                    placeholder="Task Title"
                                  />
                                </div>

                                {/* Assignee Select */}
                                <div className="md:col-span-3">
                                  <Select
                                    value={task.assigneeId || "_none"}
                                    onValueChange={(val) => handleUpdateTask(phase.tempId, task.tempId, { assigneeId: val === "_none" ? "" : val })}
                                  >
                                    <SelectTrigger className="h-8 text-xs px-2.5 rounded-lg border-border/60 bg-background/50">
                                      <span className="inline-flex items-center gap-1.5 truncate">
                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="Assignee" />
                                      </span>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="_none">Unassigned</SelectItem>
                                      {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Priority Selector */}
                                <div className="md:col-span-2">
                                  <Select
                                    value={task.priority}
                                    onValueChange={(val) => handleUpdateTask(phase.tempId, task.tempId, { priority: val as any })}
                                  >
                                    <SelectTrigger className="h-8 text-[10px] font-bold px-2 rounded-lg border-border/60 bg-background/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(prio => (
                                        <SelectItem key={prio} value={prio} className="text-[10px] font-bold">
                                          {prio}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Est Hours input */}
                                <div className="md:col-span-1.5 flex items-center gap-1">
                                  <Input 
                                    type="number"
                                    min="0"
                                    value={task.estimatedHours || ""}
                                    onChange={(e) => handleUpdateTask(phase.tempId, task.tempId, { estimatedHours: Number(e.target.value) })}
                                    className="h-8 text-xs px-2 rounded-lg text-center bg-background/50 font-semibold"
                                    placeholder="Est h"
                                  />
                                </div>

                                {/* Remove Task */}
                                <div className="md:col-span-1.5 flex items-center justify-end gap-1.5">
                                  <Input 
                                    type="date"
                                    value={task.dueDate}
                                    onChange={(e) => handleUpdateTask(phase.tempId, task.tempId, { dueDate: e.target.value })}
                                    className="h-8 text-[9px] px-1 rounded-lg w-[90px] bg-background/50"
                                  />
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 hover:bg-destructive/15 hover:text-destructive rounded-lg text-muted-foreground"
                                    onClick={() => handleDeleteTask(phase.tempId, task.tempId)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Section: Project Metadata Scaffolding & Documents */}
          <div className="space-y-6 lg:col-span-4">
            <div className="border-b border-border/50 pb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Configurations & Assets
              </h2>
            </div>

            <Card className="p-5 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl space-y-4 shadow-xl shadow-indigo-500/5 hover:border-primary/20 transition-all">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Project Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Ingress Controller Migration"
                  className="text-xs h-9 rounded-xl focus-visible:ring-primary font-semibold bg-background/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Project Owner</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-border/60 bg-background/40">
                    <SelectValue placeholder="Select Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Associated Teams</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-border/60 bg-background/40 rounded-xl p-3">
                  {teams.map((t) => {
                    const isSelected = selectedTeamIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTeamIds(selectedTeamIds.filter((id) => id !== t.id));
                          } else {
                            setSelectedTeamIds([...selectedTeamIds, t.id]);
                          }
                        }}
                        className={`flex items-center justify-between text-left p-2 rounded-lg border text-[10px] font-semibold transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Project Description</Label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Set up a new workspace for tracking and incidents..."
                  className="text-xs h-24 rounded-xl resize-none bg-background/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Methodology Type</Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as any)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl border-border/60 bg-background/40">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KANBAN">Kanban Board (Agile Flow)</SelectItem>
                    <SelectItem value="SCRUM">Scrum Framework (Sprints)</SelectItem>
                    <SelectItem value="WATERFALL">Waterfall Model (Phased)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Total Project Hours</Label>
                <Input 
                  type="number"
                  value={estimatedHours || ""} 
                  onChange={(e) => setEstimatedHours(Number(e.target.value))} 
                  placeholder="e.g. 100"
                  className="text-xs h-9 rounded-xl focus-visible:ring-primary font-semibold bg-background/40"
                />
              </div>

              <Separator className="bg-border/40" />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="text-xs h-9 rounded-xl pr-2 bg-background/40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">End Date</Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="text-xs h-9 rounded-xl pr-2 bg-background/40"
                    />
                  </div>
                </div>
              </div>

              {/* Budget Allocation Status alerts */}
              {(() => {
                const totalPhasesHours = phases.reduce((sum, p) => sum + (p.estimatedHours || 0), 0);
                if (totalPhasesHours > estimatedHours) {
                  return (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex gap-2 text-[10px] text-destructive leading-relaxed">
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive animate-bounce" />
                      <div>
                        <span className="font-bold">Budget warning:</span> Allocated phase hours ({totalPhasesHours}h) exceed the total project estimated hours ({estimatedHours}h).
                      </div>
                    </div>
                  );
                } else if (totalPhasesHours < estimatedHours) {
                  return (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex gap-2 text-[10px] text-primary leading-relaxed">
                      <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <span className="font-semibold">Unallocated Budget:</span> {estimatedHours - totalPhasesHours} hours remaining.
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 flex gap-2 text-[10px] text-green-600 leading-relaxed">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      <div>
                        <span className="font-semibold">Budget Matched:</span> All {estimatedHours} hours fully allocated across milestones.
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Timeline Alignment Helper warning */}
              {phases.some(p => p.startDate < startDate || p.endDate > endDate) && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2 text-[10px] text-amber-600 leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <span className="font-bold">Timeline warning:</span> One or more milestone phases have dates scheduled outside of the project's base timeline boundaries.
                  </div>
                </div>
              )}
            </Card>

            {/* Project Documents & Staged Upload Panel */}
            <Card className="p-5 border border-white/10 bg-card/65 backdrop-blur-md rounded-2xl space-y-4 shadow-xl shadow-indigo-500/5 hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-primary" /> Project Attachments & Documents
                </h3>
                {projectFiles.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                    {projectFiles.length} staged
                  </Badge>
                )}
              </div>

              {/* Drag & Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) {
                    addStagedFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-primary bg-primary/10 scale-[0.98]"
                    : "border-border/60 hover:border-primary/45 bg-muted/20 hover:bg-muted/30"
                }`}
              >
                <UploadCloud className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">Drag & drop files here</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">or click to browse local files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* List of staged files */}
              {projectFiles.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {projectFiles.map((fileObj) => (
                    <div
                      key={fileObj.id}
                      className="flex items-center justify-between gap-2 bg-background/50 border border-white/5 p-2 rounded-xl text-[10px] hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[170px]" title={fileObj.name}>
                            {fileObj.name}
                          </p>
                          <p className="text-[9px] text-muted-foreground">{humanSize(fileObj.size)}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStagedFile(fileObj.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-[10px] text-right text-muted-foreground font-semibold pt-1.5 border-t border-border/20">
                    Total: {humanSize(projectFiles.reduce((sum, f) => sum + f.size, 0))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-muted/10 border border-border/30 rounded-xl text-muted-foreground text-[10px] italic">
                  No documents staged. Staged documents will upload as project-level assets.
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
