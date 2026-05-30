import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAckIssue, useIssues, useResolveIssue, useTasks } from "@/lib/queries";
import { SeverityBadge } from "@/components/tfp/badges";
import { SlaCountdown } from "@/components/tfp/sla";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { findUser } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/incidents")({
  head: () => ({ meta: [{ title: "Incidents — TaskFlow Pro" }] }),
  component: IncidentsPage,
});

function IncidentsPage() {
  const { data: issues = [] } = useIssues();
  const { data: tasks = [] } = useTasks();
  const ack = useAckIssue();

  return (
    <>
      <Topbar title="Incidents" />
      <main className="flex-1 space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {(["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((sev) => (
            <Card key={sev} className="p-4">
              <SeverityBadge severity={sev} />
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {issues.filter((i) => i.severity === sev && !i.resolved).length}
              </p>
              <p className="text-xs text-muted-foreground">active</p>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          {issues.map((i) => {
            const t = tasks.find((x) => x.id === i.taskId);
            return (
              <Card key={i.id} className="p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px_220px]">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <SeverityBadge severity={i.severity} />
                      {i.resolved ? (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          Resolved
                        </Badge>
                      ) : i.acknowledged ? (
                        <Badge variant="outline" className="border-info/40 text-info">
                          Acknowledged
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive/40 text-destructive">
                          Open
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {i.environment}
                      </Badge>
                    </div>
                    <Link
                      to="/incidents/$id"
                      params={{ id: i.taskId }}
                      className="text-base font-semibold hover:text-primary"
                    >
                      {t?.title}
                    </Link>
                    {i.customerName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reported by {i.customerName}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {t?.assigneeIds.map((uid) => {
                        const u = findUser(uid);
                        return (
                          <Avatar key={uid} className="h-6 w-6 border border-border">
                            <AvatarFallback className="bg-muted text-[10px]">
                              {u?.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <SlaCountdown
                      label="Response"
                      target={i.slaTargetResponse}
                      done={i.acknowledged}
                    />
                    <SlaCountdown label="Fix" target={i.slaTargetFix} done={i.resolved} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {!i.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await ack.mutateAsync(i.id);
                          toast.success("Acknowledged");
                        }}
                      >
                        <Eye className="mr-1 h-3 w-3" /> Acknowledge
                      </Button>
                    )}
                    {!i.resolved && i.acknowledged && <ResolveDialog issueId={i.id} />}
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/incidents/$id" params={{ id: i.taskId }}>
                        View details →
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
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
        <Button size="sm" className="bg-gradient-primary text-primary-foreground">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Root cause</Label>
            <Textarea
              value={rc}
              onChange={(e) => setRc(e.target.value)}
              placeholder="What caused this?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Resolution</Label>
            <Textarea
              value={res}
              onChange={(e) => setRes(e.target.value)}
              placeholder="What was done to fix it?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!rc || !res) return toast.error("RCA required to resolve");
              await resolve.mutateAsync({ issueId, rootCause: rc, resolution: res });
              toast.success("Incident resolved");
              setOpen(false);
            }}
            className="bg-gradient-primary text-primary-foreground"
          >
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
