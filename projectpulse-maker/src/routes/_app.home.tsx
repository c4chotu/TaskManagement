import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { useIssues, useProjects, useStatuses, useTasks, useTimeEntries, useUsers } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { ZWidget, ZCountTile, ZEmpty } from "@/components/tfp/zoho";
import {
  Calendar, AlertOctagon, ListChecks, Clock, FolderKanban,
  Bug, FileWarning, Users, TrendingUp, Activity, LayoutGrid, Check, RotateCcw, Plus, ChevronUp, ChevronDown, X,
  SettingsIcon
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, isToday, isPast, isThisWeek } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/tfp/badges";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — TaskFlow Pro" }] }),
  component: HomePage,
});

const ALL_WIDGETS = [
  { id: "dueToday", title: "My Items Due Today", desc: "List of your assigned items due by today's date" },
  { id: "overdue", title: "My Overdue Items", desc: "Work items assigned to you that are overdue" },
  { id: "events", title: "My Upcoming Events", desc: "Scheduled team calendar events and shifts" },
  { id: "myTasks", title: "My Active Tasks", desc: "Detailed table of your active assigned tasks" },
  { id: "myIssues", title: "My Active Issues", desc: "List of open incident bugs assigned to you" },
  { id: "myTimesheet", title: "My Timesheet Summary", desc: "Weekly logged hours analytics progress" },
  { id: "recentProjects", title: "Recent Projects", desc: "Overview of recently active projects and progress" }
];

