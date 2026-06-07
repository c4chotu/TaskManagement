import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
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
  PanelLeftClose,
  PanelLeft,
  Plus,
  ChevronDown,
  MoreHorizontal,
  Bug,
  FileText,
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/logo.svg";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  const { user } = useAuth();
  const nav = useNavigate();

  const isSuperAdmin = user?.roleName === "SUPER_ADMIN";
  const isOrgOwner = user && ((user.roleLevel ?? 0) >= 5 || isSuperAdmin);
  const isOrgAdmin = user && ((user.roleLevel ?? 0) >= 4 || isSuperAdmin);
  const isDeptHeadOrAbove = user && ((user.roleLevel ?? 0) >= 3 || isSuperAdmin);
  const isTeamLeadOrAbove = user && ((user.roleLevel ?? 0) >= 2 || isSuperAdmin);

  const workItems = isSuperAdmin ? [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  ] : [
    { title: "Home", url: "/home", icon: LayoutDashboard },
    { title: "Dashboard", url: "/dashboard", icon: Activity },
    { title: "Projects", url: "/projects", icon: FolderKanban },
    { title: "Tasks", url: "/tasks", icon: ListChecks },
    { title: "Calendar", url: "/calendar", icon: CalendarDays },
    { title: "Sprints", url: "/sprints", icon: CalendarRange },
    { title: "Issues", url: "/incidents", icon: AlertOctagon },
    // { title: "Issues", url: "/issues", icon: AlertOctagon },

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
      <SidebarHeader className="border-b border-sidebar-border gap-2">
        {/* Brand row */}
        <div className="flex items-center justify-between gap-2 px-2 pt-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-[0_4px_14px_-2px_rgba(16,185,129,0.45)]">
              {/* <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
                <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg> */}
              <img src={logo} alt="TaskFlow Pro" className="h-20 w-20" />
            </div>
            {!collapsed && (
              <span className="truncate text-[13px] font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                TaskFlow Pro
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* New Task split-button (hidden for super admin / when collapsed) */}
        {!isSuperAdmin && !collapsed && (
          <div className="flex items-center gap-1.5 px-2 pb-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 h-9 justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white font-semibold shadow-[0_4px_12px_-2px_rgba(16,185,129,0.5)] border-0"
                >
                  <Plus className="h-4 w-4" />
                  Create                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav({ to: "/tasks/new" })} className="text-xs cursor-pointer">
                  <ListChecks className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/incidents" })} className="text-xs cursor-pointer">
                  <Bug className="h-3.5 w-3.5 mr-2 text-orange-500" /> Issue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/projects" })} className="text-xs cursor-pointer">
                  <FolderKanban className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/sprints" })} className="text-xs cursor-pointer">
                  <CalendarRange className="h-3.5 w-3.5 mr-2 text-violet-500" /> Sprint
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav({ to: "/reports" })} className="text-xs cursor-pointer">
                  <FileText className="h-3.5 w-3.5 mr-2 text-blue-500" /> Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-lg border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav({ to: "/calendar" })} className="text-xs cursor-pointer">
                  <CalendarDays className="h-3.5 w-3.5 mr-2" /> Open Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/time" })} className="text-xs cursor-pointer">
                  <Clock className="h-3.5 w-3.5 mr-2" /> Log Time
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/downloads" })} className="text-xs cursor-pointer">
                  <Upload className="h-3.5 w-3.5 mr-2" /> Exports
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav({ to: "/settings" })} className="text-xs cursor-pointer">
                  <Settings className="h-3.5 w-3.5 mr-2" /> Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Collapsed: expand trigger */}
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="mx-auto grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition"
            title="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
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
