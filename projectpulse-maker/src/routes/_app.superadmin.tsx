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
  DollarSign,
  Globe,
  Zap,
  CheckCircle2,
  BarChart3,
  Shield,
  Cpu,
  Server,
  ArrowUpRight,
  CircleCheck,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/superadmin")({
  head: () => ({ meta: [{ title: "Super Admin Portal — TaskFlow Pro" }] }),
  component: SuperAdminPage,
});

const PLAN_COLORS: Record<string, string> = {
  ENTERPRISE: "border-amber-500/50 text-amber-600 bg-amber-500/10",
  PRO: "border-blue-500/50 text-blue-600 bg-blue-500/10",
  FREE: "border-border text-muted-foreground",
};

const mockSystemMetrics = {
  uptime: 99.97,
  apiLatency: 42,
  activeUsers: 847,
  requestsPerMin: 12430,
  storageUsedGB: 284,
  storageTotalGB: 500,
  eventsToday: 31200,
  automationsRan: 1840,
};

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
      setForm({ orgName: "", pricingTier: "FREE", adminName: "", adminEmail: "", adminPassword: "" });
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
  const enterpriseOrgs = orgs.filter((o: any) => o.pricingTier === "ENTERPRISE").length;
  const proOrgs = orgs.filter((o: any) => o.pricingTier === "PRO").length;
  const avgCompletionRate = orgs.length > 0
    ? orgs.reduce((sum, o) => sum + (o.insights?.averageCompletionRate || 0), 0) / orgs.length
    : 0;

  return (
    <>
      <Topbar title="Super Admin Portal" />
      <main className="flex-1 space-y-6 p-6 relative overflow-hidden">
        {/* Background watermark */}
        <div className="absolute top-20 right-8 pointer-events-none select-none z-0">
          <Shield className="h-[380px] w-[380px] text-primary/3 -rotate-12 stroke-[0.5]" />
        </div>

        {/* Hero Banner */}
        <div className="relative z-10 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-tr from-amber-600/10 via-orange-600/5 to-transparent p-6 shadow-md backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Shield className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Super Admin Control Center</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Platform-wide oversight: organizations, billing, system health, and security.
            </p>
            <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground pt-1.5 font-medium">
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> System: {mockSystemMetrics.uptime}% uptime</span>
              <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-blue-500" /> {orgs.length} organizations</span>
              <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-violet-500" /> {mockSystemMetrics.activeUsers.toLocaleString()} active users</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button onClick={() => setOpenForm(!openForm)} size="sm" className="bg-gradient-primary font-semibold text-xs rounded-xl gap-1">
              <Plus className="h-3.5 w-3.5" /> Onboard Organization
            </Button>
          </div>
        </div>

        {/* High Level KPI Stats */}
        <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Organizations", value: orgs.length, sub: `${enterpriseOrgs} enterprise · ${proOrgs} pro`, icon: Building2, color: "text-amber-600 bg-amber-500/10" },
            { label: "Total Members", value: totalMembers.toLocaleString(), sub: `Across ${orgs.length} orgs`, icon: Users, color: "text-blue-600 bg-blue-500/10" },
            { label: "MRR Revenue", value: `$${totalRevenue.toFixed(0)}`, sub: "Monthly recurring", icon: DollarSign, color: "text-emerald-600 bg-emerald-500/10" },
            { label: "Total Projects", value: totalProjects.toLocaleString(), sub: `${totalIssues} open issues`, icon: FolderKanban, color: "text-violet-600 bg-violet-500/10" },
          ].map((stat) => (
            <Card key={stat.label} className="glass-card-green p-5 shadow-primary-sm hover:shadow-primary-md transition-all">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-0.5 font-mono">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </div>
            </Card>
          ))}
        </div>

        {/* System Health Metrics */}
        <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "API Latency", value: `${mockSystemMetrics.apiLatency}ms`, icon: Zap, color: "text-yellow-600 bg-yellow-500/10", good: true },
            { label: "Requests/min", value: mockSystemMetrics.requestsPerMin.toLocaleString(), icon: Activity, color: "text-blue-600 bg-blue-500/10", good: true },
            { label: "Events Today", value: mockSystemMetrics.eventsToday.toLocaleString(), icon: BarChart3, color: "text-purple-600 bg-purple-500/10", good: true },
            { label: "Automations Ran", value: mockSystemMetrics.automationsRan.toLocaleString(), icon: Cpu, color: "text-emerald-600 bg-emerald-500/10", good: true },
          ].map((m) => (
            <Card key={m.label} className="glass-card-green p-4 shadow-primary-sm">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${m.color}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-bold font-mono">{m.value}</p>
                </div>
                {m.good && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />}
              </div>
            </Card>
          ))}
        </div>

        {/* Main content grid */}
        <div className="relative z-10 grid gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN: Orgs Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Active Organizations
              </h2>
            </div>

            {isLoading ? (
              <Card className="glass-card-green p-8 text-center text-sm text-muted-foreground">Loading organizations...</Card>
            ) : orgs.length === 0 ? (
              <Card className="glass-card-green p-8 text-center text-sm text-muted-foreground">No organizations registered yet.</Card>
            ) : (
              <Card className="glass-card-green overflow-hidden shadow-primary-sm">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase tracking-wider">Organization</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Plan</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Users</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Projects</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">MRR</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider">Change Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.map((org: any) => (
                      <TableRow key={org.id} className="hover:bg-emerald-500/5 transition-colors">
                        <TableCell className="font-medium text-sm">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-mono text-[9px] uppercase ${PLAN_COLORS[org.pricingTier] ?? PLAN_COLORS.FREE}`}>
                            {org.pricingTier}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{org.memberCount ?? 0}</TableCell>
                        <TableCell className="font-mono text-xs">{org.projectCount ?? 0}</TableCell>
                        <TableCell className="text-emerald-600 font-medium text-xs">${org.revenue?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>
                          <Select
                            value={org.pricingTier}
                            onValueChange={(v) => handlePlanChange(org.id, v)}
                            disabled={updatePlan.isPending}
                          >
                            <SelectTrigger className="w-[130px] h-7 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((p: any) => (
                                <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}</SelectItem>
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

            {/* Storage & Performance */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass-card-green p-4 shadow-primary-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Storage</h3>
                </div>
                <p className="text-xl font-bold font-mono">{mockSystemMetrics.storageUsedGB} <span className="text-sm font-normal text-muted-foreground">/ {mockSystemMetrics.storageTotalGB} GB</span></p>
                <Progress value={(mockSystemMetrics.storageUsedGB / mockSystemMetrics.storageTotalGB) * 100} className="mt-2 h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">{Math.round((mockSystemMetrics.storageUsedGB / mockSystemMetrics.storageTotalGB) * 100)}% used</p>
              </Card>
              <Card className="glass-card-green p-4 shadow-primary-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Health</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Uptime", value: mockSystemMetrics.uptime, color: "bg-emerald-500" },
                    { label: "Avg Completion", value: Math.round(avgCompletionRate), color: "bg-blue-500" },
                  ].map(metric => (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className="font-mono font-semibold">{metric.value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`${metric.color} h-full rounded-full`} style={{ width: `${metric.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN: Onboard Form & Insights */}
          <div className="space-y-4">
            {/* Onboard form */}
            {openForm && (
              <Card className="glass-card-green p-5 shadow-[0_0_24px_rgba(245,158,11,0.12)] border-amber-500/20 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-amber-600" />
                  <h2 className="text-sm font-semibold">Onboard New Organization</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="orgName" className="text-xs">Organization Name *</Label>
                    <Input id="orgName" className="h-8 text-xs" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pricingTier" className="text-xs">Pricing Plan *</Label>
                    <Select value={form.pricingTier} onValueChange={(v) => setForm({ ...form, pricingTier: v })}>
                      <SelectTrigger id="pricingTier" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {plans.map((p: any) => <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">Admin Account</p>
                    <div className="space-y-2">
                      <Input className="h-8 text-xs" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Admin Name *" />
                      <Input className="h-8 text-xs" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="Admin Email *" />
                      <Input className="h-8 text-xs" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Initial Password *" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => setOpenForm(false)}>Cancel</Button>
                    <Button type="submit" size="sm" className="bg-gradient-primary text-xs h-7">Onboard Organization</Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Plan Distribution */}
            <Card className="glass-card-green p-5 shadow-primary-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Plan Distribution</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Enterprise", count: enterpriseOrgs, color: "bg-amber-500", textColor: "text-amber-600" },
                  { label: "Pro", count: proOrgs, color: "bg-blue-500", textColor: "text-blue-600" },
                  { label: "Free", count: orgs.length - enterpriseOrgs - proOrgs, color: "bg-muted-foreground/40", textColor: "text-muted-foreground" },
                ].map(tier => (
                  <div key={tier.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`font-medium ${tier.textColor}`}>{tier.label}</span>
                      <span className="font-mono text-muted-foreground">{tier.count} orgs</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tier.color} transition-all`}
                        style={{ width: orgs.length > 0 ? `${(tier.count / orgs.length) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* System Insights */}
            <Card className="glass-card-green p-5 shadow-primary-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">System Insights</h3>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { label: "Avg Completion Rate", value: `${avgCompletionRate.toFixed(1)}%`, icon: CheckCircle2, color: "text-emerald-600" },
                  { label: "Mean Members / Org", value: (orgs.length > 0 ? totalMembers / orgs.length : 0).toFixed(1), icon: Users, color: "text-blue-600" },
                  { label: "Projects / Org", value: (orgs.length > 0 ? totalProjects / orgs.length : 0).toFixed(1), icon: FolderKanban, color: "text-violet-600" },
                  { label: "Active Incidents", value: totalIssues.toString(), icon: AlertTriangle, color: "text-red-600" },
                ].map(insight => (
                  <div key={insight.label} className="flex items-center gap-2.5 py-1.5 border-b border-border/30 last:border-0">
                    <insight.icon className={`h-3.5 w-3.5 ${insight.color} shrink-0`} />
                    <span className="text-muted-foreground flex-1">{insight.label}</span>
                    <span className="font-mono font-semibold">{insight.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
