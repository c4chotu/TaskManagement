import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProject, useProjects } from "@/lib/queries";
import { Plus, Calendar, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/projects")({
  head: () => ({ meta: [{ title: "Projects — TaskFlow Pro" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: projects = [] } = useProjects();
  return (
    <>
      <Topbar title="Projects" actions={<CreateProjectDialog />} />
      <main className="flex-1 space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="group flex flex-col gap-4 p-5 transition hover:border-primary/40 hover:shadow-glow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2 font-mono text-[10px]">{p.type}</Badge>
                  <h3 className="truncate text-base font-semibold">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                </div>
                <StatusPill status={p.status} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono">{p.progress ?? 0}%</span>
                </div>
                <Progress value={p.progress ?? 0} className="h-1.5" />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(p.startDate), "MMM d")} → {format(new Date(p.endDate), "MMM d, yy")}</span>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  <Link to="/projects/$id" params={{ id: p.id }}>Open <ArrowRight className="h-3 w-3" /></Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "ACTIVE" ? "bg-primary/15 text-primary border-primary/30"
    : status === "IN_REVIEW" ? "bg-warning/15 text-warning border-warning/30"
    : "bg-muted text-muted-foreground border-border";
  return <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase ${tone}`}>{status.replace("_", " ")}</span>;
}

function CreateProjectDialog() {
  const create = useCreateProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "KANBAN" as const });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1 h-3.5 w-3.5" /> New project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>Set up a new workspace for tasks, sprints, and incidents.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "KANBAN" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KANBAN">Kanban</SelectItem>
                <SelectItem value="SCRUM">Scrum</SelectItem>
                <SelectItem value="WATERFALL">Waterfall</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={async () => {
            if (!form.name) return toast.error("Name required");
            await create.mutateAsync(form);
            toast.success("Project created");
            setOpen(false);
            setForm({ name: "", description: "", type: "KANBAN" });
          }} className="bg-gradient-primary text-primary-foreground">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
