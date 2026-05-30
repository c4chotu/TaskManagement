import { useSuperAdminOrganizations, useSuperAdminStats } from "@/lib/queries";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Building2, DollarSign, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

export function SuperAdminDashboard() {
  const { data: stats } = useSuperAdminStats();
  const { data: organizations = [] } = useSuperAdminOrganizations();

  return (
    <>
      <Topbar title="Super Admin Dashboard" />
      <main className="flex-1 space-y-6 p-6">
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
            <p className="text-sm text-muted-foreground">Manage organizations, plans, and monitor system health.</p>
          </div>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Link to="/onboarding">
              <Plus className="mr-2 h-4 w-4" />
              Onboard Organization
            </Link>
          </Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="flex items-start gap-4 p-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Organizations</p>
              <p className="text-3xl font-bold">{stats?.totalOrganizations ?? 0}</p>
            </div>
          </Card>
          <Card className="flex items-start gap-4 p-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-info/10 text-info">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold">{stats?.totalUsers ?? 0}</p>
            </div>
          </Card>
          <Card className="flex items-start gap-4 p-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-success/10 text-success">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estimated MRR</p>
              <p className="text-3xl font-bold">${stats?.estimatedMrr ?? 0}</p>
            </div>
          </Card>
        </section>

        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/20 p-4">
            <h2 className="font-semibold">Registered Organizations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Plan Tier</th>
                  <th className="px-4 py-3 font-medium">Users</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((org: any) => (
                  <tr key={org.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{org.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-primary/5">
                        {org.pricingTier || "FREE"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{org.memberCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={org.status === "SUSPENDED" ? "destructive" : "outline"} className={org.status === "SUSPENDED" ? "" : "bg-success/10 text-success border-success/20"}>
                        {org.status || "ACTIVE"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/superadmin/organizations/$id" params={{ id: org.id }}>View details</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {organizations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
