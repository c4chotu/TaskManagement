import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Bell, Search, LogOut, Folder, CheckSquare, AlertCircle, Clock, Pause, Sparkles, Users, Layers, Building
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useProjects, useTasks, useTimeEntries, useStopTimer } from "@/lib/queries";
import { toast } from "sonner";
import { apiRequest, USE_MOCK } from "@/lib/api";
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
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: timeEntries = [] } = useTimeEntries();
  const stopTimer = useStopTimer();

  const runningEntry = timeEntries.find((te) => !te.endTime);
  const runningTask = runningEntry ? tasks.find((t) => t.id === runningEntry.taskId) : null;

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (runningEntry) {
      const start = new Date(runningEntry.startTime).getTime();
      const update = () => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [runningEntry]);

  const handlePause = async () => {
    if (runningEntry) {
      try {
        await stopTimer.mutateAsync(runningEntry.id);
        toast.success("Timer paused & time saved");
      } catch {
        toast.error("Failed to pause timer");
      }
    }
  };

  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setSearchResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (!USE_MOCK) {
          const res = await apiRequest<any>(`/search?q=${encodeURIComponent(searchValue)}`);
          setSearchResults(res);
        } else {
          const q = searchValue.trim().toLowerCase();
          const matchedTasks = tasks.filter((t: any) => {
            if (!q) return true;
            return (
              t.title?.toLowerCase().includes(q) ||
              t.description?.toLowerCase().includes(q) ||
              t.id?.toLowerCase().includes(q) ||
              (t.displayId && t.displayId.toLowerCase().includes(q))
            );
          });
          const matchedProjects = projects.filter((p: any) => {
            if (!q) return true;
            return (
              p.name?.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q) ||
              p.key?.toLowerCase().includes(q)
            );
          });

          const { mockUsers = [], mockTeams = [], mockDepartments = [] } = await import("@/lib/mock-data");

          const matchedUsers = mockUsers.filter((u: any) => {
            if (!q) return true;
            return (
              u.name?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              u.role?.toLowerCase().includes(q)
            );
          });
          const matchedTeams = mockTeams.filter((t: any) => {
            if (!q) return true;
            return (
              t.name?.toLowerCase().includes(q) ||
              t.description?.toLowerCase().includes(q)
            );
          });
          const matchedDepts = mockDepartments.filter((d: any) => {
            if (!q) return true;
            return (
              d.name?.toLowerCase().includes(q) ||
              d.description?.toLowerCase().includes(q)
            );
          });

          let aiSummary = "";
          if (!q) {
            aiSummary = "Hello! I am your **Gemini AI Search Assistant**. Type a query in the search bar above to fetch projects, tasks, members, or workload stats, and I'll generate a contextual breakdown for you in real-time.";
          } else if (
            matchedTasks.length === 0 &&
            matchedProjects.length === 0 &&
            matchedUsers.length === 0 &&
            matchedTeams.length === 0 &&
            matchedDepts.length === 0
          ) {
            aiSummary = `### Gemini AI Analysis for "${searchValue}"\n\nI ran a semantic scan across all modules, but no records matched "${searchValue}". Try searching for active projects (e.g. 'NETIQ'), users, or task topics.`;
          } else {
            aiSummary = `### Gemini AI Analysis for "${searchValue}"\n\nHere is a summary of matches found in your organization:\n`;
            if (matchedProjects.length > 0) {
              aiSummary += `- 📁 **Projects**: Found ${matchedProjects.length} project(s). Key match: **${matchedProjects[0].name}**.\n`;
            }
            if (matchedTasks.length > 0) {
              const openCount = matchedTasks.filter((t: any) => t.statusId !== "s-done").length;
              aiSummary += `- 📝 **Tasks & Incidents**: Found ${matchedTasks.length} task(s), with ${openCount} active. Key item: **${matchedTasks[0].title}**.\n`;
            }
            if (matchedUsers.length > 0) {
              aiSummary += `- 👥 **People**: Found ${matchedUsers.length} member(s). Top: **${matchedUsers[0].name}** (Role: \`${(matchedUsers[0] as any).roleName ?? "MEMBER"}\`).\n`;
            }
            if (matchedTeams.length > 0) {
              aiSummary += `- 🗂️ **Teams**: ${matchedTeams.length} team(s) matching.\n`;
            }
            aiSummary += `\n**Gemini Recommendation**: Review the matching results below to check status, adjust priorities, or reassign tasks.`;
          }

          setSearchResults({
            query: searchValue,
            aiSummary,
            tasks: matchedTasks.map((t: any) => ({ ...t, taskType: t.taskType || "TASK" })),
            projects: matchedProjects,
            users: matchedUsers,
            teams: matchedTeams,
            departments: matchedDepts,
          });
        }
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue, open, tasks, projects]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          {title && <h1 className="text-sm font-semibold tracking-tight">{title}</h1>}
        </div>

        {/* Global time tracking widget */}
        {runningEntry && (
          <div className="mx-auto flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full py-1 px-3.5 shadow-[0_0_12px_rgba(16,185,129,0.1)] transition-all animate-in fade-in slide-in-from-top-1 text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Clock className="h-3.5 w-3.5 text-emerald-500 animate-[spin_4s_linear_infinite]" />
            <span className="font-semibold text-foreground truncate max-w-[120px] md:max-w-[200px]" title={runningTask?.title || "Active Task"}>
              {runningTask ? (runningTask.displayId || runningTask.id.toUpperCase().slice(0, 8)) : "Tracking"} — {runningTask?.title || "Active Session"}
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
              {formatTimer(elapsed)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePause}
              disabled={stopTimer.isPending}
              className="h-5 w-5 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 rounded-full"
              title="Pause tracking"
            >
              <Pause className="h-3 w-3 fill-orange-500" />
            </Button>
          </div>
        )}

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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a project, task, or incident..."
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList className="scrollbar-thin">
          <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
            No results found.
          </CommandEmpty>

          {/* Sparkles Gemini Summary */}
          {searchResults && searchResults.aiSummary && (
            <div className="m-3 p-4 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent text-foreground relative overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500 uppercase tracking-wider mb-2">
                <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" /> Gemini AI Search Summary
              </div>
              <div className="text-xs leading-relaxed text-foreground/90 space-y-2">
                {renderMarkdownSummary(searchResults.aiSummary)}
              </div>
            </div>
          )}

          {!searchValue && (
            <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
              <Sparkles className="h-8 w-8 text-violet-400 animate-pulse" />
              <div className="max-w-[320px] space-y-1">
                <p className="font-bold text-foreground">Welcome to Gemini AI Search</p>
                <p>Type a task display ID, project name, or team member to get a real-time semantic analysis.</p>
              </div>
            </div>
          )}

          {isSearching && (
            <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
              <span>Analyzing database...</span>
            </div>
          )}

          {!isSearching && searchResults && (
            <>
              {/* Projects Group */}
              {searchResults.projects && searchResults.projects.length > 0 && (
                <CommandGroup heading="Projects">
                  {searchResults.projects.map((project: any) => (
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
                        <span className="font-semibold text-xs text-foreground truncate">
                          {project.name}
                        </span>
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

              {/* Tasks & Incidents Group */}
              {searchResults.tasks && searchResults.tasks.length > 0 && (
                <CommandGroup heading="Tasks & Incidents">
                  {searchResults.tasks.map((task: any) => {
                    const isIncident = task.taskType === "ISSUE";
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
                            <span className="font-mono text-[10px] text-primary/80 bg-primary/10 px-1 rounded shrink-0">
                              {task.displayId || task.id.toUpperCase().slice(0, 8)}
                            </span>
                            <span className="font-medium text-xs text-foreground truncate">
                              {task.title}
                            </span>
                          </div>
                          {task.description && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1 font-normal mt-0.5">
                              {task.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* People Group */}
              {searchResults.users && searchResults.users.length > 0 && (
                <CommandGroup heading="People">
                  {searchResults.users.map((user: any) => (
                    <CommandItem
                      key={user.id}
                      value={`people user userprofile member ${user.name} ${user.email} ${user.role || ""}`}
                      onSelect={() => {
                        setOpen(false);
                        navigate({ to: "/people" });
                      }}
                      className="flex items-start gap-3 cursor-pointer py-3 hover:bg-accent/50 rounded-md transition-colors"
                    >
                      <Users className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {user.email} • <span className="capitalize">{user.role?.toLowerCase()}</span>
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Teams Group */}
              {searchResults.teams && searchResults.teams.length > 0 && (
                <CommandGroup heading="Teams">
                  {searchResults.teams.map((team: any) => (
                    <CommandItem
                      key={team.id}
                      value={`team group ${team.name} ${team.description || ""}`}
                      onSelect={() => {
                        setOpen(false);
                        navigate({ to: "/people" });
                      }}
                      className="flex items-start gap-3 cursor-pointer py-3 hover:bg-accent/50 rounded-md transition-colors"
                    >
                      <Layers className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {team.name}
                        </span>
                        {team.description && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1 font-normal">
                            {team.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Departments Group */}
              {searchResults.departments && searchResults.departments.length > 0 && (
                <CommandGroup heading="Departments">
                  {searchResults.departments.map((dept: any) => (
                    <CommandItem
                      key={dept.id}
                      value={`department org parent ${dept.name} ${dept.description || ""}`}
                      onSelect={() => {
                        setOpen(false);
                        navigate({ to: "/people" });
                      }}
                      className="flex items-start gap-3 cursor-pointer py-3 hover:bg-accent/50 rounded-md transition-colors"
                    >
                      <Building className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {dept.name}
                        </span>
                        {dept.description && (
                          <span className="text-[10px] text-muted-foreground line-clamp-1 font-normal">
                            {dept.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function formatTimer(totalSecs: number) {
  const hh = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSecs % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function renderMarkdownSummary(md: string) {
  if (!md) return null;
  return md.split("\n").map((line, idx) => {
    const content = line.trim();
    if (content.startsWith("###")) {
      return (
        <h3 key={idx} className="text-sm font-bold text-foreground mt-2 mb-1">
          {content.replace(/^###\s*/, "")}
        </h3>
      );
    }
    if (content.startsWith("-") || content.startsWith("•")) {
      const text = content.replace(/^[-•]\s*/, "");
      return (
        <div key={idx} className="flex items-start gap-1.5 text-xs pl-2 my-0.5">
          <span className="text-violet-500">•</span>
          <span>{parseBold(text)}</span>
        </div>
      );
    }
    if (content.startsWith("**") && content.endsWith("**")) {
      return (
        <p key={idx} className="text-xs font-bold text-foreground mt-1.5">
          {content.replace(/\*\*/g, "")}
        </p>
      );
    }
    return <p key={idx} className="text-xs text-foreground/90 my-1">{parseBold(line)}</p>;
  });
}

function parseBold(text: string) {
  const parts = text.split(/\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-foreground">{part}</strong>;
    }
    return part;
  });
}
