import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { useIssues, useProjects, useTasks } from "@/lib/queries";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — TaskFlow Pro" }] }),
  component: ReportsPage,
});

const PALETTE = ["oklch(0.72 0.17 155)", "oklch(0.68 0.14 230)", "oklch(0.78 0.16 75)", "oklch(0.62 0.22 25)", "oklch(0.60 0.12 200)"];

function ReportsPage() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: issues = [] } = useIssues();

  const sevDist = (["SEV0", "SEV1", "SEV2", "SEV3"] as const).map((s) => ({ name: s, value: issues.filter((i) => i.severity === s).length }));
  const projData = projects.map((p) => {
    const pt = tasks.filter((t) => t.projectId === p.id);
    const done = pt.filter((t) => t.statusId === "s-done").length;
    return { name: p.name.split(" ")[0], total: pt.length, done };
  });

  return (
    <>
      <Topbar title="Reports & Analytics" />
      <main className="flex-1 space-y-4 p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Incidents by severity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sevDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {sevDist.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.20 0.02 160)", border: "1px solid oklch(0.28 0.02 160)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Project completion</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={projData}>
                <CartesianGrid stroke="oklch(0.28 0.02 160)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.68 0.03 155)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.03 155)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.02 160)", border: "1px solid oklch(0.28 0.02 160)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" fill="oklch(0.30 0.06 160)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" fill="oklch(0.72 0.17 155)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Completion by project</h3>
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between text-sm"><span>{p.name}</span><span className="font-mono text-xs text-muted-foreground">{p.progress ?? 0}%</span></div>
                <Progress value={p.progress ?? 0} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
