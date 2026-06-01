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
import { useStatuses, useCreateStatus, useUpdateStatus, useDeleteStatus } from "@/lib/queries";
import { StatusDot } from "@/components/tfp/badges";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL, USE_MOCK } from "@/lib/api";
import { AlertTriangle, Paintbrush, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();

  // Status configuration states
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"PLANNING" | "ACTIVE" | "BLOCKED" | "COMPLETED">("PLANNING");
  const [color, setColor] = useState("#3b82f6");
  const [sortOrder, setSortOrder] = useState(10);
  const [wipLimit, setWipLimit] = useState("");
  const [requiresComment, setRequiresComment] = useState(false);

  const resetStatusForm = () => {
    setName("");
    setCategory("PLANNING");
    setColor("#3b82f6");
    setSortOrder(10);
    setWipLimit("");
    setRequiresComment(false);
    setIsCreating(false);
    setIsEditing(null);
  };

  const handleCreateStatus = async () => {
    if (!name.trim()) return toast.error("Status name is required");
    try {
      await createStatus.mutateAsync({
        projectId: "default",
        status: {
          name: name.trim(),
          category,
          color,
          sortOrder,
          wipLimit: wipLimit ? Number(wipLimit) : undefined,
          requiresComment,
        }
      });
      toast.success("Workflow status created");
      resetStatusForm();
    } catch {
      toast.error("Failed to create status");
    }
  };

  const handleStartEdit = (s: any) => {
    setIsEditing(s.id);
    setName(s.name);
    setCategory(s.category);
    setColor(s.color);
    setSortOrder(s.sortOrder);
    setWipLimit(s.wipLimit?.toString() || "");
    setRequiresComment(!!s.requiresComment);
  };

  const handleUpdateStatus = async (statusId: string) => {
    if (!name.trim()) return toast.error("Status name is required");
    try {
      await updateStatus.mutateAsync({
        statusId,
        projectId: "default",
        patch: {
          name: name.trim(),
          category,
          color,
          sortOrder,
          wipLimit: wipLimit ? Number(wipLimit) : undefined,
          requiresComment,
        }
      });
      toast.success("Workflow status updated");
      resetStatusForm();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (confirm("Are you sure you want to delete this status?")) {
      try {
        await deleteStatus.mutateAsync({ statusId, projectId: "default" });
        toast.success("Workflow status deleted");
      } catch {
        toast.error("Failed to delete status");
      }
    }
  };

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
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-semibold">Custom Workflow Statuses</h3>
                  <p className="text-xs text-muted-foreground">Configure the lanes for your Kanban Boards and automations.</p>
                </div>
                {!isCreating && !isEditing && (
                  <Button size="sm" onClick={() => setIsCreating(true)} className="bg-gradient-primary text-primary-foreground rounded-xl gap-1.5">
                    <Plus className="h-4 w-4" /> Add Status
                  </Button>
                )}
              </div>

              {/* Create/Edit Form Container */}
              {(isCreating || isEditing) && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4 max-w-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {isCreating ? "Create Workflow Status" : "Edit Workflow Status"}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status Name</Label>
                      <Input placeholder="e.g. In Review" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Category</Label>
                      <Select value={category} onValueChange={(val) => setCategory(val as any)}>
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLANNING">Planning (Backlog/To Do)</SelectItem>
                          <SelectItem value="ACTIVE">Active (In Progress/In Review)</SelectItem>
                          <SelectItem value="BLOCKED">Blocked (On Hold)</SelectItem>
                          <SelectItem value="COMPLETED">Completed (Done)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Status Color</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 p-0.5 rounded-lg border bg-transparent" />
                        <Input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 text-xs flex-1 rounded-lg font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sort Order</Label>
                      <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="h-8 text-xs rounded-lg text-center" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">WIP Limit (optional)</Label>
                      <Input type="number" placeholder="No limit" value={wipLimit} onChange={(e) => setWipLimit(e.target.value)} className="h-8 text-xs rounded-lg text-center" />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch id="req-comm" checked={requiresComment} onCheckedChange={setRequiresComment} />
                      <Label htmlFor="req-comm" className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">Requires Comment</Label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => isCreating ? handleCreateStatus() : handleUpdateStatus(isEditing!)} className="bg-gradient-primary text-primary-foreground font-semibold px-4 rounded-lg gap-1">
                      <Save className="h-3.5 w-3.5" /> {isCreating ? "Create Status" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetStatusForm} className="rounded-lg gap-1">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {statuses.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 hover:border-primary/20 transition-all"
                  >
                    <StatusDot color={s.color} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Sort Order: {s.sortOrder} · Category: {s.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] rounded-lg">
                        {s.category}
                      </Badge>
                      {s.wipLimit && (
                        <Badge variant="outline" className="text-[10px] rounded-lg">
                          WIP {s.wipLimit}
                        </Badge>
                      )}
                      {s.requiresComment && (
                        <Badge
                          variant="outline"
                          className="border-warning/40 text-warning bg-warning/5 text-[10px] rounded-lg"
                        >
                          Comment req
                        </Badge>
                      )}
                      
                      <div className="pl-2 border-l border-border flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-muted text-muted-foreground rounded-lg" onClick={() => handleStartEdit(s)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {!s.isDefault && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg" onClick={() => handleDeleteStatus(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
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
