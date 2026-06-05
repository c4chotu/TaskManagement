import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAckIssue, useIssues, useResolveIssue, useTasks } from "@/lib/queries";
import { SlaCountdown } from "@/components/tfp/sla";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { findUser } from "@/lib/mock-data";
import {
  Search, Eye, CheckCircle2, Bug, AlertOctagon, Filter, ArrowUpDown, Layers,
  Activity, AlertTriangle, ChevronDown, ChevronUp, Plus,
} from "lucide-react";
import { ZEmpty } from "@/components/tfp/zoho";
import { ZSeverityPill, ZAvatarStack } from "@/components/zoho/components";

export const Route = createFileRoute("/_app/incidents")({
  head: () => ({ meta: [{ title: "Issues — TaskFlow Pro" }] }),
  component: IncidentsPage,
});

type IFilter = "all" | "open" | "ack" | "resolved" | "breach";
type GroupBy = "severity" | "environment" | "status" | "none";

function IncidentsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIncidentsRoot = pathname === "/incidents";
  const { data: issues = [] } = useIssues();
  const { data: tasks = [] } = useTasks();
  const ack = useAckIssue();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<IFilter>("open");

  if (!isIncidentsRoot) {
    return <Outlet />;
  }
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("severity");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => issues.filter((i) => {
    const t = tasks.find((x) => x.id === i.taskId);
    if (q && !(t?.title.toLowerCase().includes(q.toLowerCase()) || i.environment.toLowerCase().includes(q.toLowerCase()))) return false;
    if (filter === "open") return !i.acknowledged && !i.resolved;
    if (filter === "ack") return i.acknowledged && !i.resolved;
    if (filter === "resolved") return i.resolved;
    if (filter === "breach") return i.slaBreached;
    return true;
  }), [issues, filter, q, tasks]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All Issues", color: "var(--color-primary)", items: filtered }];
    if (groupBy === "environment") {
      const envs = Array.from(new Set(filtered.map((i) => i.environment)));
      return envs.map((e) => ({
        key: e, label: e, color: "var(--color-info)",
        items: filtered.filter((i) => i.environment === e),
      }));
    }
    if (groupBy === "status") {
      return [
        { key: "open", label: "Open", color: "#ef4444", items: filtered.filter((i) => !i.acknowledged && !i.resolved) },
        { key: "ack", label: "Acknowledged", color: "#3b82f6", items: filtered.filter((i) => i.acknowledged && !i.resolved) },
        { key: "resolved", label: "Resolved", color: "#22c55e", items: filtered.filter((i) => i.resolved) },
      ].filter((g) => g.items.length);
    }
    return (["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((sev, idx) => ({
      key: sev,
      label: `${sev} · ${["Critical", "High", "Medium", "Low"][idx]}`,
      color: `var(--color-sev-${idx})`,
      items: filtered.filter((i) => i.severity === sev),
    })).filter((g) => g.items.length);
  }, [filtered, groupBy]);

  const sevCounts = (["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((s) => issues.filter((i) => i.severity === s && !i.resolved).length);
  const openCount = issues.filter((i) => !i.resolved).length;
  const breach = issues.filter((i) => i.slaBreached).length;
  const mttr = "2.4h";

  return (
    <>
      <Topbar title="Issues" />
      <main className="flex-1 space-y-4 p-5">
        {/* Hero header banner */}
        <div className="relative overflow-hidden border border-border/60 bg-gradient-to-tr from-destructive/10 via-primary/5 to-transparent p-6 shadow-md rounded-2xl backdrop-blur-md">
          {/* Decorative background shapes with active animations */}
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-destructive/5 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute right-32 top-4 h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none animate-bounce duration-10000" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                  <AlertOctagon className="h-5.5 w-5.5 text-primary-foreground animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Incident Response Hub
                    <span className="text-xs font-normal text-destructive animate-pulse">✦</span>
                  </h1>
                  <p className="text-[11px] text-muted-foreground/90 max-w-xl leading-relaxed">
                    Monitor system health, check SLA commitments, and resolve critical bottlenecks in real-time.
                  </p>
                </div>
              </div>
              {/* Stats Pills */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3.5 py-1 hover:bg-red-500/15 transition-colors cursor-pointer">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="h-2 w-2 rounded-full bg-red-500 -ml-3.5" />
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{openCount} Open Incidents</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/20 px-3.5 py-1 hover:bg-destructive/15 transition-colors cursor-pointer">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse" />
                  <span className="text-[11px] font-semibold text-destructive">{breach} SLA Breaches</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 hover:bg-emerald-500/15 transition-colors cursor-pointer">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">MTTR {mttr}</span>
                </div>
              </div>
            </div>

            {/* Right side: quick action */}
            <div className="flex items-center gap-3 shrink-0">
              <Button size="sm" onClick={() => navigate({ to: "/tasks/new" })} className="bg-destructive hover:bg-destructive/90 text-white font-semibold border border-destructive/20 shadow-lg shadow-destructive/15 hover-lift rounded-xl text-xs px-4 py-2">
                <Plus className="mr-1 h-4 w-4" /> Report Incident
              </Button>
            </div>
          </div>
        </div>

        {/* Premium Stat strip */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
            <div className="absolute right-2 top-2 text-red-500/10 pointer-events-none">
              <AlertOctagon className="h-10 w-10 animate-pulse" />
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV0 Critical</div>
            <div className="text-2xl font-extrabold text-red-500">{sevCounts[0]}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
            <div className="absolute right-2 top-2 text-orange-500/10 pointer-events-none">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV1 High</div>
            <div className="text-2xl font-extrabold text-orange-500">{sevCounts[1]}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV2 Medium</div>
            <div className="text-2xl font-extrabold text-yellow-500">{sevCounts[2]}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SEV3 Low</div>
            <div className="text-2xl font-extrabold text-blue-500">{sevCounts[3]}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all col-span-2 sm:col-span-1">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">SLA Breached</div>
            <div className="text-2xl font-extrabold text-red-500">{breach}</div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4 shadow-sm backdrop-blur-md hover-lift transition-all col-span-2 sm:col-span-1">
            <div className="absolute right-2 top-2 text-primary/10 pointer-events-none">
              <Activity className="h-10 w-10" />
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">MTTR (30d)</div>
            <div className="text-2xl font-extrabold text-primary">{mttr}</div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur-md px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick filter chips */}
            {(["open", "ack", "resolved", "breach", "all"] as IFilter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1 text-[11px] font-semibold transition-all border hover-lift
                  ${filter === f
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 bg-background/50"}`}>
                {f === "all" ? "All" : f === "ack" ? "Acknowledged" : f === "breach" ? "SLA Breach" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}

            <span className="h-4 w-px bg-border" />

            {/* Group By Selector */}
            <button
              onClick={() => {
                const order: GroupBy[] = ["severity", "environment", "status", "none"];
                setGroupBy(order[(order.indexOf(groupBy) + 1) % order.length]);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-background/50 transition-all hover-lift"
            >
              <Layers className="h-3.5 w-3.5" />
              Group: <span className="text-foreground font-semibold capitalize">{groupBy === "none" ? "None" : groupBy}</span>
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search issues…" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-8 w-52 pl-9 text-[12px] rounded-lg bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-emerald-500 transition-all duration-300"
            />
          </div>
        </div>

        {/* Issue Groups */}
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
              <Bug className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
              No issues match the current filters.
            </div>
          ) : groups.map((g) => {
            const isCollapsed = collapsed[g.key];
            return (
              <div key={g.key} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b border-border/40"
                  onClick={() => setCollapsed(c => ({ ...c, [g.key]: !c[g.key] }))}
                >
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                  <span className="font-semibold text-sm text-foreground">{g.label}</span>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">({g.items.length})</span>
                  <span className="ml-auto text-muted-foreground">
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto scrollbar-thin w-full">
                    <table className="w-full text-[12.5px] min-w-[800px]">
                      <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/40">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Issue</th>
                          <th className="px-3 py-2.5 font-semibold">Severity</th>
                          <th className="px-3 py-2.5 font-semibold">Env</th>
                          <th className="px-3 py-2.5 font-semibold">Version</th>
                          <th className="px-3 py-2.5 font-semibold">Reporter</th>
                          <th className="px-3 py-2.5 font-semibold">Assignees</th>
                          <th className="px-3 py-2.5 font-semibold">SLA</th>
                          <th className="px-3 py-2.5 font-semibold">Status</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {g.items.map((i) => {
                          const t = tasks.find((x) => x.id === i.taskId);
                          const status = i.resolved ? "Resolved" : i.acknowledged ? "Acknowledged" : "Open";
                          const statusColor = i.resolved ? "text-success bg-success/10 border-success/20" : i.acknowledged ? "text-info bg-info/10 border-info/20" : "text-destructive bg-destructive/10 border-destructive/20";
                          return (
                            <tr key={i.id} className="hover:bg-muted/30 transition-all duration-200 hover-lift">
                              <td className="px-4 py-3">
                                <Link to="/incidents/$id" params={{ id: i.taskId }}
                                  className="font-semibold text-foreground hover:text-primary transition-colors hover:underline">
                                  {t?.title}
                                </Link>
                                <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{i.id.toUpperCase()}</div>
                              </td>
                              <td className="px-3 py-3">
                                <ZSeverityPill sev={i.severity} />
                              </td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 rounded border-border bg-background/50">{i.environment}</Badge>
                              </td>
                              <td className="px-3 py-3 font-mono text-[10px] text-muted-foreground">{i.affectedVersion ?? "—"}</td>
                              <td className="px-3 py-3 text-[11px] text-muted-foreground">{i.customerName || "Internal"}</td>
                              <td className="px-3 py-3">
                                <ZAvatarStack ids={t?.assigneeIds ?? []} />
                              </td>
                              <td className="px-3 py-3">
                                <SlaCountdown label="Resp" target={i.slaTargetResponse} done={i.acknowledged} />
                              </td>
                              <td className="px-3 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{status}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {!i.acknowledged && !i.resolved && (
                                    <Button size="sm" variant="ghost" className="h-7 px-2.5 text-[11px] rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 hover:bg-yellow-500/15" onClick={async () => {
                                      await ack.mutateAsync(i.id); toast.success("Acknowledged");
                                    }}>
                                      <Eye className="mr-1 h-3.5 w-3.5" /> Ack
                                    </Button>
                                  )}
                                  {!i.resolved && i.acknowledged && <ResolveDialog issueId={i.id} />}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

function ResolveDialog({ issueId }: { issueId: string }) {
  const [open, setOpen] = useState(false);
  const [rc, setRc] = useState("");
  const [res, setRes] = useState("");
  const resolve = useResolveIssue();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2.5 text-[11px] rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/15">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolve
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-2xl border border-border/80 bg-card p-6 shadow-xl backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Resolve Incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 my-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Root Cause</Label>
            <Textarea
              value={rc}
              onChange={(e) => setRc(e.target.value)}
              placeholder="Describe what triggered the incident..."
              className="min-h-[80px] text-xs rounded-xl border border-border/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-background/50 placeholder:text-muted-foreground/60 transition-all duration-300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Resolution</Label>
            <Textarea
              value={res}
              onChange={(e) => setRes(e.target.value)}
              placeholder="Describe the fix or hotfix applied to resolve it..."
              className="min-h-[80px] text-xs rounded-xl border border-border/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-background/50 placeholder:text-muted-foreground/60 transition-all duration-300"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs rounded-xl">Cancel</Button>
          <Button
            size="sm"
            onClick={async () => {
              if (!rc || !res) return toast.error("RCA and Resolution required");
              await resolve.mutateAsync({ issueId, rootCause: rc, resolution: res });
              toast.success("Incident resolved successfully");
              setOpen(false);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-xs px-4"
          >
            Resolve Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
