import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";

export function Topbar({ title, actions }: { title?: string; actions?: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        {title && <h1 className="text-sm font-semibold tracking-tight">{title}</h1>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks, incidents…" className="h-8 w-64 pl-8 text-xs" />
        </div>
        {actions}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => { logout(); navigate({ to: "/login" }); }}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
