import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { useStatuses } from "@/lib/queries";
import { StatusDot } from "@/components/tfp/badges";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL, USE_MOCK } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — TaskFlow Pro" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data: statuses = [] } = useStatuses();
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 space-y-4 p-6">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="statuses">Workflow Statuses</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <Card className="max-w-xl p-6">
              <h3 className="mb-4 text-sm font-semibold">Profile</h3>
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Name</Label><Input defaultValue={user?.name ?? ""} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input defaultValue={user?.email ?? ""} disabled /></div>
                <div className="space-y-1.5"><Label>Bio</Label><Textarea placeholder="DevOps Architect" /></div>
                <Button className="bg-gradient-primary text-primary-foreground">Save changes</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="statuses" className="mt-4">
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-semibold">Custom workflow statuses</h3>
              <div className="space-y-2">
                {statuses.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <StatusDot color={s.color} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">Sort {s.sortOrder} · {s.category}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                    {s.wipLimit && <Badge variant="outline" className="text-[10px]">WIP {s.wipLimit}</Badge>}
                    {s.requiresComment && <Badge variant="outline" className="border-warning/40 text-warning text-[10px]">Comment req</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card className="max-w-xl p-6 space-y-4">
              {[
                ["Mentions", "When someone @mentions you"],
                ["Incident pages", "SEV0/SEV1 incidents assigned to you"],
                ["SLA breach warnings", "5 minutes before SLA breach"],
                ["Daily digest", "Summary of activity at 8 AM"],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div><p className="text-sm font-medium">{k}</p><p className="text-xs text-muted-foreground">{d}</p></div>
                  <Switch defaultChecked />
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-4">
            <Card className="max-w-2xl p-6">
              <h3 className="mb-4 text-sm font-semibold">REST API connection</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Base URL (read-only)</Label>
                  <Input readOnly value={API_BASE_URL || "(not set — using template data)"} className="font-mono text-xs" />
                  <p className="text-[10px] text-muted-foreground">Configure <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> in your environment. All requests target <code className="rounded bg-muted px-1">{`{base}/api/v1/*`}</code>.</p>
                </div>
                {USE_MOCK && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                    <div className="text-xs">
                      <p className="font-medium text-warning">Template mode active</p>
                      <p className="mt-0.5 text-muted-foreground">No API URL configured. The UI is fully wired but reads from in-memory fixtures so you can preview every workflow.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
