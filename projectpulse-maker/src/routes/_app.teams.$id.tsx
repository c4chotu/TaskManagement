import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  useTeams, useUsers, useTasks, useIssues, useSprints, useDepartments, useProjects,
} from "@/lib/queries";
import { format } from "date-fns";
import {
  ArrowLeft, Users, Mail, Crown, Calendar, Layers,
  FolderKanban, Search, Activity, MoreHorizontal,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/_app/teams/$id")({
  head: () => ({ meta: [{ title: "Team Profile — TaskFlow Pro" }] }),
  component: TeamDetail,
});

const CHART_COLORS = [
  "#10b981", "#f59e0b", "#3b82f6", "#f87171", "#a855f7",
  "#06b6d4", "#84cc16", "#ec4899", "#f97316", "#6366f1",
];

function DonutChart({
  data,
  total,
  label,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={data.length > 0 ? data : [{ name: "None", value: 1, color: "#334155" }]}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={data.length > 1 ? 3 : 0}
              startAngle={90}
              endAngle={-270}
            >
              {(data.length > 0 ? data : [{ name: "None", value: 1, color: "#334155" }]).map(
                (d, i) => (
                  <Cell key={i} fill={d.color} />
                )
              )}
            </Pie>
            <RechartsTooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground font-mono">{total}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
      </div>
    </div>
  );
}

