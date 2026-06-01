import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
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
  Activity, AlertTriangle,
} from "lucide-react";
import {
  ZGroupBar, ZToolbar, ZChip, ZEmpty,
} from "@/components/tfp/zoho";
import {
  ZPageHeader, ZSeverityPill, ZAvatarStack, ZStat, ZToolStrip, ZToolBtn,
} from "@/components/zoho/components";

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
      <ZPageHeader
        title="Issues"
        subtitle={`${openCount} open · ${breach} breaching SLA · MTTR ${mttr}`}
      />

      <main className="flex-1 space-y-3 p-5">
        {/* Stat strip */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <ZStat label="SEV0" value={sevCounts[0]} tone="destructive" icon={AlertOctagon} />
          <ZStat label="SEV1" value={sevCounts[1]} tone="warning" icon={AlertTriangle} />
          <ZStat label="SEV2" value={sevCounts[2]} tone="warning" />
          <ZStat label="SEV3" value={sevCounts[3]} tone="info" />
          <ZStat label="SLA Breach" value={breach} tone="destructive" />
          <ZStat label="MTTR" value={mttr} tone="primary" sub="last 30 days" icon={Activity} />
        </section>

        <ZToolbar
          left={
            <>
              <ZChip active={filter === "open"} onClick={() => setFilter("open")}>Open</ZChip>
              <ZChip active={filter === "ack"} onClick={() => setFilter("ack")}>Acknowledged</ZChip>
              <ZChip active={filter === "resolved"} onClick={() => setFilter("resolved")}>Resolved</ZChip>
              <ZChip active={filter === "breach"} onClick={() => setFilter("breach")}>SLA Breach</ZChip>
              <ZChip active={filter === "all"} onClick={() => setFilter("all")}>All</ZChip>
              <span className="mx-2 h-4 w-px bg-border" />
              <ZToolStrip>
                <ZToolBtn icon={Layers} label={`Group: ${groupBy}`} onClick={() => {
                  const order: GroupBy[] = ["severity", "environment", "status", "none"];
                  setGroupBy(order[(order.indexOf(groupBy) + 1) % order.length]);
                }} />
                <ZToolBtn icon={Filter} label="Filter" />
                <ZToolBtn icon={ArrowUpDown} label="Sort" />
              </ZToolStrip>
            </>
          }
          right={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search issues…" value={q} onChange={(e) => setQ(e.target.value)}
                className="h-8 w-60 pl-8 text-[12.5px]" />
            </div>
          }
        />

        <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
          {groups.length === 0 ? (
            <ZEmpty icon={Bug} title="No issues match." />
          ) : groups.map((g) => {
            const isCollapsed = collapsed[g.key];
            return (
              <div key={g.key}>
                <ZGroupBar
                  label={g.label} count={g.items.length} color={g.color}
                  collapsed={isCollapsed}
                  onToggle={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                />
                {!isCollapsed && (
                  <table className="w-full text-[12.5px]">
                    <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-1.5 font-medium">Issue</th>
                        <th className="px-2 py-1.5 font-medium">Severity</th>
                        <th className="px-2 py-1.5 font-medium">Env</th>
                        <th className="px-2 py-1.5 font-medium">Version</th>
                        <th className="px-2 py-1.5 font-medium">Reporter</th>
                        <th className="px-2 py-1.5 font-medium">Assignees</th>
                        <th className="px-2 py-1.5 font-medium">SLA</th>
                        <th className="px-2 py-1.5 font-medium">Status</th>
                        <th className="px-2 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((i) => {
                        const t = tasks.find((x) => x.id === i.taskId);
                        const status = i.resolved ? "Resolved" : i.acknowledged ? "Acknowledged" : "Open";
                        const statusColor = i.resolved ? "text-success" : i.acknowledged ? "text-info" : "text-destructive";
                        return (
                          <tr key={i.id} className="border-t border-border/60 hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <Link to="/incidents/$id" params={{ id: i.taskId }}
                                className="font-medium text-foreground hover:text-primary hover:underline">
                                {t?.title}
                              </Link>
                              <div className="font-mono text-[10px] text-muted-foreground">{i.id.toUpperCase()}</div>
                            </td>
                            <td className="px-2 py-2"><ZSeverityPill sev={i.severity} /></td>
                            <td className="px-2 py-2">
                              <Badge variant="outline" className="text-[9.5px] uppercase">{i.environment}</Badge>
                            </td>
                            <td className="px-2 py-2 font-mono text-[10px] text-muted-foreground">{i.affectedVersion ?? "—"}</td>
                            <td className="px-2 py-2 text-[11px] text-muted-foreground">{i.customerName || "Internal"}</td>
                            <td className="px-2 py-2"><ZAvatarStack ids={t?.assigneeIds ?? []} /></td>
                            <td className="px-2 py-2">
                              <SlaCountdown label="Resp" target={i.slaTargetResponse} done={i.acknowledged} />
                            </td>
                            <td className={`px-2 py-2 text-[11px] font-medium ${statusColor}`}>{status}</td>
                            <td className="px-2 py-2 text-right">
                              {!i.acknowledged && !i.resolved && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={async () => {
                                  await ack.mutateAsync(i.id); toast.success("Acknowledged");
                                }}>
                                  <Eye className="mr-1 h-3 w-3" /> Ack
                                </Button>
                              )}
                              {!i.resolved && i.acknowledged && <ResolveDialog issueId={i.id} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-success">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Resolve issue</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Root cause</Label>
            <Textarea value={rc} onChange={(e) => setRc(e.target.value)} placeholder="What caused this?" />
          </div>
          <div className="space-y-1.5">
            <Label>Resolution</Label>
            <Textarea value={res} onChange={(e) => setRes(e.target.value)} placeholder="What was done to fix it?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={async () => {
            if (!rc || !res) return toast.error("RCA required");
            await resolve.mutateAsync({ issueId, rootCause: rc, resolution: res });
            toast.success("Issue resolved"); setOpen(false);
          }}>Resolve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
