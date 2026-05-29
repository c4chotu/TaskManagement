import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, LogOut, Folder, CheckSquare, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useProjects, useTasks } from "@/lib/queries";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

export function Topbar({ title, actions }: { title?: string; actions?: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [open, setOpen] = useState(false);
  
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          {title && <h1 className="text-sm font-semibold tracking-tight">{title}</h1>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="relative hidden md:flex items-center text-left text-muted-foreground hover:text-foreground border border-border bg-muted/10 hover:bg-muted/25 rounded-md h-8 w-64 px-3 text-[11px] transition-all duration-150 gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
            <span className="flex-1 text-muted-foreground/80">Search projects, tasks...</span>
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-medium opacity-100">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </button>
          
          {actions}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => { logout(); navigate({ to: "/login" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a project, task, or incident..." />
        <CommandList className="scrollbar-thin">
          <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
            No results found.
          </CommandEmpty>
          
          {projects.length > 0 && (
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project ${project.name} ${project.description || ""}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: "/projects/$id", params: { id: project.id } });
                  }}
                  className="flex items-start gap-3 cursor-pointer py-3 hover:bg-accent/50 rounded-md transition-colors"
                >
                  <Folder className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-xs text-foreground truncate">{project.name}</span>
                    {project.description && (
                      <span className="text-[10px] text-muted-foreground line-clamp-1 font-normal">
                        {project.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {projects.length > 0 && tasks.length > 0 && <CommandSeparator />}

          {tasks.length > 0 && (
            <CommandGroup heading="Tasks & Incidents">
              {tasks.map((task) => {
                const isIncident = task.taskType === "INCIDENT";
                const proj = projects.find((p) => p.id === task.projectId);
                return (
                  <CommandItem
                    key={task.id}
                    value={`${isIncident ? "incident" : "task"} ${task.id} ${task.title} ${task.description || ""}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate({ to: "/tasks/$id", params: { id: task.id } });
                    }}
                    className="flex items-start gap-3 cursor-pointer py-3 hover:bg-accent/50 rounded-md transition-colors"
                  >
                    {isIncident ? (
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    ) : (
                      <CheckSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-primary/80 bg-primary/10 px-1 rounded shrink-0">{task.id}</span>
                        <span className="font-medium text-xs text-foreground truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
                        {proj && (
                          <span className="bg-muted px-1.5 py-0.5 rounded-sm truncate max-w-[150px]">
                            {proj.name}
                          </span>
                        )}
                        <span className="capitalize">{task.taskType.toLowerCase()}</span>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
