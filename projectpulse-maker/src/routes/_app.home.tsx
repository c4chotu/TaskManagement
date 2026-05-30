import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { useIssues, useProjects, useStatuses, useTasks, useTimeEntries, useUsers, useWorkload } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { ZWidget, ZCountTile, ZEmpty } from "@/components/tfp/zoho";
import { Calendar, AlertOctagon, ListChecks, Clock, FolderKanban, Bug, FileWarning, Users, TrendingUp, Activity } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isPast, isThisWeek } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/tfp/badges";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — TaskFlow Pro" }] }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();
  const { data: statuses = [] } = useStatuses();
  const { data: entries = [] } = useTimeEntries();
  const { data: users = [] } = useUsers();

  const myTasks = user ? tasks.filter((t) => t.assigneeIds.includes(user.id)) : [];
  const myOpenTasks = myTasks.filter((t) => t.statusId !== "s-done");
  const myClosedTasks = myTasks.filter((t) => t.statusId === "s-done");
  const myIssues = issues.filter((i) => !i.resolved);
  const dueToday = myOpenTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
  const overdue = myOpenTasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  const recentProjects = projects.slice(0, 6);

  const weekHours = entries
    .filter((e) => e.startTime && isThisWeek(new Date(e.startTime)))
    .reduce((s, e) => s + (e.hours ?? 0), 0);

  return (
    <>
      <Topbar title="Home" />
      <main className="flex-1 space-y-4 p-5">
        {/* Top tile row — Zoho-style colored count tiles */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <ZCountTile label="Open Tasks" count={myOpenTasks.length} tone="primary" to="/tasks" />
          <ZCountTile label="Closed Tasks" count={myClosedTasks.length} tone="muted" />
          <ZCountTile label="Open Issues" count={myIssues.length} tone="destructive" to="/incidents" />
          <ZCountTile label="Due Today" count={dueToday.length} tone="warning" />
          <ZCountTile label="Overdue" count={overdue.length} tone="destructive" />
          <ZCountTile label="Projects" count={projects.length} tone="info" to="/projects" />
        </section>

        {/* Row 1 — My work + events */}
        <section className="grid gap-3 lg:grid-cols-3">
          <ZWidget title="My Work Items Due Today" subtitle={`${dueToday.length} item${dueToday.length === 1 ? "" : "s"}`}>
            {dueToday.length === 0 ? (
              <ZEmpty icon={ListChecks} title="No results found." hint="No work items are due today." />
            ) : (
              <ul className="divide-y divide-border/60">
                {dueToday.map((t) => (
                  <li key={t.id}>
                    <Link to="/tasks/$id" params={{ id: t.id }} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                      <StatusDot color={statuses.find((s) => s.id === t.statusId)?.color ?? "#94a3b8"} />
                      <span className="flex-1 truncate text-[12.5px] text-foreground">{t.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {t.dueDate ? format(new Date(t.dueDate), "MMM d") : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ZWidget>

          <ZWidget title="My Overdue Work Items" subtitle={`${overdue.length} overdue`}>
            {overdue.length === 0 ? (
              <ZEmpty icon={ListChecks} title="You're on track" hint="Nothing overdue right now." />
            ) : (
              <ul className="divide-y divide-border/60">
                {overdue.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <Link to="/tasks/$id" params={{ id: t.id }} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                      <FileWarning className="h-3.5 w-3.5 text-destructive" />
                      <span className="flex-1 truncate text-[12.5px]">{t.title}</span>
                      <span className="text-[10px] font-mono text-destructive">
                        {t.dueDate ? format(new Date(t.dueDate), "MMM d") : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ZWidget>

          <ZWidget title="My Events" subtitle="Upcoming">
            <ZEmpty icon={Calendar} title="You don't have any scheduled events." />
          </ZWidget>
        </section>

        {/* Row 2 — My tasks & issues */}
        <section className="grid gap-3 lg:grid-cols-2">
          <ZWidget title="My Tasks" subtitle={`${myOpenTasks.length} open`}>
            {myOpenTasks.length === 0 ? (
              <ZEmpty icon={ListChecks} title="No tasks assigned to you." />
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className="bg-muted/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Title</th>
                    <th className="px-3 py-1.5 font-medium">Status</th>
                    <th className="px-3 py-1.5 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {myOpenTasks.slice(0, 8).map((t) => {
                    const s = statuses.find((x) => x.id === t.statusId);
                    return (
                      <tr key={t.id} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-3 py-1.5">
                          <Link to="/tasks/$id" params={{ id: t.id }} className="text-foreground hover:text-primary hover:underline">
                            {t.title}
                          </Link>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <StatusDot color={s?.color ?? "#94a3b8"} />
                            <span className="text-[11px] text-muted-foreground">{s?.name}</span>
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                          {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </ZWidget>

          <ZWidget title="My Issues" subtitle={`${myIssues.length} open`}>
            {myIssues.length === 0 ? (
              <ZEmpty icon={Bug} title="No open issues." />
            ) : (
              <ul className="divide-y divide-border/60">
                {myIssues.slice(0, 8).map((i) => {
                  const t = tasks.find((x) => x.id === i.taskId);
                  return (
                    <li key={i.id}>
                      <Link
                        to="/incidents/$id"
                        params={{ id: i.taskId }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40"
                      >
                        <span
                          className="inline-flex h-4 min-w-[34px] items-center justify-center rounded-sm px-1 text-[9px] font-bold text-white"
                          style={{ background: `var(--color-sev-${i.severity.slice(-1)})` }}
                        >
                          {i.severity}
                        </span>
                        <span className="flex-1 truncate text-[12.5px]">{t?.title}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">{i.environment}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </ZWidget>
        </section>

        {/* Row 3 — My Timesheet + Recent Projects + Team */}
        <section className="grid gap-3 lg:grid-cols-3">
          <ZWidget title="My Timesheet" subtitle="This week">
            <div className="flex flex-col items-center justify-center gap-1 px-4 py-6">
              <div className="text-3xl font-semibold tabular-nums text-foreground">{weekHours.toFixed(1)}<span className="ml-1 text-base font-normal text-muted-foreground">h</span></div>
              <p className="text-[11px] text-muted-foreground">logged this week</p>
              <Link to="/time" className="mt-2 text-[11px] text-info hover:underline">
                Go to Timesheet →
              </Link>
            </div>
          </ZWidget>

          <ZWidget title="Recent Projects" subtitle={`${projects.length} total`} className="lg:col-span-2">
            {recentProjects.length === 0 ? (
              <ZEmpty icon={FolderKanban} title="No projects yet." />
            ) : (
              <ul className="divide-y divide-border/60">
                {recentProjects.map((p) => (
                  <li key={p.id}>
                    <Link to="/projects/$id" params={{ id: p.id }} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
                      <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-foreground">{p.name}</p>
                        <p className="truncate text-[10.5px] text-muted-foreground">
                          {p.type} · {p.status}
                        </p>
                      </div>
                      <div className="w-32">
                        <Progress value={p.progress ?? 0} className="h-1.5" />
                      </div>
                      <span className="w-9 text-right font-mono text-[10.5px] text-muted-foreground">
                        {p.progress ?? 0}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ZWidget>
        </section>
      </main>
    </>
  );
}
