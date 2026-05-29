import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUsers, useWorkload } from "@/lib/queries";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/tfp/badges";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/workload")({
  head: () => ({ meta: [{ title: "Workload — TaskFlow Pro" }] }),
  component: WorkloadPage,
});

function WorkloadPage() {
  const { data: workload = [] } = useWorkload();
  const { data: users = [] } = useUsers();
  const chart = workload.map((w) => ({
    name: users.find((u) => u.id === w.userId)?.name?.split(" ")[0] ?? w.userId,
    hours: w.totalEstimatedHours,
    tasks: w.totalActiveTasks,
  }));
  return (
    <>
      <Topbar title="Workload Balancer" />
      <main className="flex-1 space-y-4 p-6">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Estimated hours by team member</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid stroke="oklch(0.28 0.02 160)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="oklch(0.68 0.03 155)" fontSize={11} />
              <YAxis stroke="oklch(0.68 0.03 155)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.20 0.02 160)", border: "1px solid oklch(0.28 0.02 160)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="hours" fill="oklch(0.72 0.17 155)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workload.map((w) => {
            const u = users.find((x) => x.id === w.userId);
            const pct = Math.min(100, Math.round((w.totalEstimatedHours / 40) * 100));
            return (
              <Card key={w.userId} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border border-border"><AvatarFallback className="bg-muted">{u?.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{u?.name}</p>
                    <RoleBadge role={u?.roleName} level={u?.roleLevel} />
                  </div>
                  {w.overloaded && <span className="rounded bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">Over</span>}
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Capacity</span><span className="font-mono">{w.totalEstimatedHours}/40h</span></div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="mt-1 text-[10px] text-muted-foreground">{w.totalActiveTasks} active tasks</p>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