function HomePage() {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();
  const { data: statuses = [] } = useStatuses();
  const { data: entries = [] } = useTimeEntries();

  const myTasks = useMemo(() => {
    return user ? tasks.filter((t) => t.assigneeIds.includes(user.id)) : [];
  }, [user, tasks]);

  const myOpenTasks = useMemo(() => myTasks.filter((t) => t.statusId !== "s-done"), [myTasks]);
  const myClosedTasks = useMemo(() => myTasks.filter((t) => t.statusId === "s-done"), [myTasks]);
  const myIssues = useMemo(() => issues.filter((i) => !i.resolved), [issues]);
  const dueToday = useMemo(() => myOpenTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate))), [myOpenTasks]);
  const overdue = useMemo(() => myOpenTasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))), [myOpenTasks]);
  const recentProjects = useMemo(() => projects.slice(0, 6), [projects]);

  const weekHours = useMemo(() => {
    return entries
      .filter((e) => e.startTime && isThisWeek(new Date(e.startTime)))
      .reduce((s, e) => s + (e.hours ?? 0), 0);
  }, [entries]);

  // Layout customization state
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);

  useEffect(() => {
    if (user?.email) {
      const saved = localStorage.getItem(`tfp.home.layout.${user.email}`);
      if (saved) {
        try {
          setActiveWidgets(JSON.parse(saved));
          return;
        } catch (e) { }
      }
    }
    setActiveWidgets(["dueToday", "overdue", "events", "myTasks", "myIssues", "myTimesheet", "recentProjects"]);
  }, [user]);

  const handleSaveLayout = () => {
    if (user?.email) {
      localStorage.setItem(`tfp.home.layout.${user.email}`, JSON.stringify(activeWidgets));
      toast.success("Home page widget layout saved!");
      setIsCustomizing(false);
    }
  };

  const handleResetLayout = () => {
    const defaultLayout = ["dueToday", "overdue", "events", "myTasks", "myIssues", "myTimesheet", "recentProjects"];
    setActiveWidgets(defaultLayout);
    if (user?.email) {
      localStorage.setItem(`tfp.home.layout.${user.email}`, JSON.stringify(defaultLayout));
    }
    toast.success("Home page layout reset to default!");
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
        case "dueToday":
          return (
            <ZWidget title="My Work Items Due Today" subtitle={`${dueToday.length} item${dueToday.length === 1 ? "" : "s"}`} className="w-full h-full">
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
          );
        case "overdue":
          return (
            <ZWidget title="My Overdue Work Items" subtitle={`${overdue.length} overdue`} className="w-full h-full">
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
          );
        case "events":
          return (
            <ZWidget title="My Events" subtitle="Upcoming" className="w-full h-full">
              <ZEmpty icon={Calendar} title="You don't have any scheduled events." />
            </ZWidget>
          );
        case "myTasks":
          return (
            <ZWidget title="My Tasks" subtitle={`${myOpenTasks.length} open`} className="w-full h-full">
              {myOpenTasks.length === 0 ? (
                <ZEmpty icon={ListChecks} title="No tasks assigned to you." />
              ) : (
                <div className="overflow-x-auto text-xs">
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
                              <Link to="/tasks/$id" params={{ id: t.id }} className="text-foreground hover:text-primary hover:underline font-semibold">
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
                </div>
              )}
            </ZWidget>
          );
        case "myIssues":
          return (
            <ZWidget title="My Issues" subtitle={`${myIssues.length} open`} className="w-full h-full">
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
          );
        case "myTimesheet":
          return (
            <ZWidget title="My Timesheet" subtitle="This week" className="w-full h-full">
              <div className="flex flex-col items-center justify-center gap-1 px-4 py-6">
                <div className="text-3xl font-semibold tabular-nums text-foreground">{weekHours.toFixed(1)}<span className="ml-1 text-base font-normal text-muted-foreground">h</span></div>
                <p className="text-[11px] text-muted-foreground">logged this week</p>
                <Link to="/time" className="mt-2 text-[11px] text-info hover:underline">
                  Go to Timesheet →
                </Link>
              </div>
            </ZWidget>
          );
        case "recentProjects":
          return (
            <ZWidget title="Recent Projects" subtitle={`${projects.length} total`} actions={
              <Link to="/projects" className="text-[11px] text-info hover:underline">View all →</Link>
            } className="w-full h-full">
              {recentProjects.length === 0 ? (
                <ZEmpty icon={FolderKanban} title="No projects yet." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {recentProjects.map((p) => (
                    <li key={p.id} className="px-3 py-2">
                      <Link to="/projects/$id" params={{ id: p.id }} className="flex items-center gap-3 hover:bg-muted/40 rounded-lg p-1.5">
                        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-semibold text-foreground">{p.name}</p>
                          <p className="truncate text-[10.5px] text-muted-foreground">
                            {p.type} · {p.status}
                          </p>
                        </div>
                        <div className="w-24 hidden sm:block">
                          <Progress value={p.progress ?? 0} className="h-1.5" />
                        </div>
                        <span className="w-9 text-right font-mono text-[10.5px] text-muted-foreground shrink-0">
                          {p.progress ?? 0}%
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ZWidget>
          );
        default:
          return null;
      }
    })();

    const isLarge = id === "myTasks" || id === "recentProjects";

    return (
      <div key={id} className={`relative border rounded-2xl overflow-hidden transition-all duration-300 ${isCustomizing
          ? "border-emerald-500/40 shadow-[0_4px_16px_rgba(16,185,129,0.15)] bg-emerald-500/5 scale-[0.98] ring-1 ring-emerald-500/25"
          : "border-transparent"
        } ${isLarge ? "lg:col-span-2" : ""}`}>
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
      <Topbar title="My Operations Space" />
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden">

        {/* Customize Toolbar Banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent px-5 py-4 rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <LayoutGrid className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Personalize Workspace</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Rearrange, add, or hide your operations control widgets. Custom home page layouts are saved to your account.
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
              <Plus className="h-4 w-4" /> Add Widgets to Workspace
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
                <p className="text-xs text-muted-foreground italic col-span-full">All widgets are active on your personal workspace.</p>
              )}
            </div>
          </Card>
        )}

        {/* Top tile row — Zoho-style colored count tiles */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 relative z-10">
          <ZCountTile label="Open Tasks" count={myOpenTasks.length} tone="primary" to="/tasks" />
          <ZCountTile label="Closed Tasks" count={myClosedTasks.length} tone="muted" />
          <ZCountTile label="Open Issues" count={myIssues.length} tone="destructive" to="/incidents" />
          <ZCountTile label="Due Today" count={dueToday.length} tone="warning" />
          <ZCountTile label="Overdue" count={overdue.length} tone="destructive" />
          <ZCountTile label="Projects" count={projects.length} tone="info" to="/projects" />
        </section>

        {/* Dynamic Reorderable Workspace widgets */}
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3 relative z-10">
          {activeWidgets.map((id, index) => renderWidget(id, index))}
        </section>
      </main>
    </>
  );
}
