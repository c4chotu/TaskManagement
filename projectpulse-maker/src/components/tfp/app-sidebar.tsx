import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  AlertOctagon,
  Clock,
  Users,
  Workflow,
  BarChart3,
  Settings,
  Activity,
  ShieldAlert,
  CalendarDays,
  CalendarRange,
  Building2,
  Upload,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  const { user } = useAuth();

  const isSuperAdmin = user?.roleName === "SUPER_ADMIN";
  const isOrgOwner = user && ((user.roleLevel ?? 0) >= 5 || isSuperAdmin);
  const isOrgAdmin = user && ((user.roleLevel ?? 0) >= 4 || isSuperAdmin);
  const isDeptHeadOrAbove = user && ((user.roleLevel ?? 0) >= 3 || isSuperAdmin);
  const isTeamLeadOrAbove = user && ((user.roleLevel ?? 0) >= 2 || isSuperAdmin);

  const workItems = isSuperAdmin ? [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  ] : [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Tasks", url: "/tasks", icon: ListChecks },
    { title: "Calendar", url: "/calendar", icon: CalendarDays },
    { title: "Sprints", url: "/sprints", icon: CalendarRange },
    { title: "Incidents", url: "/incidents", icon: AlertOctagon },
  ];

  const opsItems = isSuperAdmin ? [] : [
    { title: "Time Tracking", url: "/time", icon: Clock },
    ...(isTeamLeadOrAbove ? [{ title: "Workload", url: "/workload", icon: Activity }] : []),
    { title: "On-Call", url: "/on-call", icon: ShieldAlert },
  ];

  const adminItems = [
    ...(!isSuperAdmin ? [{ title: "People", url: "/people", icon: Users }] : []),
    ...(isOrgAdmin || isOrgOwner || isSuperAdmin ? [{ title: "Collaboration", url: "/collaboration", icon: Users }] : []),
    ...(isOrgAdmin && !isSuperAdmin ? [{ title: "Onboard Member", url: "/people-onboarding", icon: Users }] : []),
    ...(isOrgOwner && !isSuperAdmin ? [{ title: "Bulk Upload", url: "/bulk-upload", icon: Upload }] : []),
    ...(isSuperAdmin ? [{ title: "Onboarding", url: "/onboarding", icon: Building2 }] : []),
    ...(isOrgAdmin && !isSuperAdmin ? [{ title: "Automations", url: "/automations", icon: Workflow }] : []),
    ...(isDeptHeadOrAbove && !isSuperAdmin ? [{ title: "Reports", url: "/reports", icon: BarChart3 }] : []),
    ...(isOrgAdmin && !isSuperAdmin ? [{ title: "Settings", url: "/settings", icon: Settings }] : []),
  ];

  const groups = [
    { label: "Work", items: workItems },
    ...(opsItems.length > 0 ? [{ label: "Operations", items: opsItems }] : []),
    ...(adminItems.length > 0 ? [{ label: "Admin", items: adminItems }] : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <span className="font-mono text-sm font-bold text-primary-foreground">T</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">TaskFlow Pro</span>
              <span className="text-[10px] font-mono uppercase text-muted-foreground">
                {isSuperAdmin ? "System Admin" : "Cyberdyne Sys"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="scrollbar-thin">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-mono uppercase tracking-widest">
                {g.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="h-8 w-8 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-xs">
              {user?.name?.slice(0, 2).toUpperCase() ?? "??"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium">{user?.name}</span>
              <span className="truncate text-[10px] text-muted-foreground">{user?.email}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
