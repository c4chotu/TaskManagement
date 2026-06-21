import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronRight, ChevronLeft, Copy, Mail, Shield, Sparkles, UserPlus, Users, FolderKanban, KeyRound, Send, Camera } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/people-onboarding copy")({
  head: () => ({ meta: [{ title: "Onboard Member — TaskFlow Pro" }] }),
  component: OnboardPage,
});

const STEPS = [
  { id: 0, label: "Profile", icon: UserPlus },
  { id: 1, label: "Role & Team", icon: Users },
  { id: 2, label: "Project access", icon: FolderKanban },
  { id: 3, label: "Permissions", icon: Shield },
  { id: 4, label: "Review & Invite", icon: Send },
];

const ROLES = [
  { id: "viewer", label: "Viewer", desc: "Read-only access to assigned projects.", hue: "from-slate-500 to-slate-700" },
  { id: "contributor", label: "Contributor", desc: "Create tasks, log time, comment.", hue: "from-sky-500 to-blue-600" },
  { id: "lead", label: "Team Lead", desc: "Manage tasks and approvals.", hue: "from-violet-500 to-fuchsia-600" },
  { id: "admin", label: "Admin", desc: "Full org control, billing, settings.", hue: "from-emerald-500 to-teal-600" },
];

const PERMS = [
  { k: "tasks_create", label: "Create tasks", group: "Tasks" },
  { k: "tasks_assign", label: "Assign tasks to others", group: "Tasks" },
  { k: "tasks_delete", label: "Delete tasks", group: "Tasks" },
  { k: "projects_create", label: "Create projects", group: "Projects" },
  { k: "time_approve", label: "Approve time logs", group: "Time" },
  { k: "incidents_resolve", label: "Resolve incidents", group: "Incidents" },
  { k: "settings_edit", label: "Edit org settings", group: "Admin" },
  { k: "billing_view", label: "View billing", group: "Admin" },
];

function OnboardPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: "", email: "", title: "", department: "", role: "contributor",
    team: "", projects: [] as string[],
    perms: { tasks_create: true, tasks_assign: false, tasks_delete: false, projects_create: false, time_approve: false, incidents_resolve: false, settings_edit: false, billing_view: false } as Record<string, boolean>,
    sendInvite: true,
  });
  const [done, setDone] = useState(false);

  const update = (patch: Partial<typeof data>) => setData(d => ({ ...d, ...patch }));
  const togglePerm = (k: string) => setData(d => ({ ...d, perms: { ...d.perms, [k]: !d.perms[k] } }));
  const toggleProject = (p: string) => setData(d => ({ ...d, projects: d.projects.includes(p) ? d.projects.filter(x => x !== p) : [...d.projects, p] }));

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));
  const submit = () => { setDone(true); toast.success("Invite sent!"); };

  if (done) {
    return (
      <div className="min-h-full bg-mesh grid place-items-center p-6">
        <div className="glass-strong rounded-3xl p-10 max-w-lg text-center relative overflow-hidden">
          <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-400/40 to-primary/40 blur-3xl" />
          <div className="relative">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-primary text-white shadow-xl animate-bounce">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-black">Invite sent</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.email} will receive an email to join your workspace.</p>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-card/60 border border-border p-2.5">
              <KeyRound className="h-4 w-4 text-primary ml-1" />
              <code className="flex-1 text-left text-xs font-mono truncate">https://taskflow.pro/invite/x9k2-fr8q-aa1m</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText("https://taskflow.pro/invite/x9k2-fr8q-aa1m"); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setDone(false); setStep(0); setData({ name: "", email: "", title: "", department: "", role: "contributor", team: "", projects: [], perms: data.perms, sendInvite: true }); }}>Add another</Button>
              <Button className="flex-1 rounded-xl shimmer-cta text-primary-foreground">Done</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-mesh">
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero */}
        <div className="glass-strong rounded-3xl p-6 mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> New teammate
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Onboard a member</h1>
          <p className="text-sm text-muted-foreground">5 quick steps. You can edit everything later.</p>

          {/* Stepper */}
          <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const active = i === step;
              const completed = i < step;
              return (
                <div key={s.id} className="flex items-center shrink-0">
                  <button onClick={() => setStep(i)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${active ? "bg-primary text-primary-foreground shadow-lg" : completed ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                    <div className={`grid h-5 w-5 place-items-center rounded-md ${active ? "bg-primary-foreground/20" : completed ? "bg-primary/20" : "bg-muted-foreground/20"}`}>
                      {completed ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                    </div>
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && <div className={`h-px w-6 ${completed ? "bg-primary" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Form column */}
          <div className="glass rounded-3xl p-6 min-h-[440px]">
            {step === 0 && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-bold">Profile</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20"><AvatarFallback className="text-2xl font-extrabold bg-gradient-to-br from-primary to-fuchsia-500 text-white">{data.name.slice(0, 2).toUpperCase() || "?"}</AvatarFallback></Avatar>
                    <button className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"><Camera className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="text-xs text-muted-foreground">Drop a photo or pick a color avatar.</div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <FormField label="Full name"><Input value={data.name} onChange={(e) => update({ name: e.target.value })} className="h-10 rounded-xl" /></FormField>
                  <FormField label="Email"><Input type="email" value={data.email} onChange={(e) => update({ email: e.target.value })} className="h-10 rounded-xl" /></FormField>
                  <FormField label="Job title"><Input value={data.title} onChange={(e) => update({ title: e.target.value })} className="h-10 rounded-xl" /></FormField>
                  <FormField label="Department">
                    <Select value={data.department} onValueChange={(v) => update({ department: v })}>
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="eng">Engineering</SelectItem><SelectItem value="design">Design</SelectItem><SelectItem value="ops">Operations</SelectItem><SelectItem value="pm">Product</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-bold">Role & team</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {ROLES.map(r => (
                    <button key={r.id} onClick={() => update({ role: r.id })} className={`text-left rounded-2xl p-4 border-2 transition ${data.role === r.id ? "border-primary bg-primary/5" : "border-border bg-card/60 hover:border-primary/40"}`}>
                      <div className={`inline-grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${r.hue} text-white shadow mb-2`}><Shield className="h-4 w-4" /></div>
                      <div className="text-sm font-bold">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground">{r.desc}</div>
                    </button>
                  ))}
                </div>
                <FormField label="Team">
                  <Select value={data.team} onValueChange={(v) => update({ team: v })}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent><SelectItem value="fe">Frontend</SelectItem><SelectItem value="be">Backend</SelectItem><SelectItem value="data">Data</SelectItem><SelectItem value="sre">SRE</SelectItem></SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 animate-in fade-in">
                <h2 className="text-lg font-bold">Project access</h2>
                <p className="text-xs text-muted-foreground">Pick projects this member can see.</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {["Phoenix", "Atlas", "Helios", "Nimbus", "Voyager", "Orion"].map(p => {
                    const on = data.projects.includes(p);
                    return (
                      <button key={p} onClick={() => toggleProject(p)} className={`flex items-center gap-2 rounded-xl p-3 border transition ${on ? "border-primary bg-primary/10" : "border-border bg-card/60 hover:border-primary/40"}`}>
                        <div className={`grid h-5 w-5 place-items-center rounded-md ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{on && <Check className="h-3 w-3" />}</div>
                        <span className="text-sm font-semibold">{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 animate-in fade-in">
                <h2 className="text-lg font-bold">Permissions</h2>
                {["Tasks", "Projects", "Time", "Incidents", "Admin"].map(g => (
                  <div key={g}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{g}</div>
                    <div className="space-y-1.5">
                      {PERMS.filter(p => p.group === g).map(p => (
                        <div key={p.k} className="flex items-center justify-between rounded-xl bg-card/60 border border-border/50 px-3 py-2">
                          <span className="text-xs font-medium">{p.label}</span>
                          <Switch checked={data.perms[p.k]} onCheckedChange={() => togglePerm(p.k)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 animate-in fade-in">
                <h2 className="text-lg font-bold">Review & invite</h2>
                <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-2 text-sm">
                  <Row k="Name" v={data.name || "—"} />
                  <Row k="Email" v={data.email || "—"} />
                  <Row k="Role" v={ROLES.find(r => r.id === data.role)?.label ?? data.role} />
                  <Row k="Team" v={data.team || "—"} />
                  <Row k="Projects" v={data.projects.join(", ") || "none"} />
                  <Row k="Permissions" v={`${Object.values(data.perms).filter(Boolean).length} enabled`} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-primary/8 border border-primary/30 p-3">
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" />Send email invite</div>
                    <div className="text-[11px] text-muted-foreground">They'll get a link to set their password.</div>
                  </div>
                  <Switch checked={data.sendInvite} onCheckedChange={(v) => update({ sendInvite: v })} />
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" disabled={step === 0} onClick={back} className="rounded-xl"><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={next} className="rounded-xl shimmer-cta text-primary-foreground font-bold">Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
              ) : (
                <Button onClick={submit} className="rounded-xl shimmer-cta text-primary-foreground font-bold"><Send className="mr-1.5 h-4 w-4" />Send invite</Button>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="glass rounded-3xl p-6 sticky top-4 h-fit">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Invitee preview</div>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-fuchsia-500/10 to-sky-500/15 p-5 border border-border">
              <div className="water-bg absolute inset-0 opacity-30" />
              <div className="relative text-center">
                <Avatar className="h-16 w-16 mx-auto ring-4 ring-card">
                  <AvatarFallback className="text-xl font-extrabold bg-gradient-to-br from-primary to-fuchsia-500 text-white">{data.name.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="mt-3 text-base font-bold">{data.name || "New member"}</div>
                <div className="text-[11px] text-muted-foreground">{data.title || "—"} · {data.department || "—"}</div>
                <Badge className="mt-2 bg-primary text-primary-foreground border-0">{ROLES.find(r => r.id === data.role)?.label}</Badge>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Projects</div>
              {data.projects.length === 0 && <p className="text-xs text-muted-foreground">None selected yet.</p>}
              <div className="flex flex-wrap gap-1">{data.projects.map(p => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}</div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Permissions</div>
              <div className="text-xs">{Object.entries(data.perms).filter(([, v]) => v).length} / {PERMS.length} enabled</div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-fuchsia-500 transition-all" style={{ width: `${(Object.entries(data.perms).filter(([, v]) => v).length / PERMS.length) * 100}%` }} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{k}</span><span className="font-semibold">{v}</span></div>;
}
