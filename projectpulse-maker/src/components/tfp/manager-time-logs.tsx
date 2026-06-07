import { useMemo, useState } from "react";
import {
  startOfWeek, endOfWeek, addDays, format, isWithinInterval, parseISO,
} from "date-fns";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Users as UsersIcon, Clock, TrendingUp,
  AlertTriangle, CheckCircle2, Download, Filter,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Topbar } from "@/components/tfp/topbar";
import { useTimeEntries, useUsers, useTasks, useProjects, useTeams } from "@/lib/queries";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export function ManagerTimeLogs() {
  const { data: entries = [] } = useTimeEntries();
  const { data: users = [] } = useUsers();
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: teams = [] } = useTeams();

  const [weekOffset, setWeekOffset] = useState(0);
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const weekStart = useMemo(
    () => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7),
    [weekOffset]
  );
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);

  const teamMembers = useMemo(() => {
    if (teamFilter === "all") return users;
    return users.filter((u) => (u as any).teamId === teamFilter);
  }, [users, teamFilter]);

  const weekEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          isWithinInterval(parseISO(e.startTime), { start: weekStart, end: weekEnd }) &&
          teamMembers.some((u) => u.id === e.userId)
      ),
    [entries, weekStart, weekEnd, teamMembers]
  );

  // KPIs
  const totalHours = weekEntries.reduce((s, e) => s + (e.hours ?? 0), 0);
  const billableHours = weekEntries.filter((e) => e.billable).reduce((s, e) => s + (e.hours ?? 0), 0);
  const utilization = teamMembers.length > 0 ? Math.round((totalHours / (teamMembers.length * 40)) * 100) : 0;
  const billablePct = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

  // Daily distribution
  const dailyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      const dayEntries = weekEntries.filter(
        (e) => format(parseISO(e.startTime), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
      );
      const billable = dayEntries.filter((e) => e.billable).reduce((s, e) => s + (e.hours ?? 0), 0);
      const non = dayEntries.reduce((s, e) => s + (e.hours ?? 0), 0) - billable;
      return { day: format(day, "EEE"), Billable: +billable.toFixed(1), "Non-billable": +non.toFixed(1) };
    });
  }, [weekStart, weekEntries]);

  // Per-member breakdown
  const memberBreakdown = useMemo(() => {
    return teamMembers
      .map((u) => {
        const myEntries = weekEntries.filter((e) => e.userId === u.id);
        const hours = myEntries.reduce((s, e) => s + (e.hours ?? 0), 0);
        const billable = myEntries.filter((e) => e.billable).reduce((s, e) => s + (e.hours ?? 0), 0);
        const target = 40;
        const pct = Math.min(100, Math.round((hours / target) * 100));
        return {
          user: u,
          hours: +hours.toFixed(1),
          billable: +billable.toFixed(1),
          entries: myEntries.length,
          pct,
          status: hours >= target * 0.9 ? "On track" : hours >= target * 0.5 ? "Under target" : "Below 50%",
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [teamMembers, weekEntries]);

  // Project distribution
  const projectDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of weekEntries) {
      const task = tasks.find((t) => t.id === e.taskId);
      const proj = projects.find((p) => p.id === task?.projectId);
      const name = proj?.name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + (e.hours ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, value], i) => ({ name, value: +value.toFixed(1), color: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [weekEntries, tasks, projects]);

  const pendingApprovals = memberBreakdown.filter((m) => m.entries > 0 && m.pct < 90).length;

  return (
    <>
      <Topbar title="Team Time Logs · Manager View" />
      <main className="flex-1 space-y-5 p-6 max-w-[1600px] mx-auto">
        {/* Hero header */}
        <div className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-tr from-indigo-600/10 via-emerald-600/5 to-transparent p-5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <UsersIcon className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight">Team Time Logs</h1>
                <Badge variant="outline" className="ml-2 text-[10px] border-indigo-500/30 text-indigo-600">MANAGER VIEW</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Weekly worklogs, utilization, and approvals across your team.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[12.5px] font-medium tabular-nums px-2">
                {format(weekStart, "dd MMM")} – {format(weekEnd, "dd MMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"><Download className="h-3.5 w-3.5" />Export</Button>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile icon={Clock} label="Total hours" value={`${totalHours.toFixed(1)}h`} sub={`${weekEntries.length} entries`} tone="emerald" />
          <KpiTile icon={TrendingUp} label="Billable %" value={`${billablePct}%`} sub={`${billableHours.toFixed(1)}h billed`} tone="indigo" />
          <KpiTile icon={UsersIcon} label="Team utilization" value={`${utilization}%`} sub={`${teamMembers.length} members · 40h target`} tone={utilization >= 80 ? "emerald" : utilization >= 50 ? "amber" : "red"} />
          <KpiTile icon={AlertTriangle} label="Pending review" value={`${pendingApprovals}`} sub="under 90% of target" tone={pendingApprovals > 0 ? "amber" : "emerald"} />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Daily distribution</h3>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Billable vs Non-billable</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Bar dataKey="Billable" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Non-billable" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2">By project</h3>
            {projectDist.length === 0 ? (
              <div className="grid h-[220px] place-items-center text-xs text-muted-foreground">No data this week</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={projectDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {projectDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Member worklog table */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
            <h3 className="text-sm font-semibold">Team member worklogs</h3>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="bg-muted/40 text-[10.5px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium">Member</th>
                <th className="px-4 py-2 text-right font-medium w-28">Hours</th>
                <th className="px-4 py-2 text-right font-medium w-28">Billable</th>
                <th className="px-4 py-2 text-right font-medium w-20">Entries</th>
                <th className="px-4 py-2 text-left font-medium w-64">Capacity (40h)</th>
                <th className="px-4 py-2 text-left font-medium w-32">Status</th>
                <th className="px-4 py-2 text-right font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {memberBreakdown.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">No members in this scope</td></tr>
              )}
              {memberBreakdown.map((m) => {
                const tone = m.pct >= 90 ? "bg-emerald-500" : m.pct >= 50 ? "bg-amber-500" : "bg-red-500";
                const statusColor = m.status === "On track" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : m.status === "Under target" ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200";
                return (
                  <tr key={m.user.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback className="bg-muted text-[10px]">{m.user.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{m.user.name}</p>
                          <p className="text-[10px] text-muted-foreground">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{m.hours.toFixed(1)}h</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-600 tabular-nums">{m.billable.toFixed(1)}h</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{m.entries}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${tone}`} style={{ width: `${m.pct}%` }} />
                        </div>
                        <span className="font-mono text-[10px] w-10 text-right text-muted-foreground">{m.pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${statusColor}`}>
                        {m.status === "On track" && <CheckCircle2 className="h-3 w-3" />}
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]">View</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/30 text-[11.5px] font-semibold">
              <tr>
                <td className="px-4 py-2">Team total</td>
                <td className="px-4 py-2 text-right font-mono">{totalHours.toFixed(1)}h</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-600">{billableHours.toFixed(1)}h</td>
                <td className="px-4 py-2 text-right font-mono">{weekEntries.length}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </main>
    </>
  );
}

function KpiTile({
  icon: Icon, label, value, sub, tone,
}: {
  icon: any; label: string; value: string; sub: string;
  tone: "emerald" | "indigo" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-red-500/10 text-red-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight tabular-nums">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
      </div>
    </Card>
  );
}
