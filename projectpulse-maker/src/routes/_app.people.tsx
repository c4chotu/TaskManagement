import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/tfp/topbar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDepartments, useTeams, useUsers } from "@/lib/queries";
import { RoleBadge } from "@/components/tfp/badges";
import { RolePromoteDialog } from "@/components/tfp/role-promote-dialog";
import { Building2, Users as UsersIcon } from "lucide-react";

export const Route = createFileRoute("/_app/people")({
  head: () => ({ meta: [{ title: "People — TaskFlow Pro" }] }),
  component: PeoplePage,
});

function PeoplePage() {
  const { data: users = [] } = useUsers();
  const { data: depts = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  return (
    <>
      <Topbar title="People & Org" />
      <main className="flex-1 space-y-6 p-6">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4" /> Departments
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {depts.map((d) => {
              const head = users.find((u) => u.id === d.headUserId);
              const deptTeams = teams.filter((t) => t.departmentId === d.id);
              return (
                <Card key={d.id} className="p-5">
                  <h3 className="text-base font-semibold">{d.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <Avatar className="h-7 w-7 border border-border">
                      <AvatarFallback className="bg-muted text-[10px]">
                        {head?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs">Head: {head?.name}</p>
                      <RoleBadge role={head?.roleName} level={head?.roleLevel} />
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] font-mono uppercase text-muted-foreground">
                    {deptTeams.length} teams · {deptTeams.map((t) => t.name).join(" · ")}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UsersIcon className="h-4 w-4" /> Roster
          </h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Person</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Bio</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border border-border">
                          <AvatarFallback className="bg-muted text-[10px]">
                            {u.name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.roleName} level={u.roleLevel} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{u.bio ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <RolePromoteDialog user={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      </main>
    </>
  );
}
