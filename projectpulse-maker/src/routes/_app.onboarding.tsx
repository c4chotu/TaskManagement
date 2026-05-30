import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Building2, Network, Users, FolderPlus, ListChecks, Check, ArrowRight, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useCreateOrganization, useCreateProject, useCreateTask } from "@/lib/queries";
import type { OrgSetupPayload, ProjectType, RoleName, TaskType } from "@/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({ meta: [{ title: "Set up organization — TaskFlow Pro" }] }),
  component: OnboardingPage,
});

const STEPS = [
  { id: 1, label: "Organization", icon: Building2 },
  { id: 2, label: "Departments", icon: Network },
  { id: 3, label: "Teams", icon: Users },
  { id: 4, label: "Members", icon: Users },
  { id: 5, label: "Projects", icon: FolderPlus },
  { id: 6, label: "Tasks", icon: ListChecks },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const createOrg = useCreateOrganization();
  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const [step, setStep] = useState(1);
  const { user } = useAuth();

  const [org, setOrg] = useState({ name: "", description: "", tier: "FREE" });
  const [departments, setDepartments] = useState<OrgSetupPayload["departments"]>([{ name: "", description: "" }]);
  const [teams, setTeams] = useState<OrgSetupPayload["teams"]>([{ name: "", departmentName: "", description: "" }]);
  const [members, setMembers] = useState<OrgSetupPayload["members"]>([{ name: "", email: "", roleName: "TEAM_MEMBER", teamName: "" }]);
  const [projects, setProjects] = useState<{ name: string; type: ProjectType; description: string }[]>([{ name: "", type: "KANBAN", description: "" }]);
  const [tasks, setTasks] = useState<{ title: string; projectName: string; taskType: TaskType }[]>([{ title: "", projectName: "", taskType: "TASK" }]);

  const next = () => setStep((s) => Math.min(STEPS.length, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const validateStep = (): string | null => {
    if (step === 1 && !org.name.trim()) return "Organization name is required";
    if (step === 2 && !departments.some((d) => d.name.trim())) return "Add at least one department";
    if (step === 3 && !teams.some((t) => t.name.trim() && t.departmentName)) return "Add at least one team assigned to a department";
    if (step === 4 && !members.some((m) => m.name.trim() && m.email.trim())) return "Add at least one member";
    return null;
  };

  const finish = async () => {
    try {
      await createOrg.mutateAsync({
        organization: org,
        departments: departments.filter((d) => d.name.trim()),
        teams: teams.filter((t) => t.name.trim()),
        members: members.filter((m) => m.name.trim() && m.email.trim()),
      });
      const created: Record<string, string> = {};
      for (const p of projects.filter((p) => p.name.trim())) {
        const np = await createProject.mutateAsync({ name: p.name, type: p.type, description: p.description });
        created[p.name] = np.id;
      }
      for (const t of tasks.filter((t) => t.title.trim() && t.projectName)) {
        const pid = created[t.projectName];
        if (pid) await createTask.mutateAsync({ title: t.title, projectId: pid, taskType: t.taskType });
      }
      toast.success("Organization set up successfully");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    }
  };

  if (user && user.roleName !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <Topbar title="Set up your organization" />
      <main className="flex-1 space-y-6 p-6">
        <Card className="p-4">
          <ol className="flex flex-wrap items-center gap-2">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              const Icon = s.icon;
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs transition ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : done ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                    {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="font-medium">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="space-y-4 p-6">
          {step === 1 && (
            <section className="space-y-3">
              <Heading icon={Building2} title="Organization basics" sub="Start with your company's identity." />
              <div><Label>Organization name *</Label><Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} placeholder="Cyberdyne Systems" autoFocus /></div>
              <div><Label>Description</Label><Textarea rows={3} value={org.description} onChange={(e) => setOrg({ ...org, description: e.target.value })} placeholder="Mission, sector, what you build…" /></div>
              <div>
                <Label>Pricing Plan</Label>
                <Select value={org.tier} onValueChange={(v) => setOrg({ ...org, tier: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free ($0/mo)</SelectItem>
                    <SelectItem value="PRO">Pro ($10/user/mo)</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3">
              <Heading icon={Network} title="Departments" sub="Define your organizational structure first." />
              <RepeatList
                items={departments}
                setItems={setDepartments}
                empty={{ name: "", description: "" }}
                render={(d, i, upd) => (
                  <>
                    <Input placeholder="Department name (e.g. Platform Engineering)" value={d.name} onChange={(e) => upd(i, { ...d, name: e.target.value })} />
                    <Input placeholder="Optional description" value={d.description ?? ""} onChange={(e) => upd(i, { ...d, description: e.target.value })} />
                  </>
                )}
                addLabel="Add department"
              />
            </section>
          )}

          {step === 3 && (
            <section className="space-y-3">
              <Heading icon={Users} title="Teams" sub="Teams fit inside departments according to your structure." />
              <RepeatList
                items={teams}
                setItems={setTeams}
                empty={{ name: "", departmentName: "", description: "" }}
                render={(t, i, upd) => (
                  <>
                    <Input placeholder="Team name" value={t.name} onChange={(e) => upd(i, { ...t, name: e.target.value })} />
                    <Select value={t.departmentName} onValueChange={(v) => upd(i, { ...t, departmentName: v })}>
                      <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                      <SelectContent>{departments.filter((d) => d.name).map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Optional description" value={t.description ?? ""} onChange={(e) => upd(i, { ...t, description: e.target.value })} />
                  </>
                )}
                addLabel="Add team"
              />
            </section>
          )}

          {step === 4 && (
            <section className="space-y-3">
              <Heading icon={Users} title="Members" sub="Invite people and assign them to teams." />
              <RepeatList
                items={members}
                setItems={setMembers}
                empty={{ name: "", email: "", roleName: "TEAM_MEMBER", teamName: "" }}
                render={(m, i, upd) => (
                  <>
                    <Input placeholder="Full name" value={m.name} onChange={(e) => upd(i, { ...m, name: e.target.value })} />
                    <Input placeholder="email@company.com" type="email" value={m.email} onChange={(e) => upd(i, { ...m, email: e.target.value })} />
                    <Select value={m.roleName} onValueChange={(v) => upd(i, { ...m, roleName: v as RoleName })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["ORG_ADMIN","DEPT_HEAD","TEAM_LEAD","TEAM_MEMBER","GUEST"] as RoleName[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={m.teamName || "_none"} onValueChange={(v) => upd(i, { ...m, teamName: v === "_none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No team</SelectItem>
                        {teams.filter((t) => t.name).map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </>
                )}
                addLabel="Add member"
              />
            </section>
          )}

          {step === 5 && (
            <section className="space-y-3">
              <Heading icon={FolderPlus} title="Projects" sub="Optional: seed initial projects for your teams." />
              <RepeatList
                items={projects}
                setItems={setProjects}
                empty={{ name: "", type: "KANBAN", description: "" }}
                render={(p, i, upd) => (
                  <>
                    <Input placeholder="Project name" value={p.name} onChange={(e) => upd(i, { ...p, name: e.target.value })} />
                    <Select value={p.type} onValueChange={(v) => upd(i, { ...p, type: v as ProjectType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KANBAN">Kanban</SelectItem>
                        <SelectItem value="SCRUM">Scrum</SelectItem>
                        <SelectItem value="WATERFALL">Waterfall</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Short description" value={p.description} onChange={(e) => upd(i, { ...p, description: e.target.value })} />
                  </>
                )}
                addLabel="Add project"
              />
            </section>
          )}

          {step === 6 && (
            <section className="space-y-3">
              <Heading icon={ListChecks} title="Initial tasks" sub="Optional: seed first tasks. You can always add more later." />
              <RepeatList
                items={tasks}
                setItems={setTasks}
                empty={{ title: "", projectName: "", taskType: "TASK" }}
                render={(t, i, upd) => (
                  <>
                    <Input placeholder="Task title" value={t.title} onChange={(e) => upd(i, { ...t, title: e.target.value })} />
                    <Select value={t.projectName} onValueChange={(v) => upd(i, { ...t, projectName: v })}>
                      <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
                      <SelectContent>{projects.filter((p) => p.name).map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={t.taskType} onValueChange={(v) => upd(i, { ...t, taskType: v as TaskType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TASK">Task</SelectItem>
                        <SelectItem value="ISSUE">Incident</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                addLabel="Add task"
              />
            </section>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={back} disabled={step === 1}><ArrowLeft className="mr-1 h-3 w-3" /> Back</Button>
            <Badge variant="outline" className="font-mono text-[10px]">Step {step} of {STEPS.length}</Badge>
            {step !== STEPS.length ? (
              <Button onClick={() => { const err = validateStep(); if (err) return toast.error(err); next(); }} className="bg-gradient-primary text-primary-foreground">
                Continue <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={createOrg.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {createOrg.isPending ? "Finalising…" : "Finish setup"}
              </Button>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}

function Heading({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div><h2 className="text-base font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{sub}</p></div>
    </div>
  );
}

function RepeatList<T>({ items, setItems, empty, render, addLabel }: {
  items: T[];
  setItems: (next: T[]) => void;
  empty: T;
  render: (item: T, idx: number, update: (i: number, next: T) => void) => React.ReactNode;
  addLabel: string;
}) {
  const upd = (i: number, n: T) => { const c = [...items]; c[i] = n; setItems(c); };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-border bg-muted/20 p-3">
          <div className="grid gap-2 sm:grid-cols-2">{render(it, i, upd)}</div>
          <Button size="icon" variant="ghost" className="self-start text-muted-foreground hover:text-destructive" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => setItems([...items, { ...empty }])}><Plus className="mr-1 h-3 w-3" /> {addLabel}</Button>
    </div>
  );
}
