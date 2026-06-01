import { useState, useMemo, useCallback, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Download,
  Columns3,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
} from "lucide-react";

export interface GridColumn<T = any> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | Date;
  filterValue?: (row: T) => string;
  width?: string;
  visible?: boolean;
  sticky?: boolean;
}

export interface GridAction<T = any> {
  label: string;
  icon?: React.ElementType;
  onClick: (rows: T[]) => void;
  variant?: "default" | "destructive" | "outline";
}

interface EnterpriseGridProps<T> {
  data: T[];
  columns: GridColumn<T>[];
  rowKey: (row: T) => string;
  title?: string;
  subtitle?: string;
  pageSize?: number;
  bulkActions?: GridAction<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  exportFilename?: string;
  filterPlaceholder?: string;
  headerActions?: ReactNode;
}

type SortDir = "asc" | "desc" | null;

export function EnterpriseGrid<T>({
  data,
  columns: initialColumns,
  rowKey,
  title,
  subtitle,
  pageSize = 20,
  bulkActions = [],
  onRowClick,
  emptyMessage = "No records found.",
  exportFilename = "export",
  filterPlaceholder = "Search...",
  headerActions,
}: EnterpriseGridProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(initialColumns.map((c) => [c.key, c.visible !== false]))
  );

  const visibleCols = initialColumns.filter((c) => colVisibility[c.key]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      visibleCols.some((col) => {
        const v = col.filterValue ? col.filterValue(row) : String(col.accessor(row) ?? "");
        return v.toLowerCase().includes(q);
      })
    );
  }, [data, search, visibleCols]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = initialColumns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, initialColumns]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir(null);
      }
      setPage(0);
    },
    [sortKey, sortDir]
  );

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(rowKey)));
    }
  };

  const selectedRows = data.filter((r) => selected.has(rowKey(r)));

  const exportCSV = () => {
    const headers = visibleCols.map((c) => c.header).join(",");
    const rows = filtered.map((row) =>
      visibleCols
        .map((c) => {
          const v = c.filterValue ? c.filterValue(row) : "";
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3">
        <div>
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={filterPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="h-8 w-48 pl-8 text-xs"
            />
          </div>
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Columns3 className="h-3.5 w-3.5" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {initialColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  className="text-xs"
                  checked={colVisibility[col.key]}
                  onCheckedChange={(v) =>
                    setColVisibility((prev) => ({ ...prev, [col.key]: v }))
                  }
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Export */}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 border-b border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-xs font-medium text-primary">{selected.size} selected</span>
          <div className="flex gap-1">
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant ?? "outline"}
                className="h-7 text-xs"
                onClick={() => {
                  action.onClick(selectedRows);
                  setSelected(new Set());
                }}
              >
                {action.icon && <action.icon className="mr-1 h-3 w-3" />}
                {action.label}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 text-xs"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="w-10 px-3 py-3">
                <button onClick={toggleAll} className="flex items-center">
                  {selected.size === paged.length && paged.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </th>
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                    col.sortValue ? "cursor-pointer select-none hover:text-foreground" : ""
                  }`}
                  onClick={() => col.sortValue && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortValue && <SortIcon colKey={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleCols.length + 1}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    className={`transition-colors hover:bg-muted/30 ${
                      isSelected ? "bg-primary/5" : ""
                    } ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    <td
                      className="px-3 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(key);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    {visibleCols.map((col) => (
                      <td key={col.key} className="px-3 py-3 text-xs">
                        {col.accessor(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex items-center justify-between border-t border-border bg-card/60 px-4 py-2.5">
        <span className="text-xs text-muted-foreground">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
