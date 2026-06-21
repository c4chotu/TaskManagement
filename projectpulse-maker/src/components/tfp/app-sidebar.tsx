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
  LogOut,
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
import logoIcon from "@/assets/logo-icon.png";
import logoNew from "@/assets/LogoNew.png";
import logo from "@/assets/logo-full.png";


export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  const { user, logout } = useAuth();
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
        <div className={`flex items-center pt-1.5 ${collapsed ? "justify-center px-0 w-full" : "justify-center px-2 relative"}`}>
          <div className={`flex items-center min-w-0 ${collapsed ? "justify-center w-full" : "w-full"}`}>
            {!collapsed && (
              <div className="flex items-center justify-center py-1 w-full px-2">
                <img
                  src={`${logoNew}?v=4`}
                  alt="TaskFlow Pro"
                  className="h-14 w-auto object-contain transition-transform hover:scale-[1.02]"
                />
              </div>
            )}

            {collapsed && (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/80 via-primary to-primary/90 shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45)]">
                <img
                  src={logo}
                  alt="TaskFlow Pro"
                  className="h-5 w-5 object-contain drop-shadow-[0_1px_4px_rgba(255,255,255,1)] border-red"
                />              </div>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="scrollbar-thin">
        {groups.map((g) => (
          <SidebarGroup key={g.label} className="py-2">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase px-2 py-1">
                {g.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={`transition-all duration-150 rounded-lg ${active
                          ? "bg-gradient-to-r from-primary/10 to-primary/0 text-primary border-l-[3px] border-primary rounded-l-none font-semibold"
                          : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Link to={item.url} className="flex items-center gap-2.5">
                          <item.icon className={`h-4 w-4 shrink-0 transition-transform ${active ? "text-primary scale-105" : "text-muted-foreground"
                            }`} />
                          {!collapsed && <span className="text-xs">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 hover:bg-sidebar-accent/50 text-left transition-all duration-200 outline-none group ${collapsed ? "justify-center" : ""}`}>
              <Avatar className="h-8 w-8 border border-sidebar-border shrink-0 transition-transform group-hover:scale-105">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "??"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-1 min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{user?.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground/80">{user?.email}</span>
                </div>
              )}
              {!collapsed && (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-transform" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 mb-2">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/80">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav({ to: "/settings" })} className="text-xs cursor-pointer py-2 flex items-center">
              <Settings className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                nav({ to: "/login" });
              }}
              className="text-xs cursor-pointer py-2 flex items-center text-red-500 hover:text-red-600 hover:bg-red-500/5 focus:text-red-500 focus:bg-red-500/5"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
