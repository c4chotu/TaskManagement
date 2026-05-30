import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, CheckCircle2, Bug } from "lucide-react";
import { ZWidget, ZCountTile, ZGroupBar, ZToolbar, ZChip, ZEmpty } from "@/components/tfp/zoho";

export const Route = createFileRoute("/_app/incidents")({
  head: () => ({ meta: [{ title: "Issues — TaskFlow Pro" }] }),
  component: IncidentsPage,
});

type IFilter = "all" | "open" | "ack" | "resolved";

function IncidentsPage() {
  const { data: issues = [] } = useIssues();
  const { data: tasks = [] } = useTasks();
  const ack = useAckIssue();
  const [filter, setFilter] = useState<IFilter>("open");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => issues.filter((i) => {
    if (filter === "open") return !i.acknowledged && !i.resolved;
    if (filter === "ack") return i.acknowledged && !i.resolved;
    if (filter === "resolved") return i.resolved;
    return true;
  }), [issues, filter]);

  const groups = (["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((sev, idx) => ({
    key: sev,
    label: `${sev} · ${["Critical", "High", "Medium", "Low"][idx]}`,
    color: `var(--color-sev-${idx})`,
    items: filtered.filter((i) => i.severity === sev),
  })).filter((g) => g.items.length);

  return (
    <>
      <Topbar title="Issues" />
      <main className="flex-1 space-y-3 p-5">
        {/* Top severity tiles */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((sev, idx) => (
            <ZCountTile
              key={sev}
              label={`${sev} · ${["Critical", "High", "Medium", "Low"][idx]}`}
              count={issues.filter((i) => i.severity === sev && !i.resolved).length}
              tone={idx === 0 ? "destructive" : idx === 1 ? "warning" : idx === 2 ? "primary" : "info"}
            />
          ))}
        </section>

        <ZToolbar
          left={
            <>
              <ZChip active={filter === "open"} onClick={() => setFilter("open")}>Open</ZChip>
              <ZChip active={filter === "ack"} onClick={() => setFilter("ack")}>Acknowledged</ZChip>
              <ZChip active={filter === "resolved"} onClick={() => setFilter("resolved")}>Resolved</ZChip>
              <ZChip active={filter === "all"} onClick={() => setFilter("all")}>All</ZChip>
            </>
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
                  label={g.label}
                  count={g.items.length}
                  color={g.color}
                  collapsed={isCollapsed}
                  onToggle={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                />
                {!isCollapsed && (
                  <table className="w-full text-[12.5px]">
                    <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-1.5 font-medium">Title</th>
                        <th className="px-2 py-1.5 font-medium">Env</th>
                        <th className="px-2 py-1.5 font-medium">Reporter</th>
                        <th className="px-2 py-1.5 font-medium">Assignee</th>
                        <th className="px-2 py-1.5 font-medium">SLA</th>
                        <th className="px-2 py-1.5 font-medium">Status</th>
                        <th className="px-2 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((i) => {
                        const t = tasks.find((x) => x.id === i.taskId);
                        const status = i.resolved ? "Resolved" : i.acknowledged ? "Acknowledged" : "Open";
                        const statusColor = i.resolved ? "text-primary" : i.acknowledged ? "text-info" : "text-destructive";
                        return (
                          <tr key={i.id} className="border-t border-border/60 hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <Link to="/incidents/$id" params={{ id: i.taskId }} className="font-medium text-foreground hover:text-primary hover:underline">
                                {t?.title}
                              </Link>
                              {i.customerName && <p className="text-[10.5px] text-muted-foreground">Reported by {i.customerName}</p>}
                            </td>
                            <td className="px-2 py-2">
                              <Badge variant="outline" className="text-[9.5px] uppercase">{i.environment}</Badge>
                            </td>
                            <td className="px-2 py-2 text-[11px] text-muted-foreground">{i.customerName || "—"}</td>
                            <td className="px-2 py-2">
                              <div className="flex -space-x-2">
                                {t?.assigneeIds.slice(0, 3).map((uid) => {
                                  const u = findUser(uid);
                                  return (
                                    <Avatar key={uid} className="h-6 w-6 border border-card">
                                      <AvatarFallback className="bg-muted text-[9px]">
                                        {u?.name?.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-col gap-0.5">
                                <SlaCountdown label="Resp" target={i.slaTargetResponse} done={i.acknowledged} />
                              </div>
                            </td>
                            <td className={`px-2 py-2 text-[11px] font-medium ${statusColor}`}>{status}</td>
                            <td className="px-2 py-2 text-right">
                              {!i.acknowledged && !i.resolved && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={async () => {
                                  await ack.mutateAsync(i.id);
                                  toast.success("Acknowledged");
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
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-primary">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Resolve incident</DialogTitle></DialogHeader>
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
            if (!rc || !res) return toast.error("RCA required to resolve");
            await resolve.mutateAsync({ issueId, rootCause: rc, resolution: res });
            toast.success("Incident resolved");
            setOpen(false);
          }}>Resolve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
