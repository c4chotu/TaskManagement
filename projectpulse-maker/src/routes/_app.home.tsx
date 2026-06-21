import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { useProjects, useTasks, useUsers } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import {
  CalendarDays,
  FolderKanban,
  CheckSquare,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Settings,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isToday, isPast } from "date-fns";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — TaskFlow Pro" }] }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: users = [] } = useUsers();

  const [taskFilter, setTaskFilter] = useState<"due-today" | "upcoming" | "overdue">("due-today");

  // Dynamic user data calculations
  const myTasks = useMemo(() => {
    return user ? tasks.filter((t) => t.assigneeIds.includes(user.id)) : [];
  }, [user, tasks]);

  const myOpenTasks = useMemo(() => myTasks.filter((t) => t.statusId !== "s-done"), [myTasks]);

  const dueTodayTasks = useMemo(() => {
    return myOpenTasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
  }, [myOpenTasks]);

  const overdueTasks = useMemo(() => {
    return myOpenTasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  }, [myOpenTasks]);

  const upcomingTasks = useMemo(() => {
    return myOpenTasks.filter((t) => !t.dueDate || (!isToday(new Date(t.dueDate)) && !isPast(new Date(t.dueDate))));
  }, [myOpenTasks]);

  const inProgressTasksCount = useMemo(() => {
    return myTasks.filter((t) => t.statusId === "s-progress" || t.statusId === "s-in-progress" || t.statusId === "s-review").length;
  }, [myTasks]);

  const completedThisWeekCount = useMemo(() => {
    return myTasks.filter((t) => t.statusId === "s-done").length;
  }, [myTasks]);

  const displayedTasks = useMemo(() => {
    if (taskFilter === "due-today") return dueTodayTasks.length > 0 ? dueTodayTasks : myOpenTasks.slice(0, 3);
    if (taskFilter === "overdue") return overdueTasks.length > 0 ? overdueTasks : myOpenTasks.slice(0, 3);
    return upcomingTasks.length > 0 ? upcomingTasks : myOpenTasks.slice(0, 3);
  }, [taskFilter, dueTodayTasks, overdueTasks, upcomingTasks, myOpenTasks]);

  return (
    <>
      <Topbar title="Home" />
      <main className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto text-xs relative overflow-hidden bg-background">
        {/* Waving Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Good morning, {user?.name?.split(" ")[0] || "Sarah"}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">Here's what's happening with your work today.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="border-border hover:bg-muted font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs">
              <Settings className="h-3.5 w-3.5" /> Customize
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8 border-border hover:bg-muted rounded-xl shadow-2xs">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 5-Column Metrics Grid — operational, click-through */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "My Tasks Due Today", value: dueTodayTasks.length || 0, sub: `${dueTodayTasks.filter(t => t.priority === "HIGH" || t.priority === "CRITICAL").length} high priority`, tone: "red", icon: <Clock className="h-3 w-3" />, to: "/tasks" as const },
            { label: "Overdue Tasks", value: overdueTasks.length || 0, sub: `${overdueTasks.filter(t => t.priority === "HIGH" || t.priority === "CRITICAL").length} urgent`, tone: "red", icon: <AlertTriangle className="h-3 w-3" />, to: "/tasks" as const },
            { label: "Tasks In Progress", value: inProgressTasksCount || 0, sub: "Currently active", tone: "blue", icon: <Activity className="h-3 w-3" />, to: "/tasks" as const },
            { label: "Completed This Week", value: completedThisWeekCount || 0, sub: "Great job!", tone: "emerald", icon: <CheckCircle2 className="h-3 w-3" />, to: "/tasks" as const },
            { label: "Total Projects", value: projects.length || 0, sub: `${projects.filter(p => p.status === "ACTIVE").length} active`, tone: "emerald", icon: <FolderKanban className="h-3 w-3" />, to: "/projects" as const },
          ].map((c) => {
            const toneCls: Record<string, string> = {
              red: "text-rose-500 bg-rose-500/10 border-rose-500/20",
              blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
              emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            };
            return (
              <Link
                key={c.label}
                to={c.to}
                className="group relative overflow-hidden p-4 border border-border/50 bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-emerald-500/40 hover:shadow-lg hover:-translate-y-0.5 transition-all rounded-2xl flex flex-col justify-between h-[120px]"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-muted-foreground">{c.label}</div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                </div>
                <div className="text-3xl font-extrabold text-foreground tracking-tight">{c.value}</div>
                <div className={`inline-flex items-center gap-1 self-start text-[10px] font-bold px-2 py-0.5 rounded-full border ${toneCls[c.tone]}`}>
                  {c.icon}<span>{c.sub}</span>
                </div>
              </Link>
            );
          })}
        </div>


        {/* 3-Column Layout Workspace */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Column 1: My Tasks */}
          <Card className="p-5 border border-border/40 bg-card/30 backdrop-blur-xl shadow-lg rounded-2xl flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                <CheckSquare className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">My Tasks</h3>
              </div>

              {/* Task Tabs */}
              <div className="flex items-center bg-background/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                {(["due-today", "upcoming", "overdue"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTaskFilter(tab)}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${
                      taskFilter === tab
                        ? "bg-card/80 text-foreground shadow-sm border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.replace("-", " ")}
                  </button>
                ))}
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5">
                {displayedTasks.map((t) => {
                  const isHigh = t.priority === "HIGH" || t.priority === "CRITICAL";
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-background/30 border border-border/40 rounded-xl hover:border-emerald-500/30 hover:bg-background/50 transition duration-200">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input type="checkbox" className="rounded border-border/50 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 shrink-0 bg-transparent" readOnly />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{t.title}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">{t.displayId || t.id.slice(0, 8)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isHigh ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">High</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">Normal</span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "No Date"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {displayedTasks.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground italic bg-background/20 rounded-xl border border-dashed border-border/40">
                    No tasks match this filter.
                  </div>
                )}
              </div>
            </div>

            <Link to="/tasks" className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 border-t border-border/30 pt-4 mt-4">
              <span>View all my tasks</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>

          {/* Column 2: Project Progress */}
          <Card className="p-5 border border-border/40 bg-card/30 backdrop-blur-xl shadow-lg rounded-2xl flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                <FolderKanban className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Project Progress</h3>
              </div>

              {/* Projects list */}
              <div className="space-y-4">
                {projects.slice(0, 6).map((p) => {
                  const progressVal = p.progress ?? 0;
                  return (
                    <div key={p.id} className="space-y-1.5 p-2 rounded-xl hover:bg-background/40 transition-colors border border-transparent hover:border-border/40 -mx-2">
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="font-bold text-foreground truncate max-w-[200px]">{p.name}</span>
                        <span className="font-mono text-emerald-500 font-semibold">{progressVal}%</span>
                      </div>
                      <div className="px-2">
                        <Progress value={progressVal} className="h-1.5 rounded-full bg-background/50 border border-border/30" />
                      </div>
                    </div>
                  );
                })}
                {projects.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground italic bg-background/20 rounded-xl border border-dashed border-border/40">
                    No active projects found.
                  </div>
                )}
              </div>
            </div>

            <Link to="/projects" className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 border-t border-border/30 pt-4 mt-4">
              <span>View all projects</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>

          {/* Column 3: Recent Activity */}
          <Card className="p-5 border border-border/40 bg-card/30 backdrop-blur-xl shadow-lg rounded-2xl flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                <Activity className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              </div>

              {/* Activity Timeline built from actual tasks */}
              <div className="space-y-3.5">
                {[...tasks]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((t) => {
                    const assignee = users.find(u => u.id === t.assigneeIds[0]);
                    const name = assignee?.name || "System";
                    const initials = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
                    
                    return (
                      <div key={t.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-background/40 transition-colors border border-transparent hover:border-border/40 -mx-2">
                        <Avatar className="h-7 w-7 border border-emerald-500/20 shrink-0 shadow-sm">
                          <AvatarFallback className="bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground leading-snug">
                            <span className="font-bold">{name}</span> created task <span className="text-muted-foreground font-medium">{t.displayId || t.title}</span>
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {format(new Date(t.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground italic bg-background/20 rounded-xl border border-dashed border-border/40">
                      No recent activity.
                    </div>
                  )}
              </div>
            </div>

            <Link to="/reports" className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 border-t border-border/30 pt-4 mt-4">
              <span>View all activity</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </main>
    </>
  );
}
