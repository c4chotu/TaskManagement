import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useOnboardOrg, useSuperAdminOrgs, useSuperAdminPlans, useUpdateOrgPlan } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  FolderKanban,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Plus,
  Activity,
  DollarSign
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/superadmin")({
  head: () => ({ meta: [{ title: "Super Admin Portal — TaskFlow Pro" }] }),
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: orgs = [], isLoading } = useSuperAdminOrgs();
  const { data: plans = [] } = useSuperAdminPlans();
  const onboardOrg = useOnboardOrg();
  const updatePlan = useUpdateOrgPlan();

  const [form, setForm] = useState({
    orgName: "",
    pricingTier: "FREE",
    adminName: "",
    adminEmail: "",
    adminPassword: ""
  });

  const [openForm, setOpenForm] = useState(false);

  // Enforce Super Admin role
  if (!user || user.roleName !== "SUPER_ADMIN") {
    return (
      <>
        <Topbar title="Access Denied" />
        <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <ShieldCheck className="h-16 w-16 text-destructive mb-4 animate-bounce" />
          <h2 className="text-xl font-bold tracking-tight">Super Admin Privileges Required</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            This workspace area is restricted to system administrators. Please contact support if you believe this is an error.
          </p>
          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-4 bg-gradient-primary">
            Return to Dashboard
          </Button>
        </main>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orgName.trim() || !form.adminName.trim() || !form.adminEmail.trim() || !form.adminPassword.trim()) {
      return toast.error("Please fill in all fields.");
    }
    try {
      await onboardOrg.mutateAsync(form);
      toast.success("Organization onboarded successfully!");
      setOpenForm(false);
      setForm({
        orgName: "",
        pricingTier: "FREE",
        adminName: "",
        adminEmail: "",
        adminPassword: ""
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to onboard organization.");
    }
  };

  const handlePlanChange = async (orgId: string, newTier: string) => {
    try {
      await updatePlan.mutateAsync({ orgId, tier: newTier });
      toast.success("Organization plan updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    }
  };

  const totalMembers = orgs.reduce((sum, o) => sum + (o.memberCount || 0), 0);
  const totalProjects = orgs.reduce((sum, o) => sum + (o.projectCount || 0), 0);
  const totalIssues = orgs.reduce((sum, o) => sum + (o.issueCount || 0), 0);
  const totalRevenue = orgs.reduce((sum, o) => sum + (o.revenue || 0), 0);

  return (
    <>
      <Topbar title="Super Admin Portal" />
      <main className="flex-1 space-y-6 p-6 scrollbar-thin">
        {/* High Level Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-background hover:shadow-glow transition-all">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Organizations</p>
              <h3 className="text-2xl font-bold font-mono mt-1">{orgs.length}</h3>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-background hover:shadow-glow transition-all">
            <div className="p-3 rounded-lg bg-info/10 text-info">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Members</p>
              <h3 className="text-2xl font-bold font-mono mt-1">{totalMembers}</h3>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-background hover:shadow-glow transition-all">
            <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">MRR Revenue</p>
              <h3 className="text-2xl font-bold font-mono mt-1">${totalRevenue.toFixed(2)}</h3>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-background hover:shadow-glow transition-all">
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Projects</p>
              <h3 className="text-2xl font-bold font-mono mt-1">{totalProjects}</h3>
            </div>
          </Card>
        </div>

        {/* Dashboard Panels */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Orgs Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Active Organizations</h2>
              <Button onClick={() => setOpenForm(!openForm)} size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-1" /> Onboard Org
              </Button>
            </div>

            {isLoading ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">Loading organizations...</Card>
            ) : orgs.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">No organizations registered yet.</Card>
            ) : (
              <Card className="p-4 border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Current Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Change Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.map((org: any) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-mono text-[9px] uppercase ${
                            org.pricingTier === "ENTERPRISE" ? "border-primary text-primary" :
                            org.pricingTier === "PRO" ? "border-info text-info" : "border-muted text-muted-foreground"
                          }`}>
                            {org.pricingTier}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.memberCount}</TableCell>
                        <TableCell>{org.projectCount}</TableCell>
                        <TableCell className="text-green-500 font-medium">${org.revenue?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>
                          <Select 
                            value={org.pricingTier} 
                            onValueChange={(v) => handlePlanChange(org.id, v)}
                            disabled={updatePlan.isPending}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((p: any) => (
                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          {/* Right Panel: Onboard Form & Pricing insights */}
          <div className="space-y-6">
            {openForm && (
              <Card className="p-6 bg-gradient-to-br from-card to-background border-primary/20 shadow-glow animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold">New Organization</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="orgName">Organization Name *</Label>
                    <Input
                      id="orgName"
                      value={form.orgName}
                      onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                      placeholder="E.g. Acme Corp"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pricingTier">Pricing Plan *</Label>
                    <Select
                      value={form.pricingTier}
                      onValueChange={(v) => setForm({ ...form, pricingTier: v })}
                    >
                      <SelectTrigger id="pricingTier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p: any) => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <Label htmlFor="adminName">Admin User Name *</Label>
                    <Input
                      id="adminName"
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      placeholder="E.g. Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adminEmail">Admin User Email *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      placeholder="E.g. admin@acme.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adminPassword">Initial Password *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOpenForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="bg-gradient-primary text-primary-foreground">
                      Onboard Organization
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* System Insights */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Load Insights</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Computed metrics for system-wide health and team throughput.
              </p>
              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Org Completion Rate</span>
                    <span className="font-mono font-semibold">
                      {(orgs.length > 0
                        ? orgs.reduce((sum, o) => sum + (o.insights?.averageCompletionRate || 0), 0) / orgs.length
                        : 0
                      ).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{
                        width: `${
                          orgs.length > 0
                            ? orgs.reduce((sum, o) => sum + (o.insights?.averageCompletionRate || 0), 0) / orgs.length
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mean Members per Org</span>
                    <span className="font-mono font-semibold">
                      {(orgs.length > 0 ? totalMembers / orgs.length : 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
