import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { useIssues, useProjects, useStatuses, useTasks, useWorkload } from "@/lib/queries";
import { findUser } from "@/lib/mock-data";
import { ZWidget, ZCountTile, ZEmpty } from "@/components/tfp/zoho";
import { Progress } from "@/components/ui/progress";
import { 
  AlertOctagon, Bug, FolderKanban, Users, ChevronUp, ChevronDown, 
  X, Settings as SettingsIcon, LayoutGrid, Check, RotateCcw, Flame, Plus 
} from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { SuperAdminDashboard } from "@/components/tfp/superadmin-dashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskFlow Pro" }] }),
  component: Dashboard,
});

const SEV_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6"];

const ALL_WIDGETS = [
  { id: "throughput", title: "Throughput Analysis", desc: "Line chart of tasks created vs. completed" },
  { id: "status", title: "Task Status Distribution", desc: "Bar chart of tasks distributed by status column" },
  { id: "severity", title: "Issues by Severity", desc: "Pie chart of issues classified by severity level" },
  { id: "incidents", title: "Active Incident Tickets", desc: "List of current open critical issues" },
  { id: "projects", title: "Project Progress Tracker", desc: "List of active projects with progress bars" },
  { id: "capacity", title: "Team Capacity Allocation", desc: "Workload distribution metrics for members" }
];

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

  const throughput = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      day: `D${i + 1}`,
      completed: 2 + Math.round(Math.sin(i) * 3 + Math.random() * 4),
      created: 3 + Math.round(Math.cos(i) * 2 + Math.random() * 3),
    }));
  }, []);

  const byStatus = useMemo(() => {
    return statuses.map((s) => ({
      s: s.name,
      v: tasks.filter((t) => t.statusId === s.id).length,
      color: s.color,
    }));
  }, [statuses, tasks]);

  const bySeverity = useMemo(() => {
    return (["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((sev, idx) => ({
      name: sev,
      value: issues.filter((i) => i.severity === sev).length,
      color: SEV_COLORS[idx],
    })).filter((d) => d.value > 0);
  }, [issues]);

  // Layout customization state
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);

  useEffect(() => {
    if (user?.email) {
      const saved = localStorage.getItem(`tfp.dashboard.layout.${user.email}`);
      if (saved) {
        try {
          setActiveWidgets(JSON.parse(saved));
          return;
        } catch (e) {}
      }
    }
    setActiveWidgets(["throughput", "status", "severity", "incidents", "projects", "capacity"]);
  }, [user]);

  const handleSaveLayout = () => {
    if (user?.email) {
      localStorage.setItem(`tfp.dashboard.layout.${user.email}`, JSON.stringify(activeWidgets));
      toast.success("Dashboard layout saved to your profile!");
      setIsCustomizing(false);
    }
  };

  const handleResetLayout = () => {
    const defaultLayout = ["throughput", "status", "severity", "incidents", "projects", "capacity"];
    setActiveWidgets(defaultLayout);
    if (user?.email) {
      localStorage.setItem(`tfp.dashboard.layout.${user.email}`, JSON.stringify(defaultLayout));
    }
    toast.success("Dashboard layout reset to default!");
    setIsCustomizing(false);
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const newWidgets = [...activeWidgets];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newWidgets.length) {
      const temp = newWidgets[index];
      newWidgets[index] = newWidgets[targetIndex];
      newWidgets[targetIndex] = temp;
      setActiveWidgets(newWidgets);
    }
  };

  const removeWidget = (id: string) => {
    setActiveWidgets(activeWidgets.filter(w => w !== id));
  };

  const addWidget = (id: string) => {
    if (!activeWidgets.includes(id)) {
      setActiveWidgets([...activeWidgets, id]);
    }
  };

  const renderWidget = (id: string, index: number) => {
    const widgetContent = (() => {
      switch (id) {
        case "throughput":
          return (
            <ZWidget title="Throughput · last 14 days" subtitle="Tasks created vs. completed" className="w-full h-full">
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
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                    <Area type="monotone" dataKey="completed" stroke="oklch(0.6 0.15 155)" fill="url(#g1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="created" stroke="oklch(0.55 0.16 240)" fill="url(#g2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ZWidget>
          );
        case "status":
          return (
            <ZWidget title="Tasks Status" subtitle="By workflow column" className="w-full h-full">
              <div className="p-3">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byStatus} margin={{ top: 5, right: 5, left: -20, bottom: 30 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="s" stroke="oklch(0.5 0.02 240)" fontSize={10} interval={0} angle={-25} textAnchor="end" tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.5 0.02 240)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                      {byStatus.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color || "oklch(0.6 0.15 155)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ZWidget>
          );
        case "severity":
          return (
            <ZWidget title="Issues by Severity" subtitle="All time" className="w-full h-full">
              <div className="p-3">
                {bySeverity.length === 0 ? (
                  <ZEmpty icon={Bug} title="No issues yet." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={bySeverity} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {bySeverity.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ZWidget>
          );
        case "incidents":
          return (
            <ZWidget title="Active Incidents" subtitle={`${openIssues} open`} className="w-full h-full">
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
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ZWidget>
          );
        case "projects":
          return (
            <ZWidget title="Project Progress" subtitle={`${projects.length} active`} actions={
              <Link to="/projects" className="text-[11px] text-info hover:underline">View all →</Link>
            } className="w-full h-full">
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
          );
        case "capacity":
          return (
            <ZWidget title="Team Capacity" subtitle={`${overloaded} overloaded`} actions={
              <Link to="/workload" className="text-[11px] text-info hover:underline">View all →</Link>
            } className="w-full h-full">
              {workload.length === 0 ? (
                <ZEmpty icon={Users} title="No workload data." />
              ) : (
                <ul className="divide-y divide-border/60 text-xs">
                  {workload.slice(0, 6).map((w) => {
                    const u = findUser(w.userId);
                    const pct = Math.min(100, Math.round((w.totalEstimatedHours / 40) * 100));
                    return (
                      <li key={w.userId} className="flex items-center gap-3 px-3 py-2">
                        <Avatar className="h-7 w-7 border border-border">
                          <AvatarFallback className="bg-muted text-[10px] font-bold">
                            {u?.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[12.5px] font-semibold text-foreground">{u?.name}</p>
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
          );
        default:
          return null;
      }
    })();

    return (
      <div key={id} className={`relative border rounded-2xl overflow-hidden transition-all duration-300 ${
        isCustomizing 
          ? "border-emerald-500/40 shadow-[0_4px_16px_rgba(16,185,129,0.15)] bg-emerald-500/5 scale-[0.98] ring-1 ring-emerald-500/25" 
          : "border-transparent"
      } ${id === "throughput" || id === "incidents" ? "lg:col-span-2" : ""}`}>
        {isCustomizing && (
          <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 bg-background/95 backdrop-blur-md px-2 py-1.5 rounded-xl border border-emerald-500/20 shadow-md">
            <button type="button" onClick={() => moveWidget(index, "up")} disabled={index === 0} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40" title="Move Left/Up">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => moveWidget(index, "down")} disabled={index === activeWidgets.length - 1} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40" title="Move Right/Down">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="mx-1 h-3.5 w-px bg-border" />
            <button type="button" onClick={() => removeWidget(id)} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive animate-pulse" title="Remove Widget">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className={`h-full ${isCustomizing ? "pointer-events-none opacity-70" : ""}`}>
          {widgetContent}
        </div>
      </div>
    );
  };

  return (
    <>
      <Topbar title="Global Operations Dashboard" />
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden">
        
        {/* Customize Toolbar Banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent px-5 py-4 rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <LayoutGrid className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Personalize Dashboard</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Rearrange, add, or delete operations widgets. Your personalized dashboard configuration is saved to your profile.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {isCustomizing ? (
              <>
                <Button size="sm" onClick={handleSaveLayout} className="bg-emerald-600 text-white rounded-xl text-xs flex items-center gap-1.5 hover:bg-emerald-700 font-semibold hover-lift">
                  <Check className="h-3.5 w-3.5" /> Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetLayout} className="rounded-xl text-xs flex items-center gap-1.5 border-white/10 bg-background/40 font-semibold hover-lift">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Default
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsCustomizing(false)} className="rounded-xl text-xs font-medium">
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsCustomizing(true)} className="rounded-xl text-xs flex items-center gap-1.5 border-white/10 bg-background/40 font-semibold hover-lift">
                <SettingsIcon className="h-3.5 w-3.5" /> Personalize Layout
              </Button>
            )}
          </div>
        </div>

        {/* Add Widgets Shelf */}
        {isCustomizing && (
          <Card className="glass-card-green p-5 rounded-2xl space-y-4 animate-fade-in relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Widgets to Dashboard
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {ALL_WIDGETS.filter(w => !activeWidgets.includes(w.id)).map(w => (
                <div key={w.id} className="flex items-center justify-between p-3 bg-background/50 border border-white/10 rounded-xl shadow-xs hover:border-emerald-500/35 transition-all">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-foreground truncate">{w.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{w.desc}</p>
                  </div>
                  <Button size="icon" variant="outline" onClick={() => addWidget(w.id)} className="h-8 w-8 text-emerald-600 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 rounded-lg shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {ALL_WIDGETS.filter(w => !activeWidgets.includes(w.id)).length === 0 && (
                <p className="text-xs text-muted-foreground italic col-span-full">All widgets are active on your personal dashboard.</p>
              )}
            </div>
          </Card>
        )}

        {/* Count tiles */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 relative z-10">
          <ZCountTile label="Open Tasks" count={activeTasks} tone="primary" to="/tasks" />
          <ZCountTile label="Closed Tasks" count={closedTasks} tone="muted" />
          <ZCountTile label="Open Issues" count={openIssues} tone="destructive" to="/incidents" />
          <ZCountTile label="SEV0 Critical" count={sev0} tone="destructive" />
          <ZCountTile label="Projects" count={projects.length} tone="info" to="/projects" />
          <ZCountTile label="Overloaded" count={overloaded} tone="warning" to="/workload" />
        </section>

        {/* Widgets Grid */}
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3 relative z-10">
          {activeWidgets.map((id, index) => renderWidget(id, index))}
        </section>
      </main>
    </>
  );
}
