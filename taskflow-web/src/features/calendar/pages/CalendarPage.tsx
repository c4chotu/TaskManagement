import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, CalendarRange, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import * as api from '../../../shared/lib/apiClientExtensions';

export const CalendarPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<api.Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date states
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true);
      try {
        let taskList: api.Task[] = [];
        try {
          taskList = await api.getTasks(projectId || '');
        } catch {
          // Mock calendar tasks spread across dates in current month
          const now = new Date();
          const y = now.getFullYear();
          const m = now.getMonth();
          
          taskList = [
            { id: 't-301', title: 'Verify SSL checkers cron schedules', description: 'Run checks daily at midnight.', projectId: projectId || 'p-1', statusId: 's6', taskType: 'TASK', createdAt: new Date().toISOString(), dueDate: new Date(y, m, 5).toISOString() },
            { id: 't-302', title: 'Latency breach in microservice replicas', description: 'Spike exceeding 1200ms on secondary nodes.', projectId: projectId || 'p-1', statusId: 's5', taskType: 'ISSUE', createdAt: new Date().toISOString(), dueDate: new Date(y, m, 12).toISOString() },
            { id: 't-303', title: 'Migrate tokens to standard claims format', description: 'Update JWT authentication middlewares.', projectId: projectId || 'p-1', statusId: 's3', taskType: 'TASK', createdAt: new Date().toISOString(), dueDate: new Date(y, m, 12).toISOString() },
            { id: 't-304', title: 'Implement dynamic client rate limiters', description: 'Max 100 requests per minute configuration.', projectId: projectId || 'p-1', statusId: 's2', taskType: 'TASK', createdAt: new Date().toISOString(), dueDate: new Date(y, m, 18).toISOString() },
            { id: 't-305', title: 'Telemetry charts visualization dashboards', description: 'Visualizing CPU queue allocation capacities.', projectId: projectId || 'p-1', statusId: 's1', taskType: 'TASK', createdAt: new Date().toISOString(), dueDate: new Date(y, m, 26).toISOString() }
          ];
        }
        setTasks(taskList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCalendar();
  }, [projectId]);

  // Calendar logic helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const gridDays = useMemo(() => {
    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Day of the week first day falls on (0 = Sunday, ..., 6 = Saturday)
    const dayOfWeek = firstDay.getDay();

    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Days in previous month to pad starting week cells
    const prevMonthDays = new Date(year, month, 0).getDate();

    const calendarGrid: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Pad starting days of previous month
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      calendarGrid.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarGrid.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Pad ending week days of next month to complete 6-week layout grid (42 days)
    const remainingDays = 42 - calendarGrid.length;
    for (let i = 1; i <= remainingDays; i++) {
      calendarGrid.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return calendarGrid;
  }, [currentDate]);

  const changeMonth = (val: number) => {
    setCurrentDate(new Date(year, month + val, 1));
  };

  const getDayTasks = (date: Date) => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due.getFullYear() === date.getFullYear() &&
             due.getMonth() === date.getMonth() &&
             due.getDate() === date.getDate();
    });
  };

  return (
    <div className="p-6 h-full flex flex-col min-w-0 bg-[#0b0f19]">
      {/* Month headers switcher controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <CalendarRange size={14} className="text-[#3b82f6]" />
          <span className="text-xs font-semibold text-[#adc6ff]">Schedules grid</span>
        </div>

        <div className="flex items-center gap-2 bg-[#161a26]/40 border border-[#424754]/20 rounded-lg p-1">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-white/5 rounded text-[#c2c6d6] transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-bold text-white px-3 uppercase tracking-wider min-w-[120px] text-center">
            {monthName} {year}
          </span>
          <button 
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-white/5 rounded text-[#c2c6d6] transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#8c909f] flex-col gap-2">
          <Sparkles size={20} className="text-blue-500 animate-spin" />
          Plotting calendar schedules...
        </div>
      ) : (
        <div className="flex-1 border border-[#424754]/10 rounded-xl bg-[#0f131d]/20 overflow-hidden flex flex-col min-h-[480px]">
          
          {/* Weekday titles headers */}
          <div className="grid grid-cols-7 border-b border-[#424754]/10 bg-[#0f131d]/60 text-center py-3 text-[10px] font-bold text-[#8c909f] uppercase tracking-wider select-none">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Monthly grid cells */}
          <div className="grid grid-cols-7 flex-1">
            {gridDays.map((cell, idx) => {
              const dayTasks = getDayTasks(cell.date);
              const isToday = cell.date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={idx}
                  className={`border-r border-b border-[#424754]/5 p-2 flex flex-col gap-1 min-h-[80px] transition-all hover:bg-white/[0.01] ${
                    cell.isCurrentMonth ? '' : 'opacity-25'
                  } ${isToday ? 'bg-blue-500/[0.02]' : ''}`}
                >
                  {/* Calendar cell date label */}
                  <div className="flex justify-between items-center mb-1">
                    <span 
                      className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-blue-500 text-white font-black' : 'text-[#8c909f]'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                  </div>

                  {/* Day items list */}
                  <div className="flex-1 overflow-y-auto custom-scroll flex flex-col gap-1 pr-0.5">
                    {dayTasks.map(task => {
                      const isIssue = task.taskType === 'ISSUE';
                      
                      return (
                        <div
                          key={task.id}
                          title={`${task.title} - ${task.description}`}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold truncate border flex items-center gap-1 select-none hover:brightness-110 cursor-pointer ${
                            isIssue ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                            task.statusId === 's6' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                            'bg-blue-500/10 border-blue-500/20 text-[#adc6ff]'
                          }`}
                        >
                          {isIssue && <AlertTriangle size={8} className="text-red-400 shrink-0" />}
                          <span className="truncate">{task.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
