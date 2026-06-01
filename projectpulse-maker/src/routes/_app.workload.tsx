import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUsers, useWorkload } from "@/lib/queries";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/tfp/badges";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, Users, Activity, BarChart2 } from "lucide-react";

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
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden text-xs">
        {/* Large Background Decorative Route Icon */}
        <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
          <TrendingUp className="h-[420px] w-[420px] opacity-[0.02] -rotate-12 stroke-[1] animate-pulse" />
        </div>

        {/* Hero header banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-teal-600/5 to-transparent p-6 shadow-md rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Users className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Workload Balancer</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Analyze team member capacity, check active task distribution, and balance resource allocation across projects.
            </p>
          </div>
        </div>

        <Card className="glass-card-green p-5 relative z-10">
          <h2 className="mb-4 text-sm font-semibold flex items-center gap-1.5"><BarChart2 className="h-4 w-4 text-primary" /> Estimated hours by team member</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="oklch(0.68 0.03 155)" fontSize={11} />
              <YAxis stroke="oklch(0.68 0.03 155)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="hours" fill="oklch(0.74 0.16 140)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 relative z-10">
          {workload.map((w) => {
            const u = users.find((x) => x.id === w.userId);
            const pct = Math.min(100, Math.round((w.totalEstimatedHours / 40) * 100));
            return (
              <Card key={w.userId} className="glass-card-green p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-muted">
                      {u?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm">{u?.name}</p>
                    <RoleBadge role={u?.roleName} level={u?.roleLevel} />
                  </div>
                  {w.overloaded && (
                    <span className="rounded bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive animate-pulse">
                      Overloaded
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Capacity Utilized</span>
                    <span className="font-mono font-bold">{w.totalEstimatedHours}/40h</span>
                  </div>
                  <Progress value={pct} className={`h-1.5 ${w.overloaded ? "bg-red-500" : "bg-primary"}`} />
                  <p className="mt-1.5 text-[10px] text-muted-foreground font-medium">
                    {w.totalActiveTasks} active tasks assigned
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
