import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { useIssues, useProjects, useStatuses, useTasks, useWorkload } from "@/lib/queries";
import { findUser } from "@/lib/mock-data";
import { ZWidget, ZCountTile, ZEmpty } from "@/components/tfp/zoho";
import { Progress } from "@/components/ui/progress";
import { AlertOctagon, Bug, FolderKanban, Users } from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { SuperAdminDashboard } from "@/components/tfp/superadmin-dashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskFlow Pro" }] }),
  component: Dashboard,
});

const SEV_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6"];

function Dashboard() {
  const { user } = useAuth();
  if (user?.roleName === "SUPER_ADMIN") return <SuperAdminDashboard />;

  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();
  const { data: statuses = [] } = useStatuses();
  const { data: workload = [] } = useWorkload();

  const openIssues = issues.filter((i) => !i.resolved).length;
  const sev0 = issues.filter((i) => i.severity === "SEV0" && !i.resolved).length;
  const activeTasks = tasks.filter((t) => t.statusId !== "s-done").length;
  const closedTasks = tasks.filter((t) => t.statusId === "s-done").length;
  const overloaded = workload.filter((w) => w.overloaded).length;

  const throughput = Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    completed: 2 + Math.round(Math.sin(i) * 3 + Math.random() * 4),
    created: 3 + Math.round(Math.cos(i) * 2 + Math.random() * 3),
  }));

  const byStatus = statuses.map((s) => ({
    s: s.name,
    v: tasks.filter((t) => t.statusId === s.id).length,
    color: s.color,
  }));

  const bySeverity = (["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((sev, idx) => ({
    name: sev,
    value: issues.filter((i) => i.severity === sev).length,
    color: SEV_COLORS[idx],
  })).filter((d) => d.value > 0);

  return (
    <>
      <Topbar title="Global Dashboard" />
      <main className="flex-1 space-y-4 p-5">
        {/* Count tiles */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <ZCountTile label="Open Tasks" count={activeTasks} tone="primary" to="/tasks" />
          <ZCountTile label="Closed Tasks" count={closedTasks} tone="muted" />
          <ZCountTile label="Open Issues" count={openIssues} tone="destructive" to="/incidents" />
          <ZCountTile label="SEV0 Critical" count={sev0} tone="destructive" />
          <ZCountTile label="Projects" count={projects.length} tone="info" to="/projects" />
          <ZCountTile label="Overloaded" count={overloaded} tone="warning" to="/workload" />
        </section>

        {/* Charts row */}
        <section className="grid gap-3 lg:grid-cols-3">
          <ZWidget title="Throughput · last 14 days" subtitle="Tasks created vs. completed" className="lg:col-span-2">
            <div className="p-3">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={throughput} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.6 0.15 155)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="oklch(0.6 0.15 155)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.16 240)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.55 0.16 240)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.91 0.005 240)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12 }} />
                  <Area type="monotone" dataKey="completed" stroke="oklch(0.6 0.15 155)" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="created" stroke="oklch(0.55 0.16 240)" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ZWidget>

          <ZWidget title="Tasks Status" subtitle="By workflow column">
            <div className="p-3">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byStatus} margin={{ top: 5, right: 5, left: -20, bottom: 30 }}>
                  <CartesianGrid stroke="oklch(0.91 0.005 240)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="s" stroke="oklch(0.5 0.02 240)" fontSize={10} interval={0} angle={-25} textAnchor="end" tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                    {byStatus.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || "oklch(0.6 0.15 155)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ZWidget>
        </section>

        {/* Row 2 — issues breakdown + active incidents list */}
        <section className="grid gap-3 lg:grid-cols-3">
          <ZWidget title="Issues by Severity" subtitle="All time">
            <div className="p-3">
              {bySeverity.length === 0 ? (
                <ZEmpty icon={Bug} title="No issues yet." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={bySeverity} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {bySeverity.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </ZWidget>

          <ZWidget title="Active Incidents" subtitle={`${openIssues} open`} className="lg:col-span-2">
            {issues.filter((i) => !i.resolved).length === 0 ? (
              <ZEmpty icon={AlertOctagon} title="All incidents resolved." />
            ) : (
              <ul className="divide-y divide-border/60">
                {issues.filter((i) => !i.resolved).slice(0, 6).map((i) => {
                  const t = tasks.find((x) => x.id === i.taskId);
                  return (
                    <li key={i.id}>
                      <Link to="/incidents/$id" params={{ id: i.taskId }} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                        <span
                          className="inline-flex h-4 min-w-[34px] items-center justify-center rounded-sm px-1 text-[9px] font-bold text-white"
                          style={{ background: `var(--color-sev-${i.severity.slice(-1)})` }}
                        >
                          {i.severity}
                        </span>
                        <span className="flex-1 truncate text-[12.5px]">{t?.title}</span>
                        <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{i.environment}</span>
                        {i.customerName && (
                          <span className="hidden text-[10.5px] text-muted-foreground sm:inline">· {i.customerName}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </ZWidget>
        </section>

        {/* Row 3 — Project progress + Team capacity */}
        <section className="grid gap-3 lg:grid-cols-2">
          <ZWidget title="Project Progress" subtitle={`${projects.length} active`} actions={
            <Link to="/projects" className="text-[11px] text-info hover:underline">View all →</Link>
          }>
            {projects.length === 0 ? (
              <ZEmpty icon={FolderKanban} title="No projects yet." />
            ) : (
              <ul className="divide-y divide-border/60">
                {projects.slice(0, 6).map((p) => (
                  <li key={p.id} className="px-3 py-2">
                    <Link to="/projects/$id" params={{ id: p.id }} className="block">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-[12.5px] font-medium text-foreground hover:text-primary hover:underline">{p.name}</span>
                        <span className="font-mono text-[10.5px] text-muted-foreground">{p.progress ?? 0}%</span>
                      </div>
                      <Progress value={p.progress ?? 0} className="h-1.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ZWidget>

          <ZWidget title="Team Capacity" subtitle={`${overloaded} overloaded`} actions={
            <Link to="/workload" className="text-[11px] text-info hover:underline">View all →</Link>
          }>
            {workload.length === 0 ? (
              <ZEmpty icon={Users} title="No workload data." />
            ) : (
              <ul className="divide-y divide-border/60">
                {workload.slice(0, 6).map((w) => {
                  const u = findUser(w.userId);
                  const pct = Math.min(100, Math.round((w.totalEstimatedHours / 40) * 100));
                  return (
                    <li key={w.userId} className="flex items-center gap-3 px-3 py-2">
                      <Avatar className="h-7 w-7 border border-border">
                        <AvatarFallback className="bg-muted text-[10px]">
                          {u?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-medium">{u?.name}</p>
                          {w.overloaded && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive">
                              Overloaded
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="font-mono text-[10.5px] text-muted-foreground">
                            {w.totalEstimatedHours}h
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ZWidget>
        </section>
      </main>
    </>
  );
}
