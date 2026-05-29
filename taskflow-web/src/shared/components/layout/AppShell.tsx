import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../../features/auth/store/authSlice';
import type { RootState } from '../../store/rootReducer';
import {
  LayoutGrid,
  FolderKanban,
  Clock,
  BarChart3,
  Settings,
  Sparkles,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { AIAssistantPanel } from '../../../features/ai/components/AIAssistantPanel';

export const AppShell: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useSelector((state: RootState) => state.auth.user);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/auth/login');
  };

  const navItems = [
    { label: 'Overview', path: '/home', icon: LayoutGrid },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Timesheets', path: '/timesheet', icon: Clock },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#dfe2f1] flex flex-col font-sans relative overflow-hidden">
      {/* Background glow flares */}
      <div className="absolute top-[-25%] right-[-10%] w-[65%] h-[65%] rounded-full bg-blue-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-15%] w-[65%] h-[65%] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full h-16 bg-[#0f131d]/60 backdrop-blur-[24px] border-b border-[#424754]/10 flex items-center justify-between px-6 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-white/5 rounded-lg text-[#c2c6d6]"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3b82f6] to-[#06b6d4] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white to-[#8c909f] bg-clip-text text-transparent">
              TaskFlow Pro
            </span>
          </div>
        </div>

        {/* Header Right */}
        <div className="flex items-center gap-4">
          {/* Quick AI Trigger */}
          <button
            onClick={() => setAiOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[#adc6ff] text-xs font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.1)] cursor-pointer"
          >
            <Sparkles size={13} className="text-[#3b82f6] animate-pulse" />
            AI Assistant
          </button>

          <button className="text-[#c2c6d6] hover:bg-white/5 p-2 rounded-full flex items-center justify-center transition-colors">
            <Bell size={18} />
          </button>

          {/* User Profile Summary */}
          <div className="flex items-center gap-2 border-l border-white/5 pl-4 ml-1">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-[#adc6ff]">
              {authUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#dfe2f1] leading-none">{authUser?.name || 'User'}</span>
              <span className="text-[10px] text-[#adc6ff] font-semibold mt-0.5">Workspace Member</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-[#c2c6d6] hover:text-red-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Page Container */}
      <div className="flex flex-1 pt-16 h-screen overflow-hidden">
        
        {/* Sidebar (Desktop) */}
        <aside
          className={`hidden md:flex flex-col border-r border-[#424754]/10 bg-[#0f131d]/80 backdrop-blur-[40px] shadow-[4px_0_24px_rgba(0,0,0,0.1)] transition-all duration-300 z-40 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="flex-1 px-4 py-6 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 rounded-lg py-3 px-4 transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-500/10 text-[#adc6ff] shadow-[0_0_15px_rgba(173,198,255,0.1)] font-semibold'
                      : 'text-[#c2c6d6] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-[#3b82f6]' : ''} />
                  {!sidebarCollapsed && <span className="text-xs uppercase tracking-wider">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Toggle Sidebar Collapse button */}
          <div className="p-4 border-t border-white/5 flex justify-end">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#c2c6d6]"
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </aside>

        {/* Sidebar (Mobile Overlay) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-64 bg-[#0f131d] h-full p-6 flex flex-col border-r border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles size={20} className="text-[#3b82f6]" />
                <span className="font-bold text-base text-white">Menu</span>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 rounded-lg py-3 px-4 transition-all duration-300 ${
                        isActive
                          ? 'bg-blue-500/10 text-[#adc6ff] shadow-[0_0_15px_rgba(173,198,255,0.1)]'
                          : 'text-[#c2c6d6] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs uppercase tracking-wider">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#0b0f19]">
          <Outlet />
        </main>
      </div>

      {/* Global AI Assistant Sliding Panel */}
      <AIAssistantPanel isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
};
export default AppShell;
