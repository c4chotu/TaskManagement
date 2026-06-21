const fs = require('fs');

let content = fs.readFileSync('src/routes/_app.automations.tsx', 'utf8');

// 1. Add import for RoutingRuleCreateDialog
content = content.replace(
  /import \{ Topbar \} from "@\/components\/tfp\/topbar";/,
  `import { Topbar } from "@/components/tfp/topbar";\nimport { RoutingRuleCreateDialog } from "@/components/tfp/routing-rule-create-dialog";`
);

// 2. Add state
content = content.replace(
  /const \[autoTeam, setAutoTeam\] = useState\(""\);/,
  `const [autoTeam, setAutoTeam] = useState("");\n  const [autoDept, setAutoDept] = useState("");\n  const [routingRuleDialogOpen, setRoutingRuleDialogOpen] = useState(false);`
);

// 3. Update Create Rule button
content = content.replace(
  /<Button size="sm" asChild className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl gap-1">\s*<Link to="\/automations\/new">\s*<Plus className="mr-1\.5 h-4 w-4" \/> Create Rule\s*<\/Link>\s*<\/Button>/,
  `<Button size="sm" onClick={() => setRoutingRuleDialogOpen(true)} className="bg-gradient-primary text-primary-foreground font-semibold rounded-xl gap-1">\n              <Plus className="mr-1.5 h-4 w-4" /> Create Rule\n            </Button>`
);

// 4. Update Dialog Header and overall style
content = content.replace(
  /<DialogContent className="glass-card-green border border-white\/10 bg-card\/90 backdrop-blur-md rounded-2xl p-6 sm:max-w-\[600px\] sm:max-h-\[90vh\] overflow-y-auto p-10">\s*<DialogHeader>\s*<DialogTitle className="text-lg font-bold text-foreground">\s*\{editingAutomation \? "Edit Automation Rule" : "Create Automation Rule"\}\s*<\/DialogTitle>\s*<DialogDescription className="text-xs text-muted-foreground">\s*Configure event-driven actions based on task transitions and criteria\.\s*<\/DialogDescription>\s*<\/DialogHeader>\s*<div className="space-y-4 py-2 text-xs">/,
  `<DialogContent className="max-w-2xl border-primary/20 bg-card p-0 sm:max-w-3xl overflow-hidden rounded-2xl shadow-glow animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-primary/10 via-card to-card border-b border-border/60 px-6 py-4 flex items-center justify-between">
              <div className="space-y-1">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    {editingAutomation ? "Edit Automation Rule" : "Create Automation Rule"}
                  </DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Configure event-driven actions based on task transitions and criteria.
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4 text-xs">`
);

// 5. Update Department/Team dropdowns
content = content.replace(
  /\{scopeType === "team" && \(\s*<div className="space-y-1">\s*<Label className="text-\[10px\] font-bold text-muted-foreground uppercase">Team<\/Label>\s*<Select value=\{autoTeam\} onValueChange=\{setAutoTeam\}>\s*<SelectTrigger className="h-9 text-xs">\s*<SelectValue placeholder="Select Team" \/>\s*<\/SelectTrigger>\s*<SelectContent>\s*\{teams.map\(\(t\) => \(\s*<SelectItem key=\{t.id\} value=\{t.id\}>\{t.name\}<\/SelectItem>\s*\)\)\}\s*<\/SelectContent>\s*<\/Select>\s*<\/div>\s*\)\}/,
  `{scopeType === "team" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Department</Label>
                    <Select value={autoDept} onValueChange={(v) => {
                      setAutoDept(v);
                      const filteredTeams = teams.filter(t => t.departmentId === v);
                      if (filteredTeams.length > 0) setAutoTeam(filteredTeams[0].id);
                      else setAutoTeam("");
                    }}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Team</Label>
                    <Select value={autoTeam} onValueChange={setAutoTeam}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.filter(t => !autoDept || t.departmentId === autoDept).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}`
);

// 6. Fix handleOpenCreateAutomation to clear autoDept
content = content.replace(
  /setAutoTeam\(teams\[0\]\?\.id \|\| ""\);/,
  `setAutoTeam(teams[0]?.id || "");\n      setAutoDept(teams[0]?.departmentId || "");`
);

// 7. Fix scopeType select handler to use autoDept
content = content.replace(
  /if \(v === "team" && !autoTeam && teams.length > 0\) \{\s*setAutoTeam\(teams\[0\].id\);\s*\}/,
  `if (v === "team" && !autoDept && departments.length > 0) {
                      setAutoDept(departments[0].id);
                      const deptTeams = teams.filter(t => t.departmentId === departments[0].id);
                      if (deptTeams.length > 0) setAutoTeam(deptTeams[0].id);
                    }`
);


// 8. Update DialogFooter styling
content = content.replace(
  /<\/div>\s*<DialogFooter className="pt-4">\s*<Button variant="outline" size="sm" onClick=\{.*?Cancel\s*<\/Button>\s*<Button onClick=\{handleSaveAutomation\} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">\s*\{editingAutomation \? "Update Automation" : "Save Automation"\}\s*<\/Button>\s*<\/DialogFooter>/s,
  `            </div>
            <DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4 flex items-center justify-end gap-3 mt-auto">
              <Button variant="outline" size="sm" onClick={() => setAutomationDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAutomation} size="sm" className="bg-primary text-primary-foreground font-semibold">
                <Sparkles className="mr-2 h-4 w-4" />
                {editingAutomation ? "Update Automation" : "Save Automation"}
              </Button>
            </DialogFooter>`
);

// 9. Add RoutingRuleCreateDialog before closing main
content = content.replace(
  /<\/Dialog>\s*<\/main>/,
  `</Dialog>\n        <RoutingRuleCreateDialog open={routingRuleDialogOpen} onOpenChange={setRoutingRuleDialogOpen} />\n      </main>`
);

fs.writeFileSync('src/routes/_app.automations.tsx', content);
