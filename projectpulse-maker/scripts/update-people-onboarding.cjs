const fs = require('fs');

let content = fs.readFileSync('src/routes/_app.people-onboarding.tsx', 'utf8');

// 1. Add missing imports
content = content.replace(
  /import \{ toast \} from "sonner";/,
  `import { toast } from "sonner";\nimport { useAuth } from "@/lib/auth";\nimport { useDepartments, useTeams, useProjects, useOnboardUser, useAddProjectMember } from "@/lib/queries";\nimport { Topbar } from "@/components/tfp/topbar";\nimport { useNavigate } from "@tanstack/react-router";`
);

// 2. Add auth and query hooks to OnboardPage
content = content.replace(
  /const \[step, setStep\] = useState\(0\);/,
  `const { user } = useAuth();
  const navigate = useNavigate();
  const { data: departments = [] } = useDepartments();
  const { data: teams = [] } = useTeams();
  const { data: projects = [] } = useProjects();
  const onboardUser = useOnboardUser();
  const addProjectMember = useAddProjectMember();

  const isAuthorized = user && ((user.roleLevel ?? 0) >= 4 || user.roleName === "SUPER_ADMIN");

  const [step, setStep] = useState(0);`
);

// 3. Update the submit function to actually call the backend
content = content.replace(
  /const submit = \(\) => \{ setDone\(true\); toast.success\("Invite sent!"\); \};/,
  `const submit = async () => {
    if (!data.name.trim() || !data.email.trim()) {
      toast.error("Please provide a name and email.");
      return;
    }
    
    // map role
    let roleName = "TEAM_MEMBER";
    if (data.role === "viewer") roleName = "GUEST";
    else if (data.role === "lead") roleName = "TEAM_LEAD";
    else if (data.role === "admin") roleName = "ORG_ADMIN";

    try {
      const newUser = await onboardUser.mutateAsync({
        name: data.name,
        email: data.email,
        password: "password123", // Default temp password
        roleName: roleName,
        departmentId: data.department || undefined,
        teamId: data.team || undefined,
      });

      // Add to projects
      if (newUser && newUser.id && data.projects.length > 0) {
        for (const projId of data.projects) {
          try {
            await addProjectMember.mutateAsync({
              projectId: projId,
              userId: newUser.id,
              role: roleName === "ORG_ADMIN" ? "ADMIN" : "MEMBER"
            });
          } catch (e) {
            console.error("Failed to add to project", projId, e);
          }
        }
      }

      setDone(true);
      toast.success("Invite sent!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to onboard user");
    }
  };

  if (!isAuthorized) {
    return (
      <>
        <Topbar title="Access Denied" />
        <main className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <Shield className="mb-4 h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-semibold">Team Onboarding Restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">Only administrators can invite new members to the workspace.</p>
          <Button className="mt-6 bg-gradient-primary text-primary-foreground" onClick={() => navigate({ to: "/people" })}>Back to People</Button>
        </main>
      </>
    );
  }`
);

// 4. Update the layout: change <div className="min-h-full bg-mesh"> to <Topbar ...> <main ...>
content = content.replace(
  /return \(\s*<div className="min-h-full bg-mesh">\s*<div className="max-w-7xl mx-auto p-6">/,
  `return (
    <>
      <Topbar title="Onboard Member" />
      <main className="flex-1 space-y-6 p-6 max-w-7xl mx-auto relative overflow-hidden">`
);

// Specifically target the very end of the file for the closing tags.
// The file originally ended with:
//         </div>
//       </div>
//     </div>
//   );
// }
// 
// function FormField...
content = content.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/,
  `      </div>\n      </main>\n    </>\n  );\n}`
);


// 5. Update Department Options
content = content.replace(
  /<SelectContent><SelectItem value="eng">Engineering<\/SelectItem><SelectItem value="design">Design<\/SelectItem><SelectItem value="ops">Operations<\/SelectItem><SelectItem value="pm">Product<\/SelectItem><\/SelectContent>/,
  `<SelectContent>
                        <SelectItem value="_none">No department</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>`
);

// 6. Update Team Options (filter by department)
content = content.replace(
  /<SelectContent><SelectItem value="fe">Frontend<\/SelectItem><SelectItem value="be">Backend<\/SelectItem><SelectItem value="data">Data<\/SelectItem><SelectItem value="sre">SRE<\/SelectItem><\/SelectContent>/,
  `<SelectContent>
                      <SelectItem value="_none">No team</SelectItem>
                      {teams.filter(t => !data.department || data.department === "_none" || t.departmentId === data.department).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>`
);

// 7. Update Project Options (use real projects)
content = content.replace(
  /\{(?:"|')\["Phoenix", "Atlas", "Helios", "Nimbus", "Voyager", "Orion"\](?:"|')\.map\(p => \{/,
  `{projects.map(p => {`
);
content = content.replace(
  /const on = data.projects.includes\(p\);/,
  `const on = data.projects.includes(p.id);`
);
content = content.replace(
  /key=\{p\}/,
  `key={p.id}`
);
content = content.replace(
  /onClick=\{\(\) => toggleProject\(p\)\}/g,
  `onClick={() => toggleProject(p.id)}`
);
content = content.replace(
  /<span className="text-sm font-semibold">\{p\}<\/span>/,
  `<span className="text-sm font-semibold">{p.name}</span>`
);

// 8. Update Review & Invite strings for Departments and Teams
content = content.replace(
  /<Row k="Team" v=\{data.team \|\| "—"\} \/>/,
  `<Row k="Department" v={departments.find(d => d.id === data.department)?.name || "—"} />
                  <Row k="Team" v={teams.find(t => t.id === data.team)?.name || "—"} />`
);
content = content.replace(
  /<Row k="Projects" v=\{data.projects.join\(\", \"\) \|\| "none"\} \/>/,
  `<Row k="Projects" v={data.projects.map(pid => projects.find(p => p.id === pid)?.name).filter(Boolean).join(", ") || "none"} />`
);

// 9. Update Live preview strings
content = content.replace(
  /\{data.department \|\| "—"\}/,
  `{departments.find(d => d.id === data.department)?.name || "—"}`
);
content = content.replace(
  /<div className="flex flex-wrap gap-1">\{data.projects.map\(p => <Badge key=\{p\} variant="outline" className="text-\[10px\]">\{p\}<\/Badge>\)\}<\/div>/,
  `<div className="flex flex-wrap gap-1">{data.projects.map(pid => <Badge key={pid} variant="outline" className="text-[10px]">{projects.find(p => p.id === pid)?.name}</Badge>)}</div>`
);


// 10. Update 'Done' screen to keep bg-mesh scoped to that modal/screen
content = content.replace(
  /<div className="min-h-full bg-mesh grid place-items-center p-6">/,
  `<div className="flex-1 grid place-items-center p-6">`
);

fs.writeFileSync('src/routes/_app.people-onboarding.tsx', content);