function TeamDetail() {
  const { id } = Route.useParams();
  const { data: teams = [] } = useTeams();
  const { data: users = [] } = useUsers();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();
  const { data: depts = [] } = useDepartments();
  const { data: projects = [] } = useProjects();

  const [memberSearch, setMemberSearch] = useState("");

  const team = teams.find((t) => t.id === id);
  const dept = depts.find((d) => d.id === team?.departmentId);
  const lead = users.find((u) => u.id === team?.leadUserId);
  const members = users.filter((u) => (u as any).teamId === id);

  // Sprints per project — aggregate all project sprints for phase data
  const { data: sprints = [] } = useSprints(projects[0]?.id ?? "");
  const allSprints = sprints; // simplified: use first-project sprints for demo

  // Task data for charts
  const teamTasks = useMemo(() => tasks.filter((t) => (t as any).teamId === id || members.some((m) => t.assigneeIds.includes(m.id))), [tasks, members, id]);
  const teamIssues = useMemo(() => issues.filter((i) => {
    const task = tasks.find((t) => t.id === i.taskId);
    return task && ((task as any).teamId === id || members.some((m) => task.assigneeIds.includes(m.id)));
  }), [issues, tasks, members, id]);

  // Task distribution by status name
  const taskStatusMap = useMemo(() => {
    const map: Record<string, { count: number; color: string }> = {};
    teamTasks.forEach((t) => {
      const statusName = t.statusId === "s-done"
        ? "Closed"
        : t.statusId === "s-progress"
        ? "In Progress"
        : t.statusId === "s-review"
        ? "In Review"
        : t.statusId === "s-hold"
        ? "On Hold"
        : t.statusId === "s-test"
        ? "To be Tested"
        : "Open";
      const color = t.statusId === "s-done"
        ? "#10b981"
        : t.statusId === "s-progress"
        ? "#f59e0b"
        : t.statusId === "s-review"
        ? "#3b82f6"
        : t.statusId === "s-hold"
        ? "#f97316"
        : "#94a3b8";
      if (!map[statusName]) map[statusName] = { count: 0, color };
      map[statusName].count++;
    });
    return Object.entries(map).map(([name, val]) => ({
      name,
      value: val.count,
      color: val.color,
    }));
  }, [teamTasks]);

  // Issue distribution by status
  const issueStatusMap = useMemo(() => {
    const statusLabels: Record<string, { color: string }> = {
      "s-done": { color: "#10b981" },
      "s-progress": { color: "#f59e0b" },
      "s-review": { color: "#3b82f6" },
    };
    const map: Record<string, { count: number; color: string }> = {};
    teamIssues.forEach((i) => {
      const task = tasks.find((t) => t.id === i.taskId);
      const sid = task?.statusId ?? "open";
      const sname = sid === "s-done" ? "Closed" : sid === "s-progress" ? "In Progress" : "Open";
      const color = statusLabels[sid]?.color ?? "#f87171";
      if (!map[sname]) map[sname] = { count: 0, color };
      map[sname].count++;
    });
    return Object.entries(map).map(([name, val]) => ({
      name,
      value: val.count,
      color: val.color,
    }));
  }, [teamIssues, tasks]);

  // Phase distribution — open vs closed
  const phaseData = useMemo(() => {
    const open = allSprints.filter((s) => s.status !== "COMPLETED").length;
    const closed = allSprints.filter((s) => s.status === "COMPLETED").length;
    return [
      ...(closed > 0 ? [{ name: "Closed", value: closed, color: "#f59e0b" }] : []),
      ...(open > 0 ? [{ name: "Open", value: open, color: "#10b981" }] : []),
    ];
  }, [allSprints]);

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          !memberSearch ||
          m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.email?.toLowerCase().includes(memberSearch.toLowerCase())
      ),
    [members, memberSearch]
  );

  const associatedProjects = useMemo(
    () => projects.filter((p) => teamTasks.some((t) => t.projectId === p.id)),
    [projects, teamTasks]
  );

  if (!team) {
    return (
      <>
        <Topbar title="Team" />
        <main className="p-6">
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Team not found.
          </Card>
        </main>
      </>
    );
  }

  const initials = team.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <Topbar title={team.name} />
      <main className="flex-1 p-6 space-y-4">
        {/* Back */}
        <Link
          to="/people"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to People &amp; Org
        </Link>

        <div className="flex gap-6 items-start">
          {/* ─── Left Sidebar ─────────────────────────────────── */}
          <div className="w-64 shrink-0 space-y-4">
            {/* Avatar + team name */}
            <Card className="p-5 flex flex-col items-center text-center gap-3 border border-border/70 bg-gradient-to-b from-violet-500/10 to-transparent">
              {/* Team icon badge */}
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 text-white text-2xl font-bold">
                {initials}
              </div>
              <div className="space-y-0.5">
                <h2 className="font-bold text-base text-foreground">{team.name}</h2>
                {team.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {team.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>Email Alias not available</span>
              </div>
            </Card>

            {/* Team Information */}
            <Card className="p-4 space-y-3 border border-border/60 bg-card/50 backdrop-blur-sm">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Team Information
              </h3>
              <div className="space-y-2 text-xs">
                <InfoRow label="Email Alias" value="Email Alias not available" />
                <InfoRow label="Team Lead" value={lead?.name ?? "Unassigned"} />
                <InfoRow label="Total Team Users" value={String(members.length)} />
                <InfoRow label="Associated Projects" value={String(associatedProjects.length)} />
              </div>
            </Card>

            {/* Timeline Information */}
            <Card className="p-4 space-y-3 border border-border/60 bg-card/50 backdrop-blur-sm">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Timeline Information
              </h3>
              <div className="space-y-2 text-xs">
                <InfoRow label="Created Time" value="N/A" />
                <InfoRow label="Created By" value={lead?.name ?? "—"} />
                <InfoRow label="Last Updated Time" value="N/A" />
                <InfoRow label="Last Modified By" value={lead?.name ?? "—"} />
              </div>
            </Card>

            {/* Department badge */}
            {dept && (
              <Card className="p-4 space-y-2 border border-border/60 bg-card/50">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Department
                </h3>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-50/10 text-emerald-700 text-xs"
                >
                  {dept.name}
                </Badge>
              </Card>
            )}
          </div>

          {/* ─── Main Content ─────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="border-b border-border bg-transparent p-0 gap-4 h-auto justify-start">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Activity Stream
                </TabsTrigger>
              </TabsList>

              {/* ── OVERVIEW TAB ── */}
              <TabsContent value="overview" className="space-y-5 mt-0 outline-none">
                {/* Charts Row */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Tasks Donut */}
                  <Card className="p-4 border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/20 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Tasks
                      </h4>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted">
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <DonutChart
                        data={taskStatusMap}
                        total={teamTasks.length}
                        label="Total"
                      />
                    </div>
                    {/* Legend */}
                    <div className="mt-3 space-y-1.5 max-h-[100px] overflow-y-auto">
                      {taskStatusMap.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="h-2.5 w-2.5 rounded-sm shrink-0"
                              style={{ background: d.color }}
                            />
                            {d.name}
                          </span>
                          <span className="font-mono font-semibold">{d.value}</span>
                        </div>
                      ))}
                      {taskStatusMap.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center italic">
                          No tasks yet
                        </p>
                      )}
                    </div>
                  </Card>

                  {/* Issues Donut */}
                  <Card className="p-4 border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/20 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Issues
                      </h4>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted">
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <DonutChart
                        data={issueStatusMap}
                        total={teamIssues.length}
                        label="Total"
                      />
                    </div>
                    <div className="mt-3 space-y-1.5 max-h-[100px] overflow-y-auto">
                      {issueStatusMap.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="h-2.5 w-2.5 rounded-sm shrink-0"
                              style={{ background: d.color }}
                            />
                            {d.name}
                          </span>
                          <span className="font-mono font-semibold">{d.value}</span>
                        </div>
                      ))}
                      {issueStatusMap.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center italic">
                          No issues yet
                        </p>
                      )}
                    </div>
                  </Card>

                  {/* Phases Donut */}
                  <Card className="p-4 border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/20 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Phases
                      </h4>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted">
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <DonutChart
                        data={phaseData}
                        total={allSprints.length}
                        label="Phases"
                      />
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {phaseData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="h-2.5 w-2.5 rounded-sm shrink-0"
                              style={{ background: d.color }}
                            />
                            {d.name}
                          </span>
                          <span className="font-mono font-semibold">{d.value}</span>
                        </div>
                      ))}
                      {phaseData.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center italic">
                          No phases yet
                        </p>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Team Users Section */}
                <Card className="p-5 border border-border/60 bg-card/60 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Users className="h-4 w-4 text-violet-500" />
                      Team Users ({filteredMembers.length})
                    </h3>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search members…"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="pl-7 h-8 text-xs bg-background/50 border-white/10 rounded-lg w-48"
                      />
                    </div>
                  </div>

                  {filteredMembers.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-border/40 rounded-xl">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-2" />
                      <p className="text-sm text-muted-foreground">No team members found.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredMembers.map((member) => {
                        const memberTasks = tasks.filter((t) =>
                          t.assigneeIds.includes(member.id)
                        );
                        const doneTasks = memberTasks.filter(
                          (t) => t.statusId === "s-done"
                        ).length;
                        const isLead = member.id === team.leadUserId;

                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/40 hover:bg-muted/20 hover:border-primary/20 transition-all group"
                          >
                            <div className="relative shrink-0">
                              <Avatar className="h-10 w-10 border-2 border-violet-500/20">
                                <AvatarFallback className="bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-xs font-bold text-violet-700">
                                  {member.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isLead && (
                                <Crown className="h-3 w-3 text-amber-500 absolute -top-1 -right-1" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {member.email}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {doneTasks}/{memberTasks.length} tasks done
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Associated Projects */}
                {associatedProjects.length > 0 && (
                  <Card className="p-5 border border-border/60 bg-card/60 backdrop-blur-sm space-y-3">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-indigo-500" />
                      Associated Projects ({associatedProjects.length})
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {associatedProjects.map((p) => {
                        const pTasks = teamTasks.filter((t) => t.projectId === p.id);
                        const done = pTasks.filter((t) => t.statusId === "s-done").length;
                        const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
                        return (
                          <Link
                            key={p.id}
                            to="/projects/$id"
                            params={{ id: p.id }}
                            className="block p-3 rounded-xl border border-border/40 bg-background/40 hover:border-primary/30 hover:bg-muted/20 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {p.name}
                              </p>
                              <Badge
                                variant={p.status === "ACTIVE" ? "default" : "secondary"}
                                className="text-[9px] uppercase shrink-0"
                              >
                                {p.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* ── ACTIVITY TAB ── */}
              <TabsContent value="activity" className="mt-0 outline-none">
                <Card className="p-6 border border-border/60">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Activity Stream</h3>
                  </div>
                  <div className="space-y-3">
                    {teamTasks.slice(0, 10).map((t) => {
                      const assignee = users.find((u) => t.assigneeIds.includes(u.id));
                      return (
                        <div
                          key={t.id}
                          className="flex items-start gap-3 border-b border-border/30 pb-3 last:border-0 last:pb-0"
                        >
                          <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Layers className="h-3 w-3 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {t.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Assigned to {assignee?.name ?? "Unassigned"} ·{" "}
                              {t.createdAt
                                ? format(new Date(t.createdAt), "MMM d, yyyy")
                                : "—"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase shrink-0"
                          >
                            {t.taskType}
                          </Badge>
                        </div>
                      );
                    })}
                    {teamTasks.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-sm italic">
                        No activity found for this team.
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="font-medium text-foreground text-right flex-1 truncate" title={value}>
        {value}
      </span>
    </div>
  );
}
