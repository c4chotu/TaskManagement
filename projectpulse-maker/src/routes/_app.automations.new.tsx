import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateRoutingRule,
  useDepartments,
  useUsers,
  useProjects,
  useStatuses
} from "@/lib/queries";
import { ArrowLeft, Plus, Trash2, Sparkles, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import type { RoleName, TaskType } from "@/lib/types";

export const Route = createFileRoute("/_app/automations/new")({
  head: () => ({ meta: [{ title: "New Rule — TaskFlow Pro" }] }),
  component: CreateRulePage,
});

interface ConditionRow {
  field: "priority" | "taskType" | "statusId" | "projectId" | "departmentId";
  operator: "=" | "!=";
  value: string;
}

function CreateRulePage() {
  const navigate = useNavigate();
  const { data: departments = [] } = useDepartments();
  const { data: users = [] } = useUsers();
  const { data: projects = [] } = useProjects();
  const { data: statuses = [] } = useStatuses();
  const createRule = useCreateRoutingRule();

  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("TASK");
  const [priority, setPriority] = useState(5);
  const [targetDeptId, setTargetDeptId] = useState("");

  // WHEN (Trigger)
  const [triggerType, setTriggerType] = useState("task_created");
  const [triggerValue, setTriggerValue] = useState("");

  // IF (Multiple Conditions)
  const [conditions, setConditions] = useState<ConditionRow[]>([
    { field: "priority", operator: "=", value: "HIGH" }
  ]);

  // THEN (Action)
  const [actionType, setActionType] = useState("assign_role");
  const [actionUser, setActionUser] = useState("");
  const [actionRole, setActionRole] = useState<RoleName>("TEAM_MEMBER");
  const [strategy, setStrategy] = useState<"ROUND_ROBIN" | "LEAST_LOADED" | "ON_CALL">("ROUND_ROBIN");

  const addConditionRow = () => {
    setConditions([...conditions, { field: "priority", operator: "=", value: "HIGH" }]);
  };

  const removeConditionRow = (index: number) => {
    if (conditions.length === 1) {
      toast.error("At least one condition is required");
      return;
    }
    setConditions(conditions.filter((_, idx) => idx !== index));
  };

  const updateConditionRow = (index: number, patch: Partial<ConditionRow>) => {
    const updated = [...conditions];
    const prevField = updated[index].field;
    updated[index] = { ...updated[index], ...patch };
    
    // Reset value if field changed
    if (patch.field && patch.field !== prevField) {
      if (patch.field === "priority") updated[index].value = "HIGH";
      else if (patch.field === "taskType") updated[index].value = "TASK";
      else if (patch.field === "statusId") updated[index].value = statuses[0]?.id || "";
      else if (patch.field === "projectId") updated[index].value = projects[0]?.id || "";
      else if (patch.field === "departmentId") updated[index].value = departments[0]?.id || "";
    }
    setConditions(updated);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please provide a rule name.");
      return;
    }

    // Build the visual text tags for backward compatibility with in-memory display parser
    const triggerLabel = triggerType === "task_created" ? "Task Created"
      : triggerType === "status_changed" ? `Status changes to ${statuses.find(s => s.id === triggerValue)?.name || triggerValue}`
      : `Priority escalated to ${triggerValue}`;

    const conditionsLabel = conditions.map(c => {
      let valLabel = c.value;
      if (c.field === "statusId") valLabel = statuses.find(s => s.id === c.value)?.name || c.value;
      else if (c.field === "projectId") valLabel = projects.find(p => p.id === c.value)?.name || c.value;
      else if (c.field === "departmentId") valLabel = departments.find(d => d.id === c.value)?.name || c.value;
      
      const opLabel = c.operator === "=" ? "is" : "is not";
      return `${c.field.replace(/([A-Z])/g, " $1")} ${opLabel} ${valLabel}`;
    }).join(" AND ");

    const actionLabel = actionType === "assign_resource" 
      ? `Assign to ${users.find(u => u.id === actionUser)?.name || actionUser}`
      : `Auto-route ${strategy.replace(/_/g, " ")} to ${actionRole.replace(/_/g, " ")}`;

    const encodedRuleName = `${name} [WHEN: ${triggerLabel}] [IF: ${conditionsLabel}] [THEN: ${actionLabel}]`;

    // Construct backend payload matching TaskRouterService expected schema
    const triggerConditionObj = {
      conditions: conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value
      }))
    };

    try {
      await createRule.mutateAsync({
        ruleName: encodedRuleName,
        taskType,
        targetDepartmentId: targetDeptId || undefined,
        assignToRole: actionType === "assign_role" ? actionRole : "TEAM_MEMBER",
        assignmentStrategy: actionType === "assign_role" ? strategy : "ROUND_ROBIN",
        priority,
        triggerCondition: triggerConditionObj
      });
      toast.success("Routing rule saved successfully.");
      navigate({ to: "/automations" });
    } catch {
      toast.error("Failed to save automation rule.");
    }
  };

  return (
    <>
      <Topbar title="Create Automation Rule" />
      <main className="flex-1 p-6 max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <div>
          <Link to="/automations" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Automations
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Create Automation Rule</h1>
          <p className="text-sm text-muted-foreground">Construct precise event triggers and multi-conditional rules for task dispatching.</p>
        </div>

        {/* RULE FORM CARDS */}
        <div className="space-y-6">
          {/* Card 1: Rule Details */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Rule Metadata</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Rule Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Critical Bug Auto-Assign" className="h-10 text-sm" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Task Type Scope</Label>
                  <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TASK">Tasks</SelectItem>
                      <SelectItem value="ISSUE">Issues / Bugs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority Order</Label>
                  <Input type="number" min={1} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Target Department</Label>
                  <Select value={targetDeptId} onValueChange={setTargetDeptId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Any Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Any Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: WHEN (Trigger) */}
          <Card className="p-6 space-y-4 border-l-4 border-blue-500 bg-blue-500/5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-700">2</span>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-700">WHEN (Event Trigger)</h3>
              </div>
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Trigger Event</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Trigger Event</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task_created">Task is Created</SelectItem>
                    <SelectItem value="status_changed">Status changes</SelectItem>
                    <SelectItem value="priority_escalated">Priority is set</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerType !== "task_created" && (
                <div className="space-y-1.5">
                  <Label>Target Value</Label>
                  <Select value={triggerValue} onValueChange={setTriggerValue}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select value..." />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerType === "status_changed" ? (
                        statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="CRITICAL">Critical Priority</SelectItem>
                          <SelectItem value="HIGH">High Priority</SelectItem>
                          <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                          <SelectItem value="LOW">Low Priority</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>

          {/* Card 3: IF (Multiple Conditions) */}
          <Card className="p-6 space-y-4 border-l-4 border-amber-500 bg-amber-500/5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-700">3</span>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-amber-700">IF (Multiple Conditions)</h3>
              </div>
              <Button size="sm" variant="outline" className="h-8 border-amber-200 hover:bg-amber-100/40 text-amber-700 text-xs font-semibold" onClick={addConditionRow}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Condition
              </Button>
            </div>

            <div className="space-y-3">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-background p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1">Condition #{idx + 1}</span>
                  
                  {/* Field Select */}
                  <Select value={cond.field} onValueChange={(v) => updateConditionRow(idx, { field: v as any })}>
                    <SelectTrigger className="w-40 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="taskType">Task Type</SelectItem>
                      <SelectItem value="statusId">Status</SelectItem>
                      <SelectItem value="projectId">Project</SelectItem>
                      <SelectItem value="departmentId">Department</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Operator Select */}
                  <Select value={cond.operator} onValueChange={(v) => updateConditionRow(idx, { operator: v as any })}>
                    <SelectTrigger className="w-24 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="=">Equals</SelectItem>
                      <SelectItem value="!=">Is Not</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Value Select */}
                  <div className="flex-1 min-w-[200px]">
                    <Select value={cond.value} onValueChange={(v) => updateConditionRow(idx, { value: v })}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cond.field === "priority" && (
                          <>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                          </>
                        )}
                        {cond.field === "taskType" && (
                          <>
                            <SelectItem value="TASK">Task</SelectItem>
                            <SelectItem value="ISSUE">Issue</SelectItem>
                          </>
                        )}
                        {cond.field === "statusId" && (
                          statuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                        )}
                        {cond.field === "projectId" && (
                          projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                        )}
                        {cond.field === "departmentId" && (
                          departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeConditionRow(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 4: THEN (Action) */}
          <Card className="p-6 space-y-4 border-l-4 border-emerald-500 bg-emerald-500/5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-700">4</span>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-emerald-700">THEN (Enforced Action)</h3>
              </div>
              <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Assignee Strategy</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Action Target</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assign_role">Auto-route to Role</SelectItem>
                    <SelectItem value="assign_resource">Assign to Specific User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {actionType === "assign_resource" ? (
                <div className="space-y-1.5">
                  <Label>Assignee Resource</Label>
                  <Select value={actionUser} onValueChange={setActionUser}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Target Role</Label>
                    <Select value={actionRole} onValueChange={(v) => setActionRole(v as RoleName)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                        <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                        <SelectItem value="DEPT_HEAD">Department Head</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Strategy</Label>
                    <Select value={strategy} onValueChange={(v) => setStrategy(v as any)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                        <SelectItem value="LEAST_LOADED">Least Loaded</SelectItem>
                        <SelectItem value="ON_CALL">On Call Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Form Footer Action Bar */}
        <div className="flex items-center justify-end gap-3 border-t border-border/60 pt-6">
          <Button variant="outline" className="h-10 px-5 text-sm" asChild>
            <Link to="/automations">Cancel</Link>
          </Button>
          <Button className="bg-gradient-primary text-primary-foreground font-semibold h-10 px-5 text-sm" onClick={handleCreate} disabled={createRule.isPending}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Save Automation Rule
          </Button>
        </div>
      </main>
    </>
  );
}
