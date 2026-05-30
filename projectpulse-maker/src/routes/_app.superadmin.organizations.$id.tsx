import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { useSuperAdminOrganizationDetails, useUpdateOrganization } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, Users, FolderKanban, Settings2, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/superadmin/organizations/$id")({
  head: () => ({ meta: [{ title: "Organization Details — TaskFlow Pro" }] }),
  component: OrganizationDetailsPage,
});

function OrganizationDetailsPage() {
  const { id } = Route.useParams();
  const { data: details, isLoading } = useSuperAdminOrganizationDetails(id);
  const updateOrg = useUpdateOrganization();
  const router = useRouter();

  const [formData, setFormData] = useState({ name: "", pricingTier: "", status: "" });

  useEffect(() => {
    if (details?.organization) {
      setFormData({
        name: details.organization.name,
        pricingTier: details.organization.pricingTier,
        status: details.organization.status || "ACTIVE",
      });
    }
  }, [details]);

  if (isLoading) return <div className="p-8 text-center">Loading organization details...</div>;
  if (!details?.organization) return <div className="p-8 text-center">Organization not found.</div>;

  const { organization: org, users, projects, stats } = details;

  const handleUpdate = () => {
    updateOrg.mutate(
      { orgId: org.id, ...formData },
      {
        onSuccess: () => toast.success("Organization updated successfully"),
        onError: () => toast.error("Failed to update organization"),
      }
    );
  };

  return (
    <>
      <Topbar title="Organization Details" />
      <main className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
                <Badge variant={org.status === "SUSPENDED" ? "destructive" : "default"} className={org.status === "SUSPENDED" ? "" : "bg-success/10 text-success border-success/20"}>
                  {org.status || "ACTIVE"}
                </Badge>
                <Badge variant="outline" className="bg-primary/5">{org.pricingTier}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">ID: {org.id}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="overview"><Activity className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="projects"><FolderKanban className="mr-2 h-4 w-4" /> Projects</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="mr-2 h-4 w-4" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{users?.length || 0}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{projects?.length || 0}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{stats?.taskCount || 0}</p></CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>All user accounts belonging to this tenant.</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users?.map((u: any) => (
                      <tr key={u.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3"><Badge variant="secondary">{u.role}</Badge></td>
                      </tr>
                    ))}
                    {users?.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No users found.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Workspaces and repositories for this tenant.</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Project Name</th>
                      <th className="px-4 py-3 font-medium">Key</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projects?.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{p.key}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{p.type}</Badge></td>
                      </tr>
                    ))}
                    {projects?.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No projects found.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Update tenant name, plan tier, and account status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Name</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan Tier</label>
                  <Select value={formData.pricingTier} onValueChange={(v) => setFormData({ ...formData, pricingTier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">Free</SelectItem>
                      <SelectItem value="PRO">Pro</SelectItem>
                      <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Status</label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended (Block Login)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button onClick={handleUpdate} disabled={updateOrg.isPending} className="bg-gradient-primary text-primary-foreground">
                    {updateOrg.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
