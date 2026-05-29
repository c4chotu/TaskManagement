import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, Outlet } from 'react-router-dom';
import {
  Kanban,
  ListTodo,
  Milestone,
  CalendarDays,
  Gauge,
  TrendingUp,
  Activity
} from 'lucide-react';
import apiClient from '../../../shared/lib/apiClient';

interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
}

export const ProjectShell: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const fetchProj = async () => {
      try {
        const res = await apiClient.get(`/api/v1/projects/${projectId}`);
        setProject(res.data);
      } catch (e) {
        setProject({
          id: projectId || 'p9999999-9999-9999-9999-999999999999',
          name: 'Core Infrastructure Sprint',
          description: 'Core Platform Sprint Cycle',
          type: 'KANBAN'
        });
      }
    };
    fetchProj();
  }, [projectId]);

  const viewTabs = [
    { label: 'Kanban Board', path: 'board', icon: Kanban },
    { label: 'Virtualized List', path: 'tasks', icon: ListTodo },
    { label: 'Gantt Timeline', path: 'gantt', icon: Milestone },
    { label: 'Calendar Grid', path: 'calendar', icon: CalendarDays },
    { label: 'Capacity Balances', path: 'workload', icon: Gauge },
    { label: 'Sprints & Retro', path: 'sprints', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Project Banner Header */}
      <div className="bg-[#0f131d]/40 border-b border-[#424754]/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#adc6ff]">
            <span>Portfolio</span>
            <span>/</span>
            <span>Active Sprint</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            {project?.name || 'Loading Project...'}
            <span className="text-[10px] uppercase bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono font-semibold">Active Sprint</span>
          </h2>
          <p className="text-xs text-[#c2c6d6] mt-1">{project?.description || 'Project environment.'}</p>
        </div>

        <div className="flex gap-4 text-xs font-semibold text-[#c2c6d6]">
          <div className="bg-white/5 border border-white/5 px-3 py-2 rounded-lg flex items-center gap-2">
            <Activity size={13} className="text-[#06b6d4]" />
            <span>Health Status: Nominal</span>
          </div>
        </div>
      </div>

      {/* Sub tabs view switcher */}
      <div className="bg-[#0f131d]/20 border-b border-[#424754]/10 px-6 flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-none">
        {viewTabs.map((tab) => {
          const Icon = tab.icon;
          const fullPath = `/projects/${projectId}/${tab.path}`;
          const isActive = location.pathname.endsWith(tab.path) || (tab.path === 'tasks' && location.pathname.includes('tasks'));
          return (
            <Link
              key={tab.path}
              to={fullPath}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-[#c2c6d6] hover:text-white'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#3b82f6]' : ''} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Nested View Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};
export default ProjectShell;
