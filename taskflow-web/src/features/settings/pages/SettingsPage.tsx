import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store/rootReducer';
import { 
  User, 
  Bell, 
  Users, 
  ShieldAlert, 
  ArrowUpRight, 
  UserCheck, 
  Settings2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import * as api from '../../../shared/lib/apiClientExtensions';

interface Member {
  id: string;
  name: string;
  email: string;
  roleLevel: number;
  roleName: string;
}

export const SettingsPage: React.FC = () => {
  const authUser = useSelector((state: RootState) => state.auth.user);
  
  // Tab control
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'notifications' | 'roster'>('profile');

  // Profile Form States
  const [profileName, setProfileName] = useState(authUser?.name || 'Alice Chen');
  const [profileBio, setProfileBio] = useState('Platform Infrastructure Lead');

  // Notifications State
  const [notifySla, setNotifySla] = useState(true);
  const [notifyEscalation, setNotifyEscalation] = useState(true);

  // Roster members state
  const [members, setMembers] = useState<Member[]>([
    { id: '11111111-1111-1111-1111-111111111111', name: 'Alice Chen', email: 'alice@taskflow.pro', roleLevel: 5, roleName: 'ORG_OWNER' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Marcus Taylor', email: 'marcus@taskflow.pro', roleLevel: 3, roleName: 'DEPT_HEAD' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'David Kim', email: 'david@taskflow.pro', roleLevel: 2, roleName: 'TEAM_LEAD' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'Sarah Connor', email: 'sarah@taskflow.pro', roleLevel: 1, roleName: 'TEAM_MEMBER' }
  ]);

  // Promoter actor level calculation
  const currentActor = members.find(m => m.id === authUser?.userId) || members[0]; // fallback Alice
  const actorLevel = currentActor.roleLevel;

  // Promotion input states
  const [promoUserId, setPromoUserId] = useState('');
  const [promoTargetLevel, setPromoTargetLevel] = useState(1);
  const [promoRoleName, setPromoRoleName] = useState('TEAM_MEMBER');

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    addToast("Profile credentials updated successfully.", "success");
  };

  const saveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    addToast("Notification routing alerts preferences updated.", "success");
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoUserId) return;

    const targetUser = members.find(m => m.id === promoUserId);
    if (!targetUser) return;

    // Strict Level check validation
    // Roster Promo requirements: actorLevel >= targetLevel + 2
    if (actorLevel < promoTargetLevel + 2) {
      addToast(`Role promotion denied. Your level (L${actorLevel}) lacks L+2 authority to authorize L${promoTargetLevel} ranks.`, "error");
      return;
    }

    try {
      await api.assignRole({
        userId: promoUserId,
        roleLevel: promoTargetLevel,
        roleName: promoRoleName
      });
      
      setMembers(prev => prev.map(m => 
        m.id === promoUserId ? { ...m, roleLevel: promoTargetLevel, roleName: promoRoleName } : m
      ));
      addToast(`Promoted ${targetUser.name} to L${promoTargetLevel} (${promoRoleName}) successfully.`, "success");
      setPromoUserId('');
    } catch {
      // Offline fallback
      setMembers(prev => prev.map(m => 
        m.id === promoUserId ? { ...m, roleLevel: promoTargetLevel, roleName: promoRoleName } : m
      ));
      addToast(`Mock update: Elevated ${targetUser.name} to L${promoTargetLevel} (API Offline).`, "success");
      setPromoUserId('');
    }
  };

  // Adjust role name as level slides
  const handleLevelChange = (lvl: number) => {
    setPromoTargetLevel(lvl);
    if (lvl === 0) setPromoRoleName('GUEST');
    else if (lvl === 1) setPromoRoleName('TEAM_MEMBER');
    else if (lvl === 2) setPromoRoleName('TEAM_LEAD');
    else if (lvl === 3) setPromoRoleName('DEPT_HEAD');
    else if (lvl === 4) setPromoRoleName('ORG_ADMIN');
    else if (lvl === 5) setPromoRoleName('ORG_OWNER');
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col min-w-0 bg-[#0b0f19] custom-scroll">
      
      {/* Toast logs */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id}
            className={`px-4 py-3 rounded-lg border text-xs font-semibold shadow-lg min-w-[280px] pointer-events-auto animate-slide-in flex items-center gap-2 ${
              t.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              t.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            {t.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Title Header */}
      <div className="flex flex-col mb-6 pb-4 border-b border-[#424754]/10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings2 size={18} className="text-[#3b82f6]" />
          Cockpit Settings Console
        </h2>
        <p className="text-xs text-[#c2c6d6] mt-1">Configure profile details, notify rules, and promote organization team hierarchies.</p>
      </div>

      {/* Tabs list switchers */}
      <div className="flex gap-2 mb-6 bg-[#0f131d]/60 border border-[#424754]/10 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'profile' ? 'bg-blue-500/10 text-[#adc6ff] shadow-md border border-blue-500/20' : 'text-[#c2c6d6] hover:text-white'
          }`}
        >
          <User size={13} /> Profile Profile
        </button>
        <button
          onClick={() => setActiveSubTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'notifications' ? 'bg-blue-500/10 text-[#adc6ff] shadow-md border border-blue-500/20' : 'text-[#c2c6d6] hover:text-white'
          }`}
        >
          <Bell size={13} /> Notification alerts
        </button>
        <button
          onClick={() => setActiveSubTab('roster')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'roster' ? 'bg-blue-500/10 text-[#adc6ff] shadow-md border border-blue-500/20' : 'text-[#c2c6d6] hover:text-white'
          }`}
        >
          <Users size={13} /> Org Roster promotion
        </button>
      </div>

      {/* Tab Panel contents */}
      <div className="flex-1">
        
        {/* SUBTAB 1: PROFILE */}
        {activeSubTab === 'profile' && (
          <form onSubmit={saveProfile} className="glass-panel p-6 rounded-xl border border-[#424754]/10 max-w-md flex flex-col gap-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">Update Profile Credentials</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#8c909f] font-bold uppercase">Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="bg-[#161a26]/60 border border-[#424754]/20 rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500/40"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#8c909f] font-bold uppercase">Bio Description</label>
              <input
                type="text"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="bg-[#161a26]/60 border border-[#424754]/20 rounded-lg px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500/40"
              />
            </div>

            <button 
              type="submit"
              className="bg-blue-500 hover:brightness-110 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all w-fit mt-2 cursor-pointer"
            >
              Save Credentials
            </button>
          </form>
        )}

        {/* SUBTAB 2: NOTIFICATIONS */}
        {activeSubTab === 'notifications' && (
          <form onSubmit={saveNotifications} className="glass-panel p-6 rounded-xl border border-[#424754]/10 max-w-md flex flex-col gap-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5">Configure System Alerts</h3>

            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifySla}
                  onChange={(e) => setNotifySla(e.target.checked)}
                  className="rounded border-[#424754]/20 bg-[#161a26] text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">SLA Critical Response Paging</span>
                  <span className="text-[9px] text-[#8c909f] mt-0.5">Receive audio reminders on primary SRE queue triggers.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyEscalation}
                  onChange={(e) => setNotifyEscalation(e.target.checked)}
                  className="rounded border-[#424754]/20 bg-[#161a26] text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">Role Escalation Alerts</span>
                  <span className="text-[9px] text-[#8c909f] mt-0.5">Trigger prompts if subordinate tickets exceed SLA bounds.</span>
                </div>
              </label>
            </div>

            <button 
              type="submit"
              className="bg-blue-500 hover:brightness-110 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all w-fit mt-2 cursor-pointer"
            >
              Save Alert Rules
            </button>
          </form>
        )}

        {/* SUBTAB 3: ORG ROSTER & PROMOTION */}
        {activeSubTab === 'roster' && (
          <div className="flex flex-col gap-6">
            
            {/* L+2 Warning Alert badge */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3 max-w-2xl">
              <ShieldAlert size={20} className="text-blue-400 shrink-0" />
              <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-[#c2c6d6]">
                <span className="font-bold text-white uppercase text-[10px] tracking-wide">Enterprise Role Elevation Constraints</span>
                <span>Role promotions enforce **L+2 Level Check bounds**. Your current actor authority level is **L{actorLevel} ({currentActor.roleName})**. You may only promote colleagues up to **Level {actorLevel - 2}** directly. Ranks Level {actorLevel - 1} and higher require promoter elevation settings.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Table listing members */}
              <div className="glass-panel p-5 rounded-xl border border-[#424754]/10 lg:col-span-8 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-1">
                  <Users size={13} className="text-blue-400" /> Organization Members Tree
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#424754]/10 text-[9px] font-bold text-[#8c909f] uppercase tracking-wider">
                        <th className="py-2.5 pr-4">Colleague Name</th>
                        <th className="py-2.5 px-2">System Level</th>
                        <th className="py-2.5 pl-4 text-right">Role Designation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(m => (
                        <tr key={m.id} className="border-b border-[#424754]/5 hover:bg-white/[0.01]">
                          <td className="py-3 pr-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">{m.name}</span>
                              <span className="text-[9px] text-[#8c909f] mt-0.5">{m.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 font-mono font-bold text-[#adc6ff]">L{m.roleLevel}</td>
                          <td className="py-3 pl-4 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/5 text-[#c2c6d6]">
                              {m.roleName}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Promo Action Form Panel */}
              <form onSubmit={handlePromote} className="glass-panel p-5 rounded-xl border border-[#424754]/10 lg:col-span-4 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-white/5 flex items-center gap-1">
                  <UserCheck size={13} className="text-green-400" />
                  Elevate Colleague Rank
                </h4>

                {/* Member select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] text-[#8c909f] font-bold uppercase">Select Colleague</label>
                  <select
                    value={promoUserId}
                    onChange={(e) => setPromoUserId(e.target.value)}
                    className="bg-[#161a26]/60 border border-[#424754]/20 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/40 cursor-pointer"
                    required
                  >
                    <option value="">Choose Member...</option>
                    {members.filter(m => m.id !== authUser?.userId).map(m => (
                      <option key={m.id} value={m.id}>{m.name} (L{m.roleLevel})</option>
                    ))}
                  </select>
                </div>

                {/* Level slider */}
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] text-[#8c909f] font-bold uppercase flex justify-between">
                    <span>Target Rank: L{promoTargetLevel}</span>
                    <span className="text-green-400 font-bold">{promoRoleName}</span>
                  </label>
                  
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={promoTargetLevel}
                    onChange={(e) => handleLevelChange(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1 rounded-lg cursor-pointer bg-white/10"
                  />
                  
                  <div className="flex justify-between text-[8px] font-mono text-[#8c909f] px-1 select-none">
                    <span>L0</span>
                    <span>L1</span>
                    <span>L2</span>
                    <span>L3</span>
                    <span>L4</span>
                    <span>L5</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs rounded-lg transition-all flex justify-center items-center gap-1 shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  <ArrowUpRight size={13} />
                  Authorize Promotion
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
