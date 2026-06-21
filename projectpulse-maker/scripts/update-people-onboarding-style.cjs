const fs = require('fs');

let content = fs.readFileSync('src/routes/_app.people-onboarding.tsx', 'utf8');

// 1. Reactive permissions
// Currently:
// const [data, setData] = useState({
//   ...
//   perms: { tasks_create: true, tasks_assign: false, ... }
// });
// We need an effect that updates perms when data.role changes.
const reactivePermsCode = `
  const [data, setData] = useState({
    name: "", email: "", title: "", department: "_none", role: "contributor",
    team: "_none", projects: [] as string[],
    perms: { tasks_create: true, tasks_assign: false, tasks_delete: false, projects_create: false, time_approve: false, incidents_resolve: false, settings_edit: false, billing_view: false } as Record<string, boolean>,
    sendInvite: true,
  });
  
  // React to role changes
  import { useEffect } from "react";
`;

// wait, I can just do it in the `update` function or `useEffect`. Let's use `useEffect`.
content = content.replace(
  /const \[done, setDone\] = useState\(false\);/,
  `const [done, setDone] = useState(false);

  // Sync permissions based on selected role
  import_placeholder`
);

// We need to put useEffect at top
content = content.replace(
  /import \{ useState \} from "react";/,
  `import { useState, useEffect } from "react";`
);

content = content.replace(
  `import_placeholder`,
  `useEffect(() => {
    let newPerms = { ...data.perms };
    if (data.role === "viewer") {
      newPerms = { tasks_create: false, tasks_assign: false, tasks_delete: false, projects_create: false, time_approve: false, incidents_resolve: false, settings_edit: false, billing_view: false };
    } else if (data.role === "contributor") {
      newPerms = { tasks_create: true, tasks_assign: false, tasks_delete: false, projects_create: false, time_approve: false, incidents_resolve: false, settings_edit: false, billing_view: false };
    } else if (data.role === "lead") {
      newPerms = { tasks_create: true, tasks_assign: true, tasks_delete: true, projects_create: true, time_approve: true, incidents_resolve: true, settings_edit: false, billing_view: false };
    } else if (data.role === "admin") {
      newPerms = { tasks_create: true, tasks_assign: true, tasks_delete: true, projects_create: true, time_approve: true, incidents_resolve: true, settings_edit: true, billing_view: true };
    }
    
    // Only update if perms actually changed to avoid infinite loop
    const changed = Object.keys(newPerms).some(k => newPerms[k] !== data.perms[k]);
    if (changed) {
      setData(d => ({ ...d, perms: newPerms }));
    }
  }, [data.role]);`
);


// 2. Fix the styling - restore min-h-full bg-mesh wrapper
content = content.replace(
  /return \(\s*<>\s*<Topbar title="Onboard Member" \/>\s*<main className="flex-1 space-y-6 p-6 max-w-7xl mx-auto relative overflow-hidden">/,
  `return (
    <>
      <Topbar title="Onboard Member" />
      <main className="flex-1 relative">
        <div className="min-h-full bg-mesh w-full">
          <div className="max-w-7xl mx-auto p-6 w-full">`
);

content = content.replace(
  /<\/div>\s*<\/main>\s*<\/>\s*\);\s*\}/,
  `          </div>\n        </div>\n      </main>\n    </>\n  );\n}`
);

// 3. Make sure the container doesn't shift width: add w-full to the left column or the grid
content = content.replace(
  /<div className="grid lg:grid-cols-\[1\.4fr_1fr\] gap-6">/,
  `<div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">`
);
content = content.replace(
  /<div className="glass rounded-3xl p-6 min-h-\[440px\]">/,
  `<div className="glass rounded-3xl p-6 min-h-[440px] w-full">`
);
content = content.replace(
  /<div className="glass rounded-3xl p-6 sticky top-4 h-fit">/,
  `<div className="glass rounded-3xl p-6 sticky top-4 h-fit w-full">`
);


fs.writeFileSync('src/routes/_app.people-onboarding.tsx', content);
