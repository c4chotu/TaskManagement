import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOnCall, useUsers } from "@/lib/queries";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldAlert, Phone } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/on-call")({
  head: () => ({ meta: [{ title: "On-Call — TaskFlow Pro" }] }),
  component: OnCallPage,
});

function OnCallPage() {
  const { data: shifts = [] } = useOnCall();
  const { data: users = [] } = useUsers();
  const grouped = shifts.reduce<Record<string, typeof shifts>>((acc, s) => {
    (acc[s.weekStartDate] ??= []).push(s);
    return acc;
  }, {});
  return (
    <>
      <Topbar title="On-Call Schedule" />
      <main className="flex-1 space-y-4 p-6">
        <Card className="flex items-center gap-4 border-primary/30 bg-primary/5 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Currently on-call (Primary)
            </p>
            <p className="text-base font-semibold">
              {users.find((u) => u.id === shifts[0]?.userId)?.name ?? "—"}
            </p>
          </div>
        </Card>
        <div className="space-y-3">
          {Object.entries(grouped).map(([week, list]) => (
            <Card key={week} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Week of {format(new Date(week), "MMM d, yyyy")}
                </h3>
                <ShieldAlert className="h-4 w-4 text-primary" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((s) => {
                  const u = users.find((x) => x.id === s.userId);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3"
                    >
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-muted text-xs">
                          {u?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{u?.name}</p>
                        <p className="text-xs text-muted-foreground">{u?.roleName}</p>
                      </div>
                      <Badge
                        variant={s.coverageType === "PRIMARY" ? "default" : "outline"}
                        className={
                          s.coverageType === "PRIMARY" ? "bg-primary text-primary-foreground" : ""
                        }
                      >
                        {s.coverageType}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
