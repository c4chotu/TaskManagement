import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { useIssues, useProjects, useTasks, useWorkload } from "@/lib/queries";
import { findUser } from "@/lib/mock-data";
import { SeverityBadge } from "@/components/tfp/badges";
import { Progress } from "@/components/ui/progress";
import { AlertOctagon, CheckCircle2, Clock, FolderKanban, TrendingUp, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskFlow Pro" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();
  const { data: workload = [] } = useWorkload();

  const openIssues = issues.filter((i) => !i.resolved).length;
  const sev0 = issues.filter((i) => i.severity === "SEV0" && !i.resolved).length;
  const activeTasks = tasks.filter((t) => t.taskType === "TASK" && t.statusId !== "s-done").length;
  const overloaded = workload.filter((w) => w.overloaded).length;

  const throughput = Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    completed: 2 + Math.round(Math.sin(i) * 3 + Math.random() * 4),
    created: 3 + Math.round(Math.cos(i) * 2 + Math.random() * 3),
  }));
  const byStatus = [
    { s: "Backlog", v: tasks.filter((t) => t.statusId === "s-backlog").length },
    { s: "To Do", v: tasks.filter((t) => t.statusId === "s-todo").length },
    { s: "In Progress", v: tasks.filter((t) => t.statusId === "s-progress").length },
    { s: "Review", v: tasks.filter((t) => t.statusId === "s-review").length },
    { s: "Blocked", v: tasks.filter((t) => t.statusId === "s-blocked").length },
    { s: "Done", v: tasks.filter((t) => t.statusId === "s-done").length },
  ];

  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={AlertOctagon} label="Open incidents" value={openIssues} sub={`${sev0} SEV0 active`} tone="destructive" />
          <StatCard icon={CheckCircle2} label="Active tasks" value={activeTasks} sub={`${tasks.length} total`} tone="primary" />
          <StatCard icon={FolderKanban} label="Projects" value={projects.length} sub={`${projects.filter((p) => p.status === "ACTIVE").length} active`} tone="info" />
          <StatCard icon={Users} label="Overloaded" value={overloaded} sub="people > capacity" tone="warning" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="col-span-2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Throughput · last 14 days</h2>
                <p className="text-xs text-muted-foreground">Tasks created vs. completed</p>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={throughput}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.17 155)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.72 0.17 155)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.14 230)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.68 0.14 230)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.28 0.02 160)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.68 0.03 155)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.03 155)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.02 160)", border: "1px solid oklch(0.28 0.02 160)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="completed" stroke="oklch(0.72 0.17 155)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="created" stroke="oklch(0.68 0.14 230)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Tasks by status</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStatus}>
                <CartesianGrid stroke="oklch(0.28 0.02 160)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="s" stroke="oklch(0.68 0.03 155)" fontSize={10} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis stroke="oklch(0.68 0.03 155)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.02 160)", border: "1px solid oklch(0.28 0.02 160)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="v" fill="oklch(0.72 0.17 155)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Active incidents</h2>
              <Link to="/incidents" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-3">
              {issues.filter((i) => !i.resolved).slice(0, 4).map((i) => {
                const t = tasks.find((x) => x.id === i.taskId);
                return (
                  <Link key={i.id} to="/incidents/$id" params={{ id: i.taskId }} className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3 transition hover:border-primary/40">
                    <SeverityBadge severity={i.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t?.title}</p>
                      <p className="text-xs text-muted-foreground">{i.environment}{i.customerName ? ` · ${i.customerName}` : ""}</p>
                    </div>
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Project progress</h2>
              <Link to="/projects" className="text-xs font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="space-y-4">
              {projects.slice(0, 4).map((p) => (
                <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="block rounded-md p-2 -mx-2 hover:bg-muted/40">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{p.progress ?? 0}%</span>
                  </div>
                  <Progress value={p.progress ?? 0} className="h-1.5" />
                </Link>
              ))}
            </div>
          </Card>
        </section>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Team capacity</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workload.map((w) => {
              const u = findUser(w.userId);
              const pct = Math.min(100, Math.round((w.totalEstimatedHours / 40) * 100));
              return (
                <div key={w.userId} className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{u?.name}</p>
                      <p className="text-xs text-muted-foreground">{w.totalActiveTasks} active · {w.totalEstimatedHours}h</p>
                    </div>
                    {w.overloaded && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">Overloaded</span>}
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: number; sub: string; tone: "primary" | "destructive" | "info" | "warning" }) {
  const toneMap = {
    primary: "text-primary bg-primary/10",
    destructive: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
    warning: "text-warning bg-warning/10",
  } as const;
  return (
    <Card className="flex items-start gap-3 p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </Card>
  );
}
