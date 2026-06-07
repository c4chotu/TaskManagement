import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAutomations,
  useCreateRoutingRule,
  useDepartments,
  useRoutingRules,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
  useUsers,
  useProjects,
  useTasks,
  useIssues,
  useStatuses,
  useCreateAutomation,
  useUpdateAutomation,
  useToggleAutomation,
  useDeleteAutomation,
  useAutomationRuleTypes,
} from "@/lib/queries";
import { Workflow, Route as RouteIcon, Zap, Plus, Trash2, AlertTriangle, ShieldAlert, CheckCircle2, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { RoleName, TaskType } from "@/lib/types";
import { findUser } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/automations")({
  head: () => ({ meta: [{ title: "Automations — TaskFlow Pro" }] }),
  component: AutomationsPage,
});

const PROJECT_DEPT_MAP: Record<string, string> = {
  "p-ingress": "d-plat",
  "p-billing": "d-prod",
  "p-mobile": "d-prod",
  "p-design": "d-design"
};

function AutomationsPage() {
  const { data: rules = [] } = useRoutingRules();
  const { data: workflows = [] } = useAutomations();
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useUsers();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();
  const { data: statuses = [] } = useStatuses();
  const { data: ruleTypes = [] } = useAutomationRuleTypes();

  // Group rule types by category for the trigger dropdown
  const ruleTypesByCategory = useMemo(() => {
    return ruleTypes.reduce<Record<string, typeof ruleTypes>>((acc, rt) => {
      if (!acc[rt.category]) acc[rt.category] = [];
      acc[rt.category].push(rt);
      return acc;
    }, {});
  }, [ruleTypes]);

  const updateRule = useUpdateRoutingRule();
  const deleteRule = useDeleteRoutingRule();
  
  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();
  const toggleAutomation = useToggleAutomation();
  const deleteAutomation = useDeleteAutomation();

  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any | null>(null);

  const [autoName, setAutoName] = useState("");
  const [autoDesc, setAutoDesc] = useState("");
  const [autoTrigger, setAutoTrigger] = useState("TASK_CREATED");
  const [autoProject, setAutoProject] = useState("");
  
  // Single Condition
  const [autoCondField, setAutoCondField] = useState("statusId");
  const [autoCondOp, setAutoCondOp] = useState("EQUALS");
  const [autoCondVal, setAutoCondVal] = useState("");

  // Single Action
  const [autoActType, setAutoActType] = useState("ASSIGN_USER");
  const [autoActUser, setAutoActUser] = useState("");
  const [autoActStatus, setAutoActStatus] = useState("");
  const [autoActOffset, setAutoActOffset] = useState("3");

  const handleOpenCreateAutomation = () => {
    setEditingAutomation(null);
    setAutoName("");
    setAutoDesc("");
    setAutoTrigger("TASK_CREATED");
    setAutoProject(projects[0]?.id || "");
    setAutoCondField("statusId");
    setAutoCondOp("EQUALS");
    setAutoCondVal(statuses[0]?.id || "");
    setAutoActType("ASSIGN_USER");
    setAutoActUser(users[0]?.id || "");
    setAutoActStatus(statuses[0]?.id || "");
    setAutoActOffset("3");
    setAutomationDialogOpen(true);
  };

  const handleOpenEditAutomation = (w: any) => {
    setEditingAutomation(w);
    setAutoName(w.name || "");
    setAutoDesc(w.description || "");
    setAutoTrigger(w.triggerType || "TASK_CREATED");
    setAutoProject(w.projectId || "");
    
    // Parse condition
    if (w.conditions && w.conditions.length > 0) {
      setAutoCondField(w.conditions[0].fieldName || "statusId");
      setAutoCondOp(w.conditions[0].operator || "EQUALS");
      setAutoCondVal(w.conditions[0].fieldValue || "");
    } else {
      setAutoCondField("statusId");
      setAutoCondOp("EQUALS");
      setAutoCondVal("");
    }

    // Parse action
    if (w.actions && w.actions.length > 0) {
      const act = w.actions[0];
      setAutoActType(act.actionType || "ASSIGN_USER");
      const cfg = act.actionConfig || {};
      if (act.actionType === "ASSIGN_USER") {
        setAutoActUser(cfg.userId || "");
      } else if (act.actionType === "CHANGE_STATUS") {
        setAutoActStatus(cfg.statusId || cfg.targetStatusId || "");
      } else if (act.actionType === "SET_DUE_DATE_OFFSET") {
        setAutoActOffset(String(cfg.daysOffset || cfg.offsetDays || "3"));
      }
    } else {
      setAutoActType("ASSIGN_USER");
      setAutoActUser("");
      setAutoActStatus("");
      setAutoActOffset("3");
    }
    setAutomationDialogOpen(true);
  };

  const handleSaveAutomation = async () => {
    if (!autoName.trim()) {
      toast.error("Rule name is required");
      return;
    }
    const conds = autoCondVal ? [{ fieldName: autoCondField, operator: autoCondOp, fieldValue: autoCondVal }] : [];
    const actConfig: any = {};
    if (autoActType === "ASSIGN_USER") actConfig.userId = autoActUser;
    else if (autoActType === "CHANGE_STATUS") actConfig.statusId = autoActStatus;
    else if (autoActType === "SET_DUE_DATE_OFFSET") actConfig.daysOffset = Number(autoActOffset);

    const actions = [{ actionType: autoActType, actionConfig: actConfig }];

    try {
      if (editingAutomation) {
        await updateAutomation.mutateAsync({
          id: editingAutomation.id,
          projectId: autoProject || undefined,
          name: autoName,
          description: autoDesc,
          triggerType: autoTrigger,
          conditions: conds,
          actions,
        });
        toast.success("Automation updated successfully");
      } else {
        await createAutomation.mutateAsync({
          projectId: autoProject || undefined,
          name: autoName,
          description: autoDesc,
          triggerType: autoTrigger,
          conditions: conds,
          actions,
        });
        toast.success("Automation created successfully");
      }
      setAutomationDialogOpen(false);
    } catch (err) {
      toast.error("Failed to save automation");
    }
  };

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAutomationsRoot = pathname === "/automations";

  // Department filter (simulate Team Lead / Admin role scope)
  const [selectedDeptId, setSelectedDeptId] = useState<string>("d-prod"); // Default to Product Eng.

  if (!isAutomationsRoot) {
    return <Outlet />;
  }

  // Parse visual rule details
  const parsedRules = useMemo(() => {
    return rules.map(rule => {
      // Check if rule contains parser tags
      const hasTags = rule.ruleName.includes("[WHEN:");
      if (hasTags) {
        const whenMatch = rule.ruleName.match(/\[WHEN:\s*([^\]]+)\]/);
        const ifMatch = rule.ruleName.match(/\[IF:\s*([^\]]+)\]/);
        const thenMatch = rule.ruleName.match(/\[THEN:\s*([^\]]+)\]/);
        const cleanName = rule.ruleName.replace(/\[[^\]]+\]/g, "").trim() || "Dynamic Routing Rule";
        
        return {
          ...rule,
          displayName: cleanName,
          whenText: whenMatch ? whenMatch[1] : "Task Created",
          ifText: ifMatch ? ifMatch[1] : `Type is ${rule.taskType}`,
          thenText: thenMatch ? thenMatch[1] : `Auto-Route ${rule.assignmentStrategy}`,
        };
      }

      // Default fallback formatting
      return {
        ...rule,
        displayName: rule.ruleName,
        whenText: "Task Created",
        ifText: `Type is ${rule.taskType}${rule.targetDepartmentId ? ` and Dept is ${departments.find(d => d.id === rule.targetDepartmentId)?.name || rule.targetDepartmentId}` : ""}`,
        thenText: `Route ${rule.assignmentStrategy} to ${rule.assignToRole?.replace(/_/g, " ") || "Resource"}`,
      };
    });
  }, [rules, departments]);

  // Filtered rules for current department
  const departmentRules = useMemo(() => {
    return parsedRules.filter(r => !r.targetDepartmentId || r.targetDepartmentId === selectedDeptId);
  }, [parsedRules, selectedDeptId]);

  // Priority pipeline & SLA breaches for department
  const deptTasks = useMemo(() => {
    return tasks.filter(t => PROJECT_DEPT_MAP[t.projectId] === selectedDeptId);
  }, [tasks, selectedDeptId]);

  const priorityTasks = useMemo(() => {
    return deptTasks
      .filter(t => (t.priority === "CRITICAL" || t.priority === "HIGH") && t.statusId !== "s-done")
      .slice(0, 5);
  }, [deptTasks]);

  const deptSlaBreaches = useMemo(() => {
    const deptTaskIds = new Set(deptTasks.map(t => t.id));
    return issues.filter(issue => deptTaskIds.has(issue.taskId) && issue.slaBreached && !issue.resolved);
  }, [issues, deptTasks]);

  return (
    <>
      <Topbar title="Automations" />
      <main className="flex-1 space-y-6 p-6 max-w-7xl mx-auto relative overflow-hidden">
        {/* Background watermark */}
        <div className="absolute top-20 right-10 pointer-events-none select-none z-0">
          <Zap className="h-[380px] w-[380px] text-primary/3 -rotate-12 stroke-[0.5]" />
        </div>

        {/* Hero banner */}
        <div className="relative z-10 overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-tr from-violet-600/10 via-indigo-600/5 to-transparent p-6 shadow-md backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
                <Zap className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Workflow Automation</h1>
            </div>
            <p className="text-sm text-muted-foreground">Define trigger rules to automate task assignment, SLA enforcement, and workflow handoffs.</p>
            <div className="flex gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-violet-500" /> {departmentRules.length} active rules</span>
              <span className="flex items-center gap-1"><Workflow className="h-3.5 w-3.5 text-indigo-500" /> {workflows.length} automations</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scope:</Label>
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-52 h-9 text-xs">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" asChild className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl gap-1">
              <Link to="/automations/new">
                <Plus className="mr-1.5 h-4 w-4" /> Create Rule
              </Link>
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="relative z-10 grid gap-6 lg:grid-cols-3">
          
          {/* LEFT COLUMN: Rule Builder & Visual Roster */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Rules Cards Listing */}
            <Card className="glass-card-green p-6 space-y-4 shadow-[0_0_24px_rgba(16,185,129,0.08)]">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-5 w-5 text-violet-500" />
                  <h3 className="font-semibold text-base">Active Routing Rules</h3>
                </div>
                <Badge variant="outline" className="text-xs font-mono border-violet-500/30 text-violet-600">{departmentRules.length} rules active</Badge>
              </div>

              <div className="space-y-4">
                {departmentRules.length ? departmentRules.map((rule) => (
                  <Card key={rule.id} className={`p-4 border transition shadow-sm hover:shadow-[0_0_16px_rgba(16,185,129,0.1)] ${rule.enabled ? "border-emerald-500/20 bg-card" : "border-dashed border-border/60 bg-muted/10 opacity-70"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground">{rule.displayName}</p>
                          <Badge variant="secondary" className="text-[9px] uppercase border-border/80">
                            Priority {rule.priority}
                          </Badge>
                        </div>

                        {/* Visual Node Connection Bar */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-blue-700 dark:text-blue-300">WHEN</span>
                          <span className="text-xs font-medium text-foreground/80">{rule.whenText}</span>
                          <span className="text-muted-foreground text-xs font-bold">→</span>

                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">IF</span>
                          {rule.triggerCondition?.conditions?.length ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {rule.triggerCondition.conditions.map((cond: any, cIdx: number) => {
                                let valLabel = cond.value;
                                if (cond.field === "statusId") valLabel = statuses.find((s) => s.id === cond.value)?.name || cond.value;
                                else if (cond.field === "projectId") valLabel = projects.find((p) => p.id === cond.value)?.name || cond.value;
                                else if (cond.field === "departmentId") valLabel = departments.find((d) => d.id === cond.value)?.name || cond.value;
                                
                                return (
                                  <span key={cIdx} className="rounded bg-muted px-2 py-0.5 text-[11px] text-foreground/80 font-medium">
                                    <span className="text-muted-foreground uppercase text-[9px] font-bold mr-1">{cond.field.replace(/([A-Z])/g, " $1")}</span>
                                    {cond.operator} <span className="font-semibold text-primary">{valLabel}</span>
                                    {cIdx < rule.triggerCondition.conditions.length - 1 && <span className="ml-1.5 text-muted-foreground font-bold">AND</span>}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-foreground/80">{rule.ifText}</span>
                          )}
                          <span className="text-muted-foreground text-xs font-bold">→</span>

                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300">THEN</span>
                          <span className="text-xs font-semibold text-foreground">{rule.thenText}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-semibold">{rule.enabled ? "ACTIVE" : "PAUSED"}</span>
                          <Switch checked={rule.enabled} onCheckedChange={async (checked) => {
                            try {
                              await updateRule.mutateAsync({ id: rule.id, rule: { enabled: checked } });
                              toast.success("Rule toggled");
                            } catch {
                              toast.error("Unable to update rule");
                            }
                          }} />
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={async () => {
                          try {
                            await deleteRule.mutateAsync(rule.id);
                            toast.success("Rule removed");
                          } catch {
                            toast.error("Unable to delete rule");
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )) : (
                  <p className="text-sm text-muted-foreground italic text-center py-8">No routing rules configured for this department.</p>
                )}
              </div>
            </Card>

            {/* Default Workflow Automations (Status-change listeners) */}
            <Card className="glass-card-green p-6 space-y-4 shadow-[0_0_24px_rgba(16,185,129,0.08)]">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-semibold text-base">Standard Workflow Automations</h3>
                </div>
                <Button size="sm" onClick={handleOpenCreateAutomation} className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Standard Automation
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {workflows.map((w) => (
                  <Card key={w.id} className="p-4 border border-border/50 bg-card/80 backdrop-blur-sm space-y-2 hover:shadow-[0_0_16px_rgba(99,102,241,0.1)] transition-all">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-foreground">{w.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">{w.enabled ? "ACTIVE" : "PAUSED"}</span>
                        <Switch checked={w.enabled} onCheckedChange={async (checked) => {
                          try {
                            await toggleAutomation.mutateAsync(w.id);
                            toast.success("Automation toggled");
                          } catch {
                            toast.error("Unable to toggle automation");
                          }
                        }} />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{w.description}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 w-fit">
                        <Sparkles className="h-3 w-3" /> Trigger: {w.triggerType}
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-primary" onClick={() => handleOpenEditAutomation(w)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={async () => {
                        if (confirm("Are you sure you want to delete this automation rule?")) {
                          try {
                            await deleteAutomation.mutateAsync(w.id);
                            toast.success("Automation removed");
                          } catch {
                            toast.error("Unable to delete automation");
                          }
                        }
                      }}>
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Team Lead Dashboard (Priority Tasks & Alerts) */}
          <div className="space-y-6">
            
            {/* SLA Breaches Alarm */}
            <Card className="p-5 border border-destructive/25 bg-destructive/5 space-y-4 shadow-[0_0_16px_rgba(239,68,68,0.08)]">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-destructive">SLA Breach Alarms</h3>
              </div>

              <div className="space-y-3">
                {deptSlaBreaches.map(issue => {
                  const t = tasks.find(x => x.id === issue.taskId);
                  return (
                    <div key={issue.id} className="rounded-xl border border-destructive/15 bg-background p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-destructive">BREACHED SLA</span>
                        <Badge variant="outline" className="text-[8px] border-red-200 text-red-700 bg-red-50 uppercase">
                          {issue.severity}
                        </Badge>
                      </div>
                      <p className="font-semibold text-foreground truncate">{t?.title ?? "System Issue"}</p>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                        <span className="text-muted-foreground">Assignee: {findUser(t?.assigneeIds[0] ?? "")?.name ?? "Unassigned"}</span>
                        <Button size="sm" variant="link" className="h-5 p-0 text-[10px] text-primary" asChild>
                          <Link to="/tasks/$id" params={{ id: issue.taskId }}>
                            Assign
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {deptSlaBreaches.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-3">No active SLA breach alarms in this department.</p>
                )}
              </div>
            </Card>

            {/* Unassigned / Priority Tasks Pipeline */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Priority Department Pipeline</h3>
              </div>

              <div className="space-y-3">
                {priorityTasks.map(t => {
                  const status = statuses.find(s => s.id === t.statusId);
                  const mainAssignee = t.assigneeIds[0] ? findUser(t.assigneeIds[0]) : null;

                  return (
                    <div key={t.id} className="rounded-xl border border-border bg-card p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.displayId}</span>
                        <Badge variant="outline" className="text-[8px] border-orange-200 text-orange-700 bg-orange-50 font-bold uppercase">
                          {t.priority}
                        </Badge>
                      </div>
                      <Link to="/tasks/$id" params={{ id: t.id }} className="font-semibold text-foreground hover:text-primary hover:underline block truncate">
                        {t.title}
                      </Link>

                      <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: status?.color ?? "#ccc" }} />
                          {status?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {mainAssignee?.name ?? "Unassigned"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {priorityTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-3">No critical or high-priority tasks pending.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Standard Automation Create/Edit Dialog */}
        <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
          <DialogContent className="glass-card border border-white/10 bg-card/90 backdrop-blur-md rounded-2xl p-6 sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editingAutomation ? "Edit Automation Rule" : "Create Automation Rule"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure event-driven actions based on task transitions and criteria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rule Name</Label>
                <Input value={autoName} onChange={(e) => setAutoName(e.target.value)} placeholder="e.g. Set high priority task handler" className="h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Description</Label>
                <Input value={autoDesc} onChange={(e) => setAutoDesc(e.target.value)} placeholder="Describe the goal of this rule..." className="h-9" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Project Scope</Label>
                  <Select value={autoProject} onValueChange={setAutoProject}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Global Rule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_global">Global (All Projects)</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">WHEN (Trigger Type)</Label>
                  <Select value={autoTrigger} onValueChange={setAutoTrigger}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {ruleTypes.length > 0 ? (
                        ruleTypes.map((rt) => (
                          <SelectItem key={rt.code} value={rt.triggerType} className="text-xs">
                            <span className="text-[9px] text-muted-foreground mr-1.5 uppercase">[{rt.category}]</span>
                            {rt.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="TASK_CREATED">Task Created</SelectItem>
                          <SelectItem value="TASK_STATUS_CHANGED">Task Status Changed</SelectItem>
                          <SelectItem value="TASK_ASSIGNED">Task Assigned</SelectItem>
                          <SelectItem value="TASK_OVERDUE">Task Overdue</SelectItem>
                          <SelectItem value="TASK_DUE_SOON">Task Due Soon</SelectItem>
                          <SelectItem value="ISSUE_CREATED">Issue Created</SelectItem>
                          <SelectItem value="SLA_BREACHED">SLA Breached</SelectItem>
                          <SelectItem value="SPRINT_STARTED">Sprint / Phase Started</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Condition Section */}
              <div className="space-y-2 border border-border/60 bg-muted/10 p-3 rounded-xl">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">IF (Condition Criteria - Optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={autoCondField} onValueChange={setAutoCondField}>
                    <SelectTrigger className="h-8 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="statusId">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="taskType">Task Type</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={autoCondOp} onValueChange={setAutoCondOp}>
                    <SelectTrigger className="h-8 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUALS">Equals</SelectItem>
                      <SelectItem value="NOT_EQUALS">Does Not Equal</SelectItem>
                      <SelectItem value="CONTAINS">Contains</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input value={autoCondVal} onChange={(e) => setAutoCondVal(e.target.value)} placeholder="Value or ID" className="h-8 text-[10px]" />
                </div>
                <p className="text-[9px] text-muted-foreground">Tip: Enter statusId (e.g. s-todo), priority (e.g. HIGH), etc.</p>
              </div>

              {/* Action Section */}
              <div className="space-y-2 border border-border/60 bg-muted/10 p-3 rounded-xl">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">THEN (Execute Action)</Label>
                <div className="space-y-2">
                  <Select value={autoActType} onValueChange={setAutoActType}>
                    <SelectTrigger className="h-8 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSIGN_USER">Assign User</SelectItem>
                      <SelectItem value="CHANGE_STATUS">Change Status</SelectItem>
                      <SelectItem value="SET_DUE_DATE_OFFSET">Set Due Date Offset</SelectItem>
                    </SelectContent>
                  </Select>

                  {autoActType === "ASSIGN_USER" && (
                    <Select value={autoActUser} onValueChange={setAutoActUser}>
                      <SelectTrigger className="h-8 text-[10px]">
                        <SelectValue placeholder="Select User" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {autoActType === "CHANGE_STATUS" && (
                    <Select value={autoActStatus} onValueChange={setAutoActStatus}>
                      <SelectTrigger className="h-8 text-[10px]">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {autoActType === "SET_DUE_DATE_OFFSET" && (
                    <div className="flex items-center gap-2">
                      <Input type="number" value={autoActOffset} onChange={(e) => setAutoActOffset(e.target.value)} className="h-8 text-[10px] w-20" />
                      <span className="text-[10px] text-muted-foreground">Days from current date</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAutomationDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSaveAutomation} className="bg-gradient-primary text-primary-foreground font-semibold">
                Save Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}

