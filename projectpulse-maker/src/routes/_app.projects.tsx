import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useProjects, useTasks } from "@/lib/queries";
import { Plus, Calendar, ArrowRight, Search, SlidersHorizontal, FolderKanban, CheckSquare, Layers } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/projects")({
  head: () => ({ meta: [{ title: "Projects — TaskFlow Pro" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isProjectsRoot = pathname === "/projects";
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [] } = useTasks();

  // Search and filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  if (!isProjectsRoot) {
    return <Outlet />;
  }

  // Apply filters
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <>
      <Topbar title="Projects" />
      <main className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto text-xs relative overflow-hidden">
        {/* Large Background Decorative Route Icon */}
        <div className="absolute top-16 right-16 text-primary/5 pointer-events-none select-none z-0">
          <FolderKanban className="h-[420px] w-[420px] opacity-[0.02] -rotate-12 stroke-[1] animate-pulse" />
        </div>

        {/* Hero header banner */}
        <div className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent p-6 shadow-md rounded-2xl backdrop-blur-md z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <FolderKanban className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Projects Directory</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor project deliverables, check sprint progress, and coordinate tasks across all organization streams.
            </p>
            <div className="flex gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5 text-emerald-500" /> {filteredProjects.length} projects displayed</span>
              <span className="flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5 text-indigo-500" /> {projects.filter(p => p.status === "ACTIVE").length} active projects</span>
            </div>
          </div>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-glow hover-lift transition-all shrink-0">
            <Link to="/projects/new">
              <Plus className="mr-1.5 h-4 w-4" /> New Project
            </Link>
          </Button>
        </div>

        {/* Modern Search & Filters Bar */}
        <Card className="glass-card-green p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects by name or description..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 focus-visible:ring-primary rounded-xl bg-background/50 border-white/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Tab Group */}
            <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-white/10">
              {["ALL", "ACTIVE", "IN_REVIEW", "COMPLETED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${
                    statusFilter === status 
                      ? "bg-card text-foreground shadow-2xs" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "ALL" ? "All" : status.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Type Filter Selector */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-card border border-white/10 hover:border-primary/50 text-foreground rounded-xl px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors"
              >
                <option value="ALL">All Methodologies</option>
                <option value="KANBAN">Kanban</option>
                <option value="SCRUM">Scrum</option>
                <option value="WATERFALL">Waterfall</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="glass-card-green p-12 text-center text-sm text-muted-foreground rounded-2xl border-dashed">
            No projects found matching the criteria. Click "New Project" to get started!
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((p) => {
              const projectTasks = allTasks.filter(t => t.projectId === p.id);
              const taskCount = projectTasks.length;

              return (
                <Card
                  key={p.id}
                  className="group flex flex-col justify-between gap-5 p-6 transition-all duration-300 hover:scale-[1.01] glass-card-green rounded-2xl relative z-10"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 border-primary/20 text-primary bg-primary/5">
                        {p.type}
                      </Badge>
                      <StatusPill status={p.status} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                      <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{p.description || "No project description provided."}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Progress indicator */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Progress Completion</span>
                        <span className="font-mono text-primary">{p.progress ?? 0}%</span>
                      </div>
                      <Progress value={p.progress ?? 0} className="h-1.5 rounded-full" />
                    </div>

                    {/* Basic statistics */}
                    <div className="flex items-center gap-4 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5 text-primary" /> {taskCount} {taskCount === 1 ? "Task" : "Tasks"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-primary" /> Phase Driven
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {format(new Date(p.startDate), "MMM d")} — {format(new Date(p.endDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    
                    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs hover:bg-primary hover:text-primary-foreground rounded-xl transition-all duration-300">
                      <Link to="/projects/$id" params={{ id: p.id }}>
                        Dashboard <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : status === "IN_REVIEW"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tone}`}>
      {status.replace("_", " ")}
    </span>
  );
}
