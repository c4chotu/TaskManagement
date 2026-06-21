const fs = require('fs');
let content = fs.readFileSync('src/components/tfp/routing-rule-create-dialog.tsx', 'utf8');

// Replace route imports and exports
content = content.replace(/import \{ createFileRoute.*?\} from "@tanstack\/react-router";\n/, '');
content = content.replace(/export const Route.*?\}\);\n\n/s, '');
content = content.replace(/function CreateRulePage\(\) \{/, 'export function RoutingRuleCreateDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {');
content = content.replace(/import \{ Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter \} from "@\/components\/ui\/dialog";\n/, '');
content = "import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from \"@/components/ui/dialog\";\n" + content;

// Replace return statement to wrap in Dialog
content = content.replace(/return \(\n\s+<>\n.*?<main.*?>\n(.*?)<\/main>\n\s+<\/>\n  \);/s, (match, inner) => {
    return `return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-primary/20 bg-card p-0 sm:max-w-3xl overflow-hidden rounded-2xl shadow-glow animate-in fade-in duration-200">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border-b border-border/60 px-6 py-4 flex items-center justify-between">
          <div className="space-y-1">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                Create Routing Rule
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mt-1">
              Configure how tasks are automatically assigned to teams or individuals.
            </p>
          </div>
        </div>

        {/* Body Section */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
` + inner.replace(/<div className="mb-6.*?>.*?<\/div>/s, '') + `
        </div>

        {/* Footer Section */}
        <DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4 flex items-center justify-end gap-3 mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} className="bg-primary text-primary-foreground font-semibold">
            <Sparkles className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );`;
});

// Update handleCreate success logic
content = content.replace(/toast\.success\("Routing rule created!"\);\n\s+navigate\(\{ to: "\/automations" \}\);/g, 'toast.success("Routing rule created!");\n      onOpenChange(false);');

fs.writeFileSync('src/components/tfp/routing-rule-create-dialog.tsx', content);
