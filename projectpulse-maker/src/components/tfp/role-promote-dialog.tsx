import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canPromote, usePromoteUser } from "@/lib/queries";
import type { RoleName, User } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, ShieldAlert, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";

const ROLES: { name: RoleName; level: number; label: string }[] = [
  { name: "GUEST", level: 0, label: "L0 · Guest" },
  { name: "TEAM_MEMBER", level: 1, label: "L1 · Team Member" },
  { name: "TEAM_LEAD", level: 2, label: "L2 · Team Lead" },
  { name: "DEPT_HEAD", level: 3, label: "L3 · Department Head" },
  { name: "ORG_ADMIN", level: 4, label: "L4 · Org Admin" },
  { name: "ORG_OWNER", level: 5, label: "L5 · Org Owner" },
];

export function RolePromoteDialog({ user, trigger }: { user: User; trigger?: React.ReactNode }) {
  const { user: actor } = useAuth();
  const promote = usePromoteUser();
  const [open, setOpen] = useState(false);
  const currentLevel = user.roleLevel ?? 0;
  const actorLevel = actor?.roleLevel ?? 0;
  const [target, setTarget] = useState<string>("");

  const targetRole = ROLES.find((r) => r.name === target);
  const check = targetRole
    ? canPromote(actorLevel, currentLevel, targetRole.level)
    : { ok: false, reason: "Select a target role" };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <ArrowUpCircle className="mr-1 h-3 w-3" /> Promote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Promote {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current role</span>
              <span className="font-medium">
                L{currentLevel} · {user.roleName}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Your authority</span>
              <span className="font-mono text-primary">L{actorLevel}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Max assignable (L+2 rule)</span>
              <span className="font-mono">L{Math.max(0, actorLevel - 2)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              New role
            </label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter((r) => r.level > currentLevel).map((r) => (
                  <SelectItem key={r.name} value={r.name}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target && !check.ok && (
            <Alert variant="destructive" className="border-destructive/40">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="text-sm">Permission denied</AlertTitle>
              <AlertDescription className="text-xs">{check.reason}</AlertDescription>
            </Alert>
          )}
          {target && check.ok && (
            <Alert className="border-primary/40 bg-primary/5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertTitle className="text-sm">Authorized</AlertTitle>
              <AlertDescription className="text-xs">
                You can promote {user.name} to {targetRole?.label}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!check.ok || promote.isPending}
            className="bg-gradient-primary text-primary-foreground"
            onClick={async () => {
              if (!targetRole) return;
              try {
                await promote.mutateAsync({
                  userId: user.id,
                  newRole: targetRole.name,
                  newLevel: targetRole.level,
                  actorLevel,
                  currentLevel,
                });
                toast.success(`${user.name} promoted to ${targetRole.label}`);
                setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Promotion failed");
              }
            }}
          >
            {promote.isPending ? "Promoting…" : "Confirm promotion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
