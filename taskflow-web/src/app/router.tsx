import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { AppShell } from '../shared/components/layout/AppShell';
import { ProjectHubPage } from '../features/projects/pages/ProjectHubPage';
import { ProjectShell } from '../features/projects/components/ProjectShell';
import { TaskListPage } from '../features/tasks/pages/TaskListPage';
import { KanbanPage } from '../features/kanban/pages/KanbanPage';
import { GanttPage } from '../features/gantt/pages/GanttPage';
import { CalendarPage } from '../features/calendar/pages/CalendarPage';
import { WorkloadPage } from '../features/workload/pages/WorkloadPage';
import { SprintsPage } from '../features/sprints/pages/SprintsPage';
import { TimesheetPage } from '../features/time/pages/TimesheetPage';
import { ReportsPage } from '../features/reports/pages/ReportsPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';

export const router = createBrowserRouter([
  {
    path: '/auth',
    children: [
      { path: 'login', element: <DashboardPage /> },
      { path: 'register', element: <RegisterPage /> },
    ]
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: 'home', element: <DashboardPage /> },
          { path: 'projects', element: <ProjectHubPage /> },
          {
            path: 'projects/:projectId',
            element: <ProjectShell />,
            children: [
              { index: true, element: <Navigate to="board" replace /> },
              { path: 'board', element: <KanbanPage /> },
              { path: 'tasks', element: <TaskListPage /> },
              { path: 'gantt', element: <GanttPage /> },
              { path: 'calendar', element: <CalendarPage /> },
              { path: 'workload', element: <WorkloadPage /> },
              { path: 'sprints', element: <SprintsPage /> },
            ]
          },
          { path: 'timesheet', element: <TimesheetPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ]
      }
    ]
  },
  {
    path: '*',
    element: <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">Page Not Found</div>
  }
]);

