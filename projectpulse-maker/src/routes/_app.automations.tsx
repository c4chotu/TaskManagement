import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAutomations, useDepartments, useRoutingRules } from "@/lib/queries";
import { Workflow, Route as RouteIcon, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/automations")({
  head: () => ({ meta: [{ title: "Automations — TaskFlow Pro" }] }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const { data: rules = [] } = useRoutingRules();
  const { data: autos = [] } = useAutomations();
  const { data: depts = [] } = useDepartments();
  return (
    <>
      <Topbar title="Automations & Routing" />
      <main className="flex-1 space-y-6 p-6">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><RouteIcon className="h-4 w-4" /> Auto-routing rules</h2>
          <div className="space-y-2">
            {rules.map((r) => {
              const dept = depts.find((d) => d.id === r.targetDepartmentId);
              return (
                <Card key={r.id} className="flex items-center gap-4 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10"><Zap className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.ruleName}</p>
                      <Badge variant="outline" className="text-[10px]">{r.taskType}</Badge>
                      <Badge variant="outline" className="text-[10px]">Priority {r.priority}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">→ {dept?.name ?? "Any"} · {r.assignToRole} · {r.assignmentStrategy.replace("_", " ")}</p>
                  </div>
                  <Switch checked={r.enabled} />
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Workflow className="h-4 w-4" /> Workflow automations</h2>
          <div className="space-y-2">
            {autos.map((a) => (
              <Card key={a.id} className="flex items-center gap-4 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-info/10"><Workflow className="h-5 w-5 text-info" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><p className="font-medium">{a.name}</p><Badge variant="outline" className="text-[10px]">{a.triggerType}</Badge></div>
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
