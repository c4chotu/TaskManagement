import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Info, History, Download, GripVertical } from "lucide-react";
import { useDownloads } from "./downloads-tray";
import { toast } from "sonner";

export interface ExportColumn {
  key: string;
  label: string;
  required?: boolean;
}

interface Props {
  trigger?: React.ReactNode;
  module: "Issues" | "Tasks" | "Time Logs" | "Reports" | string;
  defaultName: string;
  availableColumns: ExportColumn[];
  defaultSelected?: string[];
  views?: { value: string; label: string }[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Zoho-style export dialog: format, custom view, columns picker
 * (available ↔ selected), async generation with progress in the tray.
 */
export function ZExportDialog({
  trigger,
  module,
  defaultName,
  availableColumns,
  defaultSelected,
  views = [{ value: "all", label: "All Records" }, { value: "my-open", label: "My Open" }],
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internal, setInternal] = useState(false);
  const open = controlledOpen ?? internal;
  const setOpen = onOpenChange ?? setInternal;

  const [format, setFormat] = useState<"xlsx" | "csv" | "pdf">("xlsx");
  const [view, setView] = useState(views[0]?.value ?? "all");
  const [singleSheet, setSingleSheet] = useState(true);
  const [category, setCategory] = useState("Active");
  const [available, setAvailable] = useState<ExportColumn[]>(
    availableColumns.filter((c) => !defaultSelected?.includes(c.key)),
  );
  const [selected, setSelected] = useState<ExportColumn[]>(
    (defaultSelected ?? availableColumns.slice(0, 5).map((c) => c.key))
      .map((k) => availableColumns.find((c) => c.key === k))
      .filter(Boolean) as ExportColumn[],
  );
  const [searchA, setSearchA] = useState("");
  const [searchS, setSearchS] = useState("");

  const { enqueue } = useDownloads();

  const moveTo = (col: ExportColumn, to: "selected" | "available") => {
    if (to === "selected") {
      setAvailable((p) => p.filter((c) => c.key !== col.key));
      setSelected((p) => [...p, col]);
    } else {
      if (col.required) return;
      setSelected((p) => p.filter((c) => c.key !== col.key));
      setAvailable((p) => [...p, col]);
    }
  };

  const moveAll = (to: "selected" | "available") => {
    if (to === "selected") {
      setSelected((p) => [...p, ...available]);
      setAvailable([]);
    } else {
      const keep = selected.filter((c) => c.required);
      setAvailable((p) => [...p, ...selected.filter((c) => !c.required)]);
      setSelected(keep);
    }
  };

  const startExport = () => {
    const name = `${defaultName}_${new Date().toISOString().slice(0, 10)}`;
    enqueue({
      name,
      module,
      format,
      rowCount: Math.floor(Math.random() * 400) + 20,
    });
    toast.success("Export queued — track progress in the Downloads tray");
    setOpen(false);
  };

  const fa = available.filter((c) => !searchA || c.label.toLowerCase().includes(searchA.toLowerCase()));
  const fs = selected.filter((c) => !searchS || c.label.toLowerCase().includes(searchS.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 px-5 py-3 space-y-0">
          <DialogTitle className="text-sm font-semibold">Export {module}</DialogTitle>
          <Link to="/downloads" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <History className="h-3.5 w-3.5" />
            Show Export History
          </Link>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">xlsx</SelectItem>
                  <SelectItem value="csv">csv</SelectItem>
                  <SelectItem value="pdf">pdf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custom View</Label>
              <Select value={view} onValueChange={setView}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {views.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={singleSheet} onCheckedChange={(v) => setSingleSheet(!!v)} />
            <span>Export All Projects {module} in Single Sheet</span>
            <Info className="h-3 w-3 text-muted-foreground" />
          </label>

          <div className="space-y-1.5">
            <Label className="text-xs">Project Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
                <SelectItem value="All">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">Filter (0)</span>
            <button className="text-primary hover:underline">Create Filter Criteria</button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select Columns</Label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
              <div className="rounded-md border border-border">
                <div className="border-b border-border px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Available</p>
                  <Input
                    value={searchA}
                    onChange={(e) => setSearchA(e.target.value)}
                    placeholder="Search"
                    className="mt-1 h-7 text-xs"
                  />
                  <button
                    onClick={() => moveAll("selected")}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase text-primary hover:underline"
                  >
                    Move All <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <ul className="max-h-48 overflow-y-auto py-1">
                  {fa.map((c) => (
                    <li key={c.key}>
                      <button
                        onClick={() => moveTo(c, "selected")}
                        className="block w-full px-3 py-1 text-left text-xs hover:bg-muted/40"
                      >
                        {c.label}
                      </button>
                    </li>
                  ))}
                  {fa.length === 0 && (
                    <li className="px-3 py-3 text-center text-[10px] text-muted-foreground">No columns</li>
                  )}
                </ul>
              </div>

              <div className="grid place-items-center text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>

              <div className="rounded-md border border-primary/30 bg-primary/5">
                <div className="border-b border-border px-2 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Selected</p>
                  <Input
                    value={searchS}
                    onChange={(e) => setSearchS(e.target.value)}
                    placeholder="Search"
                    className="mt-1 h-7 text-xs"
                  />
                  <button
                    onClick={() => moveAll("available")}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase text-primary hover:underline"
                  >
                    <ChevronLeft className="h-3 w-3" /> Move All
                  </button>
                </div>
                <ul className="max-h-48 overflow-y-auto py-1">
                  {fs.map((c) => (
                    <li key={c.key} className="group flex items-center justify-between px-2 py-1 text-xs hover:bg-background/60">
                      <span className="flex items-center gap-1.5">
                        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                        {c.label}
                        {c.required && <span className="text-destructive">*</span>}
                      </span>
                      {!c.required && (
                        <button
                          onClick={() => moveTo(c, "available")}
                          className="opacity-0 transition group-hover:opacity-100"
                        >
                          <ChevronLeft className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </li>
                  ))}
                  {fs.length === 0 && (
                    <li className="px-3 py-3 text-center text-[10px] text-muted-foreground">No columns selected</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3" />
            File will be deleted after 15 days of export.
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-gradient-primary text-primary-foreground"
            onClick={startExport}
            disabled={selected.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
