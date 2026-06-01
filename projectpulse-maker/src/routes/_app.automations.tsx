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
  useUsers,
  useProjects,
  useTasks,
  useIssues,
  useStatuses
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

  const updateRule = useUpdateRoutingRule();
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
                            await updateRule.mutateAsync({ id: rule.id, rule: { enabled: false } }); // delete simulation
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
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Workflow className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold text-base">Standard Workflow Automations</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {workflows.map((w) => (
                  <Card key={w.id} className="p-4 border border-border/50 bg-card/80 backdrop-blur-sm space-y-2 hover:shadow-[0_0_16px_rgba(99,102,241,0.1)] transition-all">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-foreground">{w.name}</p>
                      <Badge variant={w.enabled ? "outline" : "secondary"} className="text-[8px] uppercase">
                        {w.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{w.description}</p>
                    <div className="flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 w-fit">
                      <Sparkles className="h-3 w-3" /> Trigger: {w.triggerType}
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
      </main>
    </>
  );
}

