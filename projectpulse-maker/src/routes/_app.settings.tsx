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
import { AlertTriangle, Paintbrush } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — TaskFlow Pro" }] }),
  component: SettingsPage,
});

const THEMES = [
  {
    id: "default",
    name: "Steel Cyber",
    description: "Default minimalist operations desk with cold teal accents.",
    color: "oklch(0.72 0.17 155)",
  },
  {
    id: "violet",
    name: "Neon Violet",
    description: "Vibrant high-contrast cyberpunk purple command deck.",
    color: "oklch(0.68 0.24 300)",
  },
  {
    id: "amber",
    name: "Solar Amber",
    description: "High-alert solar orange warnings and status accents.",
    color: "oklch(0.76 0.18 60)",
  },
  {
    id: "emerald",
    name: "Emerald Operations",
    description: "Healthy system operations and calm green workspace accents.",
    color: "oklch(0.74 0.16 140)",
  },
];

function SettingsPage() {
  const { user } = useAuth();
  const { data: statuses = [] } = useStatuses();

  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tfp.theme") || "default";
    }
    return "default";
  });

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem("tfp.theme", themeId);
    document.documentElement.className = `dark ${themeId === "default" ? "" : `theme-${themeId}`}`;
    const selectedTheme = THEMES.find((t) => t.id === themeId);
    toast.success(`Theme updated to ${selectedTheme?.name}`);
  };

  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 space-y-4 p-6">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="statuses">Workflow Statuses</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <Card className="max-w-xl p-6">
              <h3 className="mb-4 text-sm font-semibold">Profile</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input defaultValue={user?.name ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input defaultValue={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Bio</Label>
                  <Textarea placeholder="DevOps Architect" />
                </div>
                <Button className="bg-gradient-primary text-primary-foreground">
                  Save changes
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="statuses" className="mt-4">
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-semibold">Custom workflow statuses</h3>
              <div className="space-y-2">
                {statuses.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3"
                  >
                    <StatusDot color={s.color} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Sort {s.sortOrder} · {s.category}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {s.category}
                    </Badge>
                    {s.wipLimit && (
                      <Badge variant="outline" className="text-[10px]">
                        WIP {s.wipLimit}
                      </Badge>
                    )}
                    {s.requiresComment && (
                      <Badge
                        variant="outline"
                        className="border-warning/40 text-warning text-[10px]"
                      >
                        Comment req
                      </Badge>
                    )}
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
                <div
                  key={k}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{k}</p>
                    <p className="text-xs text-muted-foreground">{d}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-4">
            <Card className="max-w-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Paintbrush className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Workspace Theme</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Select a visual theme accent. The primary gradients, interactive glowing shadows,
                and status ring selections will immediately synchronize across your control deck.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {THEMES.map((t) => {
                  const isActive = activeTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`flex flex-col text-left rounded-xl border p-4 transition-all duration-200 hover:bg-muted/40 cursor-pointer ${
                        isActive
                          ? "border-primary shadow-glow ring-1 ring-primary bg-muted/20"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 w-full">
                        <span className="font-semibold text-sm">{t.name}</span>
                        <span
                          className="h-3 w-3 rounded-full border border-black/40 shadow-inner"
                          style={{ backgroundColor: t.color }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed flex-1">
                        {t.description}
                      </p>
                      <div className="w-full bg-background/50 rounded-lg p-2 border border-border/60 flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <div className="h-1 flex-1 rounded bg-muted-foreground/20" />
                        <div className="h-1 w-8 rounded bg-muted-foreground/20" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-4">
            <Card className="max-w-2xl p-6">
              <h3 className="mb-4 text-sm font-semibold">REST API connection</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Base URL (read-only)</Label>
                  <Input
                    readOnly
                    value={API_BASE_URL || "(not set — using template data)"}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Configure <code className="rounded bg-muted px-1">VITE_API_BASE_URL</code> in
                    your environment. All requests target{" "}
                    <code className="rounded bg-muted px-1">{`{base}/api/v1/*`}</code>.
                  </p>
                </div>
                {USE_MOCK && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                    <div className="text-xs">
                      <p className="font-medium text-warning">Template mode active</p>
                      <p className="mt-0.5 text-muted-foreground">
                        No API URL configured. The UI is fully wired but reads from in-memory
                        fixtures so you can preview every workflow.
                      </p>
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
