import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useUpdateUserRole, useUpdateUserTeam, useTeams } from "@/lib/queries";
import type { RoleName, User } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import {
  ShieldCheck,
  ArrowUpCircle,
  ArrowDownCircle,
  Crown,
  Shield,
  Star,
  UserCheck,
  Users,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES: { name: RoleName; level: number; label: string; description: string; color: string }[] = [
  { name: "GUEST",       level: 0, label: "L0 · Guest",            description: "View-only access",          color: "text-slate-400" },
  { name: "TEAM_MEMBER", level: 1, label: "L1 · Team Member",      description: "Regular contributor",        color: "text-blue-400" },
  { name: "TEAM_LEAD",   level: 2, label: "L2 · Team Lead",        description: "Leads a team",               color: "text-emerald-400" },
  { name: "DEPT_HEAD",   level: 3, label: "L3 · Department Head",  description: "Manages a department",       color: "text-violet-400" },
  { name: "ORG_ADMIN",   level: 4, label: "L4 · Org Admin",        description: "Organization admin",         color: "text-amber-400" },
  { name: "ORG_OWNER",   level: 5, label: "L5 · Org Owner",        description: "Full control",               color: "text-rose-400" },
];

const ROLE_ICONS: Record<string, React.ElementType> = {
  ORG_OWNER: Crown,
  ORG_ADMIN: Shield,
  DEPT_HEAD: Star,
  TEAM_LEAD: Users,
  TEAM_MEMBER: UserCheck,
  GUEST: UserCheck,
};

interface RoleManageDialogProps {
  user: User;
  trigger?: React.ReactNode;
  defaultTab?: "role" | "team";
}

export function RoleManageDialog({ user, trigger, defaultTab = "role" }: RoleManageDialogProps) {
  const { user: actor } = useAuth();
  const updateRole = useUpdateUserRole();
  const updateTeam = useUpdateUserTeam();
  const { data: teams = [] } = useTeams();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"role" | "team">(defaultTab);
  const [targetRole, setTargetRole] = useState<string>("");
  const [targetTeamId, setTargetTeamId] = useState<string>((user as any).teamId ?? "unassigned");

  const currentLevel = user.roleLevel ?? 0;
  const actorLevel = actor?.roleLevel ?? 5; // Default to owner in mock
  const currentRole = ROLES.find(r => r.name === user.roleName);
  const selectedRole = ROLES.find(r => r.name === targetRole);
  const RoleIcon = ROLE_ICONS[user.roleName ?? "GUEST"] ?? UserCheck;

  const isPromotion = selectedRole ? selectedRole.level > currentLevel : false;
  const isDemotion = selectedRole ? selectedRole.level < currentLevel : false;

  // Actor can manage anyone below their level (L+1 rule for demotion, L+2 for promotion)
  const canChangeRole = (newLevel: number) => {
    if (actorLevel <= currentLevel) return { ok: false, reason: "You cannot manage users at or above your role level." };
    if (newLevel >= actorLevel) return { ok: false, reason: `You cannot assign roles at or above your own level (L${actorLevel}).` };
    return { ok: true };
  };

  const check = selectedRole ? canChangeRole(selectedRole.level) : { ok: false, reason: "Select a role" };

  const handleRoleChange = async () => {
    if (!selectedRole || !check.ok) return;
    try {
      await updateRole.mutateAsync({
        userId: user.id,
        newRole: selectedRole.name,
        newLevel: selectedRole.level,
      });
      toast.success(`${user.name} is now ${selectedRole.label}`);
      setOpen(false);
      setTargetRole("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Role change failed");
    }
  };

  const handleTeamChange = async () => {
    const teamId = targetTeamId === "unassigned" ? undefined : targetTeamId;
    try {
      await updateTeam.mutateAsync({ userId: user.id, teamId });
      const teamName = teams.find(t => t.id === teamId)?.name ?? "Unassigned";
      toast.success(`${user.name} moved to ${teamName}`);
      setOpen(false);
    } catch {
      toast.error("Team reassignment failed");
    }
  };

  const handleMakeTeamLead = async (teamId: string) => {
    try {
      // Move user to team + upgrade role to TEAM_LEAD if they're a member
      await updateTeam.mutateAsync({ userId: user.id, teamId });
      if (currentLevel < 2) {
        await updateRole.mutateAsync({ userId: user.id, newRole: "TEAM_LEAD", newLevel: 2 });
      }
      const teamName = teams.find(t => t.id === teamId)?.name ?? "";
      toast.success(`${user.name} is now Team Lead of ${teamName}`);
      setOpen(false);
    } catch {
      toast.error("Failed to assign team lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <ShieldCheck className="h-3 w-3" /> Manage Role
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            Role & Team Management
          </DialogTitle>
          <DialogDescription>
            Manage {user.name}'s role level and team assignment.
          </DialogDescription>
        </DialogHeader>

        {/* User Info Card */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20 text-sm font-bold">
              {user.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={cn("text-[10px] gap-1 border-current/30", currentRole?.color)}
            >
              <RoleIcon className="h-3 w-3" />
              {currentRole?.label ?? user.roleName}
            </Badge>
            {(() => {
              const userTeam = teams.find(t => t.id === (user as any).teamId);
              return userTeam ? (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5" />
                  {userTeam.name}
                </span>
              ) : null;
            })()}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setTab("role")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
              tab === "role"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/30"
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            Change Role
          </button>
          <Separator orientation="vertical" className="h-auto" />
          <button
            onClick={() => setTab("team")}
            className={cn(
              "flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
              tab === "team"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/30"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Reassign Team
          </button>
        </div>

        {/* ROLE TAB */}
        {tab === "role" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => {
                const RIcon = ROLE_ICONS[role.name] ?? UserCheck;
                const isCurrentRole = role.name === user.roleName;
                const isSelected = targetRole === role.name;
                const chk = canChangeRole(role.level);

                return (
                  <button
                    key={role.name}
                    disabled={isCurrentRole || !chk.ok}
                    onClick={() => setTargetRole(role.name)}
                    className={cn(
                      "flex items-start gap-2 p-3 rounded-xl border text-left transition-all",
                      isCurrentRole
                        ? "border-primary/40 bg-primary/5 cursor-default"
                        : isSelected
                          ? "border-emerald-500/60 bg-emerald-500/10 shadow-primary-xs"
                          : chk.ok
                            ? "border-border/60 hover:border-primary/40 hover:bg-muted/30 cursor-pointer"
                            : "border-border/30 opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0", role.color)}>
                      <RIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-xs font-semibold", role.color)}>{role.label}</p>
                        {isCurrentRole && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{role.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action indication */}
            {selectedRole && (
              <div className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5 text-xs",
                check.ok
                  ? isPromotion
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                    : isDemotion
                      ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
                      : "border-primary/30 bg-primary/5 text-primary"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              )}>
                {check.ok ? (
                  <>
                    {isPromotion ? (
                      <ArrowUpCircle className="h-4 w-4 shrink-0" />
                    ) : isDemotion ? (
                      <ArrowDownCircle className="h-4 w-4 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {isPromotion ? "Promote" : isDemotion ? "Demote" : "Reassign"}{" "}
                      <strong>{user.name}</strong> from <em>{currentRole?.label}</em> to{" "}
                      <em>{selectedRole.label}</em>
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{check.reason}</span>
                  </>
                )}
              </div>
            )}

            <DialogFooter className="pt-1">
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setTargetRole(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!targetRole || !check.ok || updateRole.isPending}
                className={cn(
                  "font-semibold",
                  isDemotion
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-gradient-primary text-primary-foreground"
                )}
                onClick={handleRoleChange}
              >
                {updateRole.isPending
                  ? "Saving…"
                  : isDemotion
                    ? "Confirm Demotion"
                    : "Confirm Promotion"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* TEAM TAB */}
        {tab === "team" && (
          <div className="space-y-4">
            {/* Quick: Make Team Lead */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Quick: Assign as Team Lead
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto">
                {teams.map((team) => {
                  const currentLead = team.leadUserId === user.id;
                  return (
                    <button
                      key={team.id}
                      disabled={currentLead}
                      onClick={() => handleMakeTeamLead(team.id)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all",
                        currentLead
                          ? "border-violet-500/40 bg-violet-500/5 cursor-default"
                          : "border-border/60 hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer"
                      )}
                    >
                      <Crown className={cn("h-3.5 w-3.5 shrink-0", currentLead ? "text-violet-500" : "text-muted-foreground")} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{team.name}</p>
                        {currentLead && (
                          <span className="text-[9px] text-violet-500">Current Lead</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Regular team assignment */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Move to Team (as Member)
              </p>
              <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned (Pool)</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={updateTeam.isPending}
                className="bg-gradient-primary text-primary-foreground font-semibold"
                onClick={handleTeamChange}
              >
                {updateTeam.isPending ? "Saving…" : "Move to Team"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
