import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDepartments, useTeams, useUsers, useWorkload, useTimeEntries, useTasks,
  useCreateDepartment, useCreateTeam,
} from "@/lib/queries";
import { RoleBadge } from "@/components/tfp/badges";
import { RolePromoteDialog } from "@/components/tfp/role-promote-dialog";
import {
  Building2, Users as UsersIcon, Search, Grid3X3, List,
  Plus, Network, UserCheck, BarChart3, Star,
  Layers, Shield, Crown, Activity, Clock,
} from "lucide-react";
import { useState, useMemo } from "react";
import { EnterpriseGrid, type GridColumn } from "@/components/tfp/enterprise-grid";
import type { User } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/people")({
  head: () => ({ meta: [{ title: "People & Org — TaskFlow Pro" }] }),
  component: PeoplePage,
});

function PeoplePage() {
  const { data: users = [] } = useUsers();
  const { data: depts = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const { data: workloads = [] } = useWorkload();
  const { data: entries = [] } = useTimeEntries();
  const { data: tasks = [] } = useTasks();

  const createDept = useCreateDepartment();
  const createTeam = useCreateTeam();

  const [viewMode, setViewMode] = useState<"cards" | "grid">("cards");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("people");

  // Department creation form
  const [deptForm, setDeptForm] = useState({ name: "", description: "", headUserId: "" });
  const [deptOpen, setDeptOpen] = useState(false);

  // Team creation form
  const [teamForm, setTeamForm] = useState({ name: "", description: "", departmentId: "", leadUserId: "" });
  const [teamOpen, setTeamOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || (() => {
        const team = teams.find((t) => t.id === (u as any).teamId);
        return team?.departmentId === deptFilter;
      })();
      const matchRole = roleFilter === "all" || u.roleName === roleFilter;
      return matchSearch && matchDept && matchRole;
    });
  }, [users, search, deptFilter, roleFilter, teams]);

  const getUserMetrics = (userId: string) => {
    const wl = workloads.find((w) => w.userId === userId);
    const userEntries = entries.filter((e) => e.userId === userId);
    const hoursLogged = userEntries.reduce((s, e) => s + (e.hours ?? 0), 0);
    const activeTasks = tasks.filter((t) => t.assigneeIds.includes(userId)).length;
    return { overloaded: wl?.overloaded ?? false, activeTasks, hoursLogged, estimatedHours: wl?.totalEstimatedHours ?? 0 };
  };

  const gridColumns: GridColumn<User>[] = [
    { key: "name", header: "Name", accessor: (u) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="h-7 w-7 border border-border shrink-0">
          <AvatarFallback className="bg-muted text-[10px]">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div><p className="font-medium text-xs">{u.name}</p><p className="text-[10px] text-muted-foreground">{u.email}</p></div>
      </div>
    ), filterValue: (u) => `${u.name} ${u.email}`, sortValue: (u) => u.name },
    { key: "role", header: "Role", accessor: (u) => <RoleBadge role={u.roleName} level={u.roleLevel} />, filterValue: (u) => u.roleName ?? "" },
    { key: "dept", header: "Department", accessor: (u) => {
      const team = teams.find((t) => t.id === (u as any).teamId);
      const dept = depts.find((d) => d.id === team?.departmentId);
      return dept ? <Badge variant="outline" className="text-[10px]">{dept.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>;
    }},
    { key: "tasks", header: "Active Tasks", accessor: (u) => { const m = getUserMetrics(u.id); return <span className="font-mono text-xs">{m.activeTasks}</span>; }, sortValue: (u) => getUserMetrics(u.id).activeTasks },
    { key: "hours", header: "Hours Logged", accessor: (u) => { const m = getUserMetrics(u.id); return <span className="font-mono text-xs">{m.hoursLogged.toFixed(1)}h</span>; }, sortValue: (u) => getUserMetrics(u.id).hoursLogged },
    { key: "workload", header: "Workload", accessor: (u) => {
      const m = getUserMetrics(u.id);
      const pct = m.estimatedHours > 0 ? Math.min(Math.round((m.hoursLogged / m.estimatedHours) * 100), 100) : 0;
      return (
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className={`h-full rounded-full ${m.overloaded ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-mono w-8 text-right">{pct}%</span>
        </div>
      );
    }},
    { key: "status", header: "Status", accessor: (u) => { const m = getUserMetrics(u.id); return m.overloaded ? <Badge variant="destructive" className="text-[10px]">Overloaded</Badge> : <Badge variant="outline" className="text-[10px] text-success border-success/30">Available</Badge>; }},
    { key: "actions", header: "", accessor: (u) => <RolePromoteDialog user={u as any} /> },
  ];

  const uniqueRoles = Array.from(new Set(users.map((u) => u.roleName).filter(Boolean)));

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return toast.error("Department name is required");
    try {
      await createDept.mutateAsync({ name: deptForm.name, description: deptForm.description, headUserId: deptForm.headUserId || users[0]?.id });
      toast.success(`Department "${deptForm.name}" created!`);
      setDeptForm({ name: "", description: "", headUserId: "" });
      setDeptOpen(false);
    } catch { toast.error("Failed to create department"); }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim() || !teamForm.departmentId) return toast.error("Team name and department are required");
    try {
      await createTeam.mutateAsync({ name: teamForm.name, description: teamForm.description, departmentId: teamForm.departmentId, leadUserId: teamForm.leadUserId || users[0]?.id });
      toast.success(`Team "${teamForm.name}" created!`);
      setTeamForm({ name: "", description: "", departmentId: "", leadUserId: "" });
      setTeamOpen(false);
    } catch { toast.error("Failed to create team"); }
  };

  return (
    <>
      <Topbar title="People & Org" />
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden">
        {/* Watermark background icon */}
        <div className="absolute top-20 right-12 pointer-events-none select-none z-0">
          <Network className="h-[380px] w-[380px] text-primary/4 -rotate-12 stroke-[0.5]" />
        </div>

        {/* Hero banner */}
        <div className="relative z-10 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-tr from-emerald-600/10 via-indigo-600/5 to-transparent p-6 shadow-md backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Network className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">People & Organization</h1>
            </div>
            <p className="text-sm text-muted-foreground">Manage your workforce, departments, teams, and organizational structure.</p>
            <div className="flex gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5 text-emerald-500" /> {users.length} members</span>
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-indigo-500" /> {depts.length} departments</span>
              <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-violet-500" /> {teams.length} teams</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Create Department */}
            <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-white/10 bg-background/40 hover:bg-background/60 text-xs rounded-xl gap-1">
                  <Building2 className="h-3.5 w-3.5" /> New Department
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Create Department
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateDept} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dept-name">Department Name *</Label>
                    <Input id="dept-name" placeholder="e.g. Engineering, Design..." value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dept-desc">Description</Label>
                    <Textarea id="dept-desc" placeholder="What does this department do?" value={deptForm.description} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dept-head">Department Head</Label>
                    <Select value={deptForm.headUserId} onValueChange={v => setDeptForm(f => ({ ...f, headUserId: v }))}>
                      <SelectTrigger id="dept-head"><SelectValue placeholder="Select user..." /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeptOpen(false)}>Cancel</Button>
                    <Button type="submit" size="sm" className="bg-gradient-primary text-primary-foreground" disabled={createDept.isPending}>
                      {createDept.isPending ? "Creating..." : "Create Department"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Create Team */}
            <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground font-semibold text-xs rounded-xl gap-1">
                  <Plus className="h-3.5 w-3.5" /> New Team
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-primary" /> Create Team
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTeam} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="team-name">Team Name *</Label>
                    <Input id="team-name" placeholder="e.g. Frontend Core, Backend API..." value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="team-dept">Department *</Label>
                    <Select value={teamForm.departmentId} onValueChange={v => setTeamForm(f => ({ ...f, departmentId: v }))}>
                      <SelectTrigger id="team-dept"><SelectValue placeholder="Select department..." /></SelectTrigger>
                      <SelectContent>
                        {depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="team-desc">Description</Label>
                    <Textarea id="team-desc" placeholder="What is this team responsible for?" value={teamForm.description} onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="team-lead">Team Lead</Label>
                    <Select value={teamForm.leadUserId} onValueChange={v => setTeamForm(f => ({ ...f, leadUserId: v }))}>
                      <SelectTrigger id="team-lead"><SelectValue placeholder="Select team lead..." /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTeamOpen(false)}>Cancel</Button>
                    <Button type="submit" size="sm" className="bg-gradient-primary text-primary-foreground" disabled={createTeam.isPending}>
                      {createTeam.isPending ? "Creating..." : "Create Team"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card-green p-5 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><UsersIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold mt-0.5">{users.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{depts.length} depts · {teams.length} teams</p>
              </div>
            </div>
          </Card>
          <Card className="glass-card-green p-5 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500"><Activity className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Overloaded</p>
                <p className="text-2xl font-bold mt-0.5 text-destructive">{workloads.filter(w => w.overloaded).length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Above capacity</p>
              </div>
            </div>
          </Card>
          <Card className="glass-card-green p-5 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><Clock className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Hours Logged</p>
                <p className="text-2xl font-bold mt-0.5">{entries.reduce((s, e) => s + (e.hours ?? 0), 0).toFixed(0)}h</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{entries.length} entries</p>
              </div>
            </div>
          </Card>
          <Card className="glass-card-green p-5 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500"><BarChart3 className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Active Tasks</p>
                <p className="text-2xl font-bold mt-0.5">{tasks.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Across all teams</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main content tabs */}
        <div className="relative z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 border border-border/60 bg-background/60 backdrop-blur-sm h-9 p-1">
              <TabsTrigger value="people" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
                <UsersIcon className="h-3.5 w-3.5" /> People
              </TabsTrigger>
              <TabsTrigger value="departments" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
                <Building2 className="h-3.5 w-3.5" /> Departments
              </TabsTrigger>
              <TabsTrigger value="teams" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
                <Layers className="h-3.5 w-3.5" /> Teams
              </TabsTrigger>
              <TabsTrigger value="orgchart" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700">
                <Network className="h-3.5 w-3.5" /> Org Chart
              </TabsTrigger>
            </TabsList>

            {/* PEOPLE TAB */}
            <TabsContent value="people">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><UsersIcon className="h-4 w-4" /> Team Roster</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-44 pl-8 text-xs" />
                  </div>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All departments" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All roles" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles.map((r) => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 rounded-md border border-border p-1">
                    <button onClick={() => setViewMode("cards")} className={`p-1.5 rounded transition-colors ${viewMode === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}><Grid3X3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}><List className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>

              {viewMode === "grid" ? (
                <EnterpriseGrid
                  data={filteredUsers}
                  columns={gridColumns}
                  rowKey={(u) => u.id}
                  title=""
                  subtitle={`${filteredUsers.length} members`}
                  filterPlaceholder="Search roster..."
                  exportFilename="team-roster"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredUsers.map((u) => {
                    const m = getUserMetrics(u.id);
                    const team = teams.find((t) => t.id === (u as any).teamId);
                    const dept = depts.find((d) => d.id === team?.departmentId);
                    const workloadPct = m.estimatedHours > 0 ? Math.min(Math.round((m.hoursLogged / m.estimatedHours) * 100), 100) : 0;
                    const roleIcon = u.roleName === "ORG_OWNER" ? Crown : u.roleName === "ORG_ADMIN" ? Shield : u.roleName === "DEPT_HEAD" ? Star : UserCheck;
                    const RoleIcon = roleIcon;
                    return (
                      <Card key={u.id} className={`glass-card-green p-4 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all ${m.overloaded ? "border-destructive/40" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-11 w-11 border-2 border-emerald-500/20 shrink-0">
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 text-foreground text-sm font-semibold">
                                {u.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center">
                              <RoleIcon className="h-2.5 w-2.5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                            {dept && <p className="text-[10px] text-muted-foreground mt-0.5">{dept.name}</p>}
                          </div>
                          {m.overloaded && <Badge variant="destructive" className="text-[9px] px-1 shrink-0">Overloaded</Badge>}
                        </div>
                        <div className="mt-3">
                          <RoleBadge role={u.roleName} level={u.roleLevel} />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-muted/40 px-2.5 py-1.5 text-center">
                            <p className="text-sm font-bold">{m.activeTasks}</p>
                            <p className="text-[9px] text-muted-foreground">Tasks</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 px-2.5 py-1.5 text-center">
                            <p className="text-sm font-bold">{m.hoursLogged.toFixed(0)}h</p>
                            <p className="text-[9px] text-muted-foreground">Logged</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground">Capacity</span>
                            <span className="text-[10px] font-mono">{workloadPct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${m.overloaded ? "bg-destructive" : "bg-emerald-500"}`} style={{ width: `${workloadPct}%` }} />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <RolePromoteDialog user={u as any} />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* DEPARTMENTS TAB */}
            <TabsContent value="departments">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {depts.map((d) => {
                  const head = users.find((u) => u.id === d.headUserId);
                  const deptTeams = teams.filter((t) => t.departmentId === d.id);
                  const deptMembers = users.filter((u) => deptTeams.some((t) => t.id === (u as any).teamId));
                  const deptTasks = tasks.filter(t => deptTeams.some(dt => dt.id === (t as any).teamId)).length;
                  return (
                    <Card key={d.id} className="glass-card-green p-5 hover:shadow-[0_0_24px_rgba(16,185,129,0.15)] transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-indigo-500/10 text-emerald-600">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">{d.name}</h3>
                            <p className="text-[10px] text-muted-foreground">{d.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 border-emerald-500/30 text-emerald-700">{deptTeams.length} teams</Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
                          <p className="text-lg font-bold">{deptMembers.length}</p>
                          <p className="text-[9px] text-muted-foreground">Members</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
                          <p className="text-lg font-bold">{deptTeams.length}</p>
                          <p className="text-[9px] text-muted-foreground">Teams</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
                          <p className="text-lg font-bold">{deptTasks}</p>
                          <p className="text-[9px] text-muted-foreground">Tasks</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3">
                        <Avatar className="h-7 w-7 border border-emerald-500/20 shrink-0">
                          <AvatarFallback className="bg-emerald-500/10 text-[10px] text-emerald-700">{head?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate">{head?.name}</p>
                          <p className="text-[9px] text-muted-foreground">Department Head</p>
                        </div>
                        <div className="flex -space-x-1">
                          {deptMembers.slice(0, 4).map((m) => (
                            <Avatar key={m.id} className="h-5 w-5 border-2 border-card">
                              <AvatarFallback className="bg-primary/20 text-[8px] text-primary">{m.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ))}
                          {deptMembers.length > 4 && <span className="text-[9px] text-muted-foreground ml-1.5 self-center">+{deptMembers.length - 4}</span>}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {/* Add Department card */}
                <button
                  onClick={() => setDeptOpen(true)}
                  className="glass-card-green p-5 rounded-xl border-2 border-dashed border-emerald-500/30 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/60 transition-all min-h-[180px]"
                >
                  <Plus className="h-8 w-8 opacity-50" />
                  <span className="text-sm font-medium">New Department</span>
                </button>
              </div>
            </TabsContent>

            {/* TEAMS TAB */}
            <TabsContent value="teams">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => {
                  const dept = depts.find(d => d.id === team.departmentId);
                  const lead = users.find(u => u.id === team.leadUserId);
                  const members = users.filter(u => (u as any).teamId === team.id);
                  const teamTasks = tasks.filter(t => (t as any).teamId === team.id);
                  return (
                    <Card key={team.id} className="glass-card-green p-5 hover:shadow-[0_0_24px_rgba(16,185,129,0.15)] transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-violet-600">
                            <Layers className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">{team.name}</h3>
                            <p className="text-[10px] text-muted-foreground">{team.description}</p>
                          </div>
                        </div>
                        {dept && (
                          <Badge variant="outline" className="text-[9px] shrink-0">{dept.name}</Badge>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
                          <p className="text-lg font-bold">{members.length}</p>
                          <p className="text-[9px] text-muted-foreground">Members</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 px-2 py-2 text-center">
                          <p className="text-lg font-bold">{teamTasks.length}</p>
                          <p className="text-[9px] text-muted-foreground">Tasks</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3">
                        <Avatar className="h-7 w-7 border border-violet-500/20 shrink-0">
                          <AvatarFallback className="bg-violet-500/10 text-[10px] text-violet-700">{lead?.name?.slice(0, 2).toUpperCase() ?? "??"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate">{lead?.name ?? "Unassigned"}</p>
                          <p className="text-[9px] text-muted-foreground">Team Lead</p>
                        </div>
                        <div className="flex -space-x-1">
                          {members.slice(0, 4).map((m) => (
                            <Avatar key={m.id} className="h-5 w-5 border-2 border-card">
                              <AvatarFallback className="bg-primary/20 text-[8px] text-primary">{m.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ))}
                          {members.length === 0 && <span className="text-[9px] text-muted-foreground">No members yet</span>}
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {/* Add Team card */}
                <button
                  onClick={() => setTeamOpen(true)}
                  className="glass-card-green p-5 rounded-xl border-2 border-dashed border-violet-500/30 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-violet-600 hover:border-violet-500/60 transition-all min-h-[180px]"
                >
                  <Plus className="h-8 w-8 opacity-50" />
                  <span className="text-sm font-medium">New Team</span>
                </button>
              </div>
            </TabsContent>

            {/* ORG CHART TAB */}
            <TabsContent value="orgchart">
              <div className="glass-card-green rounded-2xl p-6 overflow-x-auto">
                <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" /> Organizational Hierarchy
                </h3>
                <div className="flex flex-col gap-6">
                  {depts.map((dept) => {
                    const head = users.find(u => u.id === dept.headUserId);
                    const deptTeams = teams.filter(t => t.departmentId === dept.id);
                    return (
                      <div key={dept.id} className="relative">
                        {/* Department node */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{dept.name}</p>
                            <p className="text-[10px] text-muted-foreground">Head: {head?.name ?? "Unassigned"}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] ml-2">{deptTeams.length} teams</Badge>
                        </div>
                        {/* Teams */}
                        {deptTeams.length > 0 && (
                          <div className="ml-8 pl-4 border-l-2 border-emerald-500/20 flex flex-wrap gap-3">
                            {deptTeams.map(team => {
                              const lead = users.find(u => u.id === team.leadUserId);
                              const members = users.filter(u => (u as any).teamId === team.id);
                              return (
                                <div key={team.id} className="rounded-xl border border-border bg-card/50 p-3 min-w-[180px]">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Layers className="h-3.5 w-3.5 text-violet-500" />
                                    <p className="text-xs font-semibold">{team.name}</p>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground mb-2">Lead: {lead?.name ?? "—"}</p>
                                  <div className="flex -space-x-1.5">
                                    {members.slice(0, 5).map(m => (
                                      <Avatar key={m.id} className="h-5 w-5 border border-card">
                                        <AvatarFallback className="text-[8px] bg-primary/20 text-primary">{m.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {members.length > 5 && <span className="text-[8px] text-muted-foreground ml-1.5 self-center">+{members.length - 5}</span>}
                                    {members.length === 0 && <span className="text-[9px] text-muted-foreground">No members</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
