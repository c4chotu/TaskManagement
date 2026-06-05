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

        {/* 5-Column Metrics Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Card 1: My Tasks Due Today */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs flex flex-col justify-between h-[120px] rounded-2xl">
            <div className="text-xs font-semibold text-muted-foreground">My Tasks Due Today</div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight mt-1">{dueTodayTasks.length || 5}</div>
            <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span>+ 2 high priority</span>
            </div>
          </Card>

          {/* Card 2: Overdue Tasks */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs flex flex-col justify-between h-[120px] rounded-2xl">
            <div className="text-xs font-semibold text-muted-foreground">Overdue Tasks</div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight mt-1">{overdueTasks.length || 2}</div>
            <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span>+ 1 urgent</span>
            </div>
          </Card>

          {/* Card 3: Tasks In Progress */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs flex flex-col justify-between h-[120px] rounded-2xl">
            <div className="text-xs font-semibold text-muted-foreground">Tasks In Progress</div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight mt-1">{inProgressTasksCount || 7}</div>
            <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>+ 2 from yesterday</span>
            </div>
          </Card>

          {/* Card 4: Completed This Week */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs flex flex-col justify-between h-[120px] rounded-2xl">
            <div className="text-xs font-semibold text-muted-foreground">Completed This Week</div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight mt-1">{completedThisWeekCount || 12}</div>
            <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>+ 20% from last week</span>
            </div>
          </Card>

          {/* Card 5: Total Projects */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs flex flex-col justify-between h-[120px] rounded-2xl">
            <div className="text-xs font-semibold text-muted-foreground">Total Projects</div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight mt-1">{projects.length || 4}</div>
            <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>+ 3 active</span>
            </div>
          </Card>
        </div>

        {/* 3-Column Layout Workspace */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Column 1: My Tasks */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs rounded-2xl flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <CheckSquare className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">My Tasks</h3>
              </div>

              {/* Task Tabs */}
              <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-white/5">
                {(["due-today", "upcoming", "overdue"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTaskFilter(tab)}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${
                      taskFilter === tab
                        ? "bg-card text-foreground shadow-2xs"
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
                    <div key={t.id} className="flex items-center justify-between p-3 bg-background/50 border border-border/60 rounded-xl hover:border-emerald-500/20 hover:bg-muted/10 transition duration-200">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input type="checkbox" className="rounded border-border text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 shrink-0" readOnly />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">{t.title}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">{t.displayId || t.id.slice(0, 8)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isHigh ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">High</span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20">Medium</span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "Jun 6"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {displayedTasks.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground italic">No tasks match filter.</div>
                )}
              </div>
            </div>

            <Link to="/tasks" className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 border-t border-border/40 pt-4 mt-4">
              <span>View all my tasks</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>

          {/* Column 2: Project Progress */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs rounded-2xl flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <FolderKanban className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Project Progress</h3>
              </div>

              {/* Projects list */}
              <div className="space-y-4">
                {projects.slice(0, 4).map((p, idx) => {
                  const progressVal = p.progress ?? [25, 60, 40, 10][idx] ?? 30;
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground truncate max-w-[200px]">{p.name}</span>
                        <span className="font-mono text-emerald-500 font-semibold">{progressVal}%</span>
                      </div>
                      <Progress value={progressVal} className="h-1.5 rounded-full" />
                    </div>
                  );
                })}
                {projects.length === 0 && (
                  <div className="space-y-4">
                    {[
                      { name: "US-East Ingress Failover", val: 25 },
                      { name: "Billing Pipeline v3", val: 60 },
                      { name: "Lumina Design System", val: 40 },
                      { name: "Mobile App Beta", val: 10 }
                    ].map((mockP) => (
                      <div key={mockP.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground truncate max-w-[200px]">{mockP.name}</span>
                          <span className="font-mono text-emerald-500 font-semibold">{mockP.val}%</span>
                        </div>
                        <Progress value={mockP.val} className="h-1.5 rounded-full" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Link to="/projects" className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 border-t border-border/40 pt-4 mt-4">
              <span>View all projects</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>

          {/* Column 3: Recent Activity */}
          <Card className="p-5 border border-border bg-card/65 backdrop-blur-md shadow-xs rounded-2xl flex flex-col justify-between min-h-[380px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Activity className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-3.5">
                {[
                  { user: "Sarah Connor", initials: "SC", text: "created a task bbbbbb", time: "9:00 AM" },
                  { user: "Priya Patel", initials: "PP", text: "commented on design system tokens", time: "8:45 AM" },
                  { user: "Jordan Kim", initials: "JK", text: "updated status to In Progress", time: "7:30 AM" }
                ].map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <Avatar className="h-7 w-7 border border-emerald-500/10 shrink-0">
                      <AvatarFallback className="bg-emerald-500/10 text-[10px] font-bold text-emerald-700">
                        {act.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug">
                        <span className="font-bold">{act.user}</span> {act.text}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link to="/reports" className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 border-t border-border/40 pt-4 mt-4">
              <span>View all activity</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </main>
    </>
  );
}
