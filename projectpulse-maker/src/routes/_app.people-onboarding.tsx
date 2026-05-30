import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useDepartments, useOnboardUser, useTeams } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Mail, Shield, Network, Users, Key } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RoleName } from "@/lib/types";

export const Route = createFileRoute("/_app/people-onboarding")({
  head: () => ({ meta: [{ title: "Onboard Member — TaskFlow Pro" }] }),
  component: PeopleOnboardingPage,
});

function PeopleOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: depts = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const onboardUser = useOnboardUser();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "password123",
    roleName: "TEAM_MEMBER" as RoleName,
    teamId: "",
    departmentId: ""
  });

  // Verify permission: Org Admins (Level 4) or Org Owners (Level 5) can onboard users
  const isAuthorized = user && (user.roleLevel && user.roleLevel >= 4 || user.roleName === "SUPER_ADMIN");
  
  if (!isAuthorized) {
    return (
      <>
        <Topbar title="Access Denied" />
        <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <Shield className="h-16 w-16 text-destructive mb-4 animate-bounce" />
          <h2 className="text-xl font-bold tracking-tight">Onboarding Privileges Required</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Only Organization Administrators and Owners are authorized to onboard new members to the workforce.
          </p>
          <Button onClick={() => navigate({ to: "/people" })} className="mt-4 bg-gradient-primary">
            Back to People
          </Button>
        </main>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      return toast.error("Please fill in all required fields.");
    }
    try {
      await onboardUser.mutateAsync({
        name: form.name,
        email: form.email,
        password: form.password,
        roleName: form.roleName,
        teamId: form.teamId || undefined,
        departmentId: form.departmentId || undefined
      });
      toast.success(`${form.name} has been onboarded successfully!`);
      navigate({ to: "/people" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to onboard user.");
    }
  };

  const selectedDeptTeams = form.departmentId
    ? teams.filter((t) => t.departmentId === form.departmentId)
    : teams;

  return (
    <>
      <Topbar title="Onboard New Member" />
      <main className="flex-1 max-w-2xl mx-auto space-y-6 p-6 scrollbar-thin">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight">Invite to Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Register a new employee or guest. They will immediately receive access to their assigned projects and departments.
          </p>
        </div>

        <Card className="p-6 bg-gradient-to-br from-card to-background hover:shadow-glow transition-all">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="E.g. Alan Turing"
                    className="pl-9"
                    required
                  />
                  <UserPlus className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="turing@company.com"
                    className="pl-9"
                    required
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Temporary Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="pl-9"
                  required
                />
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <Label htmlFor="roleName">System Role *</Label>
              <Select
                value={form.roleName}
                onValueChange={(v) => setForm({ ...form, roleName: v as RoleName })}
              >
                <SelectTrigger id="roleName">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORG_ADMIN">Organization Admin (Level 4)</SelectItem>
                  <SelectItem value="DEPT_HEAD">Department Head (Level 3)</SelectItem>
                  <SelectItem value="TEAM_LEAD">Team Lead (Level 2)</SelectItem>
                  <SelectItem value="TEAM_MEMBER">Team Member (Level 1)</SelectItem>
                  <SelectItem value="GUEST">Guest Viewer (Level 0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="departmentId">Department Assignment</Label>
                <div className="relative">
                  <Select
                    value={form.departmentId}
                    onValueChange={(v) => setForm({ ...form, departmentId: v, teamId: "" })}
                  >
                    <SelectTrigger id="departmentId" className="pl-9">
                      <SelectValue placeholder="No department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {depts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Network className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="teamId">Team Assignment</Label>
                <div className="relative">
                  <Select
                    value={form.teamId}
                    onValueChange={(v) => setForm({ ...form, teamId: v })}
                    disabled={!form.departmentId}
                  >
                    <SelectTrigger id="teamId" className="pl-9">
                      <SelectValue placeholder="No team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {selectedDeptTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/people" })}>
                Cancel
              </Button>
              <Button type="submit" disabled={onboardUser.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {onboardUser.isPending ? "Onboarding..." : "Onboard Member"}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}
