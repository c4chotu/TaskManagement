import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useDepartments, useOnboardUser, useTeams } from "@/lib/queries";
import { toast } from "sonner";
import { Shield, Mail, Users, Key, UserPlus } from "lucide-react";
import type { RoleName } from "@/lib/types";

export const Route = createFileRoute("/_app/people-onboarding")({
  head: () => ({ meta: [{ title: "Onboard Member — TaskFlow Pro" }] }),
  component: PeopleOnboardingPage,
});

const steps = [
  { id: 1, title: "Personal", description: "Who are we inviting?" },
  { id: 2, title: "Access", description: "What access should they receive?" },
  { id: 3, title: "Review", description: "Confirm before sending." },
];

function PeopleOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const onboardUser = useOnboardUser();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "password123",
    roleName: "TEAM_MEMBER" as RoleName,
    departmentId: "",
    teamId: "",
  });

  const isAuthorized = user && ((user.roleLevel ?? 0) >= 4 || user.roleName === "SUPER_ADMIN");
  const availableTeams = useMemo(
    () => (form.departmentId ? teams.filter((team) => team.departmentId === form.departmentId) : teams),
    [form.departmentId, teams],
  );

  if (!isAuthorized) {
    return (
      <>
        <Topbar title="Access Denied" />
        <main className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <Shield className="mb-4 h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-semibold">Team Onboarding Restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">Only administrators can invite new members to the workspace.</p>
          <Button className="mt-6 bg-gradient-primary text-primary-foreground" onClick={() => navigate({ to: "/people" })}>Back to People</Button>
        </main>
      </>
    );
  }

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep((step) => step + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((step) => step - 1);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Fill in the required fields before proceeding.");
      return;
    }
    try {
      await onboardUser.mutateAsync({
        name: form.name,
        email: form.email,
        password: form.password,
        roleName: form.roleName,
        departmentId: form.departmentId || undefined,
        teamId: form.teamId || undefined,
      });
      toast.success(`${form.name} invited successfully.`);
      navigate({ to: "/people" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to onboard user.");
    }
  };

  return (
    <>
      <Topbar title="Onboard Member" />
      <main className="flex-1 space-y-6 p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</p>
          <h1 className="text-2xl font-semibold">Invite a new member</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Guide new teammates through a structured onboarding flow, from identity to access rights.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="space-y-4 p-5">
            {steps.map((step) => (
              <div key={step.id} className={`rounded-xl border p-4 transition ${currentStep === step.id ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Step {step.id}</p>
                <h2 className="mt-2 font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="pl-10"
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      type="email"
                      className="pl-10"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Temporary password</Label>
                  <div className="relative">
                    <Key className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={form.roleName} onValueChange={(value) => setForm({ ...form, roleName: value as RoleName })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORG_ADMIN">Organization Admin</SelectItem>
                      <SelectItem value="DEPT_HEAD">Department Head</SelectItem>
                      <SelectItem value="TEAM_LEAD">Team Lead</SelectItem>
                      <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                      <SelectItem value="GUEST">Guest Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select value={form.departmentId || ""} onValueChange={(value) => setForm({ ...form, departmentId: value === "_none" ? "" : value, teamId: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No department</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Team</Label>
                  <Select value={form.teamId || ""} onValueChange={(value) => setForm({ ...form, teamId: value === "_none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No team</SelectItem>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <p className="text-sm font-semibold">Review invitation</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div><strong>Name:</strong> {form.name || "—"}</div>
                    <div><strong>Email:</strong> {form.email || "—"}</div>
                    <div><strong>Role:</strong> {form.roleName.replace(/_/g, " ")}</div>
                    <div><strong>Department:</strong> {departments.find((dept) => dept.id === form.departmentId)?.name || "None"}</div>
                    <div><strong>Team:</strong> {availableTeams.find((team) => team.id === form.teamId)?.name || "None"}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>Back</Button>
              {currentStep < 3 ? (
                <Button onClick={handleNext}>Continue</Button>
              ) : (
                <Button className="bg-gradient-primary text-primary-foreground" onClick={handleSubmit} disabled={onboardUser.isPending}>
                  {onboardUser.isPending ? "Inviting..." : "Send Invitation"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
