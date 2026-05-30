import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAutomations,
  useDepartments,
  useRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
} from "@/lib/queries";
import { Workflow, Route as RouteIcon, Zap, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RoleName, TaskType, Department } from "@/lib/types";

export const Route = createFileRoute("/_app/automations")({
  head: () => ({ meta: [{ title: "Automations — TaskFlow Pro" }] }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const { data: rules = [] } = useRoutingRules();
  const { data: autos = [] } = useAutomations();
  const { data: depts = [] } = useDepartments();

  const createRule = useCreateRoutingRule();
  const updateRule = useUpdateRoutingRule();

  return (
    <>
      <Topbar title="Automations & Routing" actions={<CreateRuleDialog depts={depts} />} />
      <main className="flex-1 space-y-6 p-6">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <RouteIcon className="h-4 w-4" /> Auto-routing rules
          </h2>
          <div className="space-y-2">
            {rules.map((r) => {
              const dept = depts.find((d) => d.id === r.targetDepartmentId);
              return (
                <Card key={r.id} className="flex items-center gap-4 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.ruleName}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {r.taskType}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Priority {r.priority}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      → {dept?.name ?? "Any"} · {r.assignToRole} ·{" "}
                      {(r.assignmentStrategy || "").replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateRule.mutateAsync({ id: r.id, rule: { enabled: checked } });
                          toast.success("Rule status updated");
                        } catch (e) {
                          toast.error("Failed to update rule status");
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        try {
                          await updateRule.mutateAsync({ id: r.id, rule: { enabled: false } });
                          toast.success("Rule deleted");
                        } catch (e) {
                          toast.error("Failed to delete rule");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
            {rules.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                No active auto-routing rules. Click "Create Rule" to add one.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Workflow className="h-4 w-4" /> Workflow automations
          </h2>
          <div className="space-y-2">
            {autos.map((a) => (
              <Card key={a.id} className="flex items-center gap-4 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-info/10">
                  <Workflow className="h-5 w-5 text-info" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {a.triggerType}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                </div>
                <Switch checked={a.enabled} />
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function CreateRuleDialog({ depts }: { depts: Department[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("TASK");
  const [targetDeptId, setTargetDeptId] = useState("");
  const [assignRole, setAssignRole] = useState<RoleName>("TEAM_MEMBER");
  const [strategy, setStrategy] = useState<"ROUND_ROBIN" | "LEAST_LOADED" | "ON_CALL">(
    "ROUND_ROBIN",
  );
  const [priority, setPriority] = useState(5);

  const createRule = useCreateRoutingRule();

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Rule name is required");
    try {
      await createRule.mutateAsync({
        ruleName: name,
        taskType,
        targetDepartmentId: targetDeptId || undefined,
        assignToRole: assignRole,
        assignmentStrategy: strategy,
        priority,
      });
      toast.success("Routing rule created");
      setOpen(false);
      setName("");
      setTargetDeptId("");
    } catch (e) {
      toast.error("Failed to create routing rule");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-primary text-primary-foreground">
          <Plus className="mr-1 h-3.5 w-3.5" /> Create Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Auto-Routing Rule</DialogTitle>
          <DialogDescription>
            Configure criteria to automatically assign new tasks or incidents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Rule Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Critical Incident SRE Router"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Task Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="ISSUE">Incident</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Target Department</Label>
            <Select value={targetDeptId} onValueChange={setTargetDeptId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_any">Any Department</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assign to Role</Label>
              <Select value={assignRole} onValueChange={(v) => setAssignRole(v as RoleName)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                  <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                  <SelectItem value="DEPT_HEAD">Department Head</SelectItem>
                  <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <Select
                value={strategy}
                onValueChange={(v) => setStrategy(v as "ROUND_ROBIN" | "LEAST_LOADED" | "ON_CALL")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                  <SelectItem value="LEAST_LOADED">Least Loaded</SelectItem>
                  <SelectItem value="ON_CALL">On Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="bg-gradient-primary text-primary-foreground">
            Create Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
