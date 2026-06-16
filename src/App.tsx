/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, Calendar, Settings } from 'lucide-react';
import Login from './components/Login';
import Employees from './components/Employees';
import AttendanceView from './components/AttendanceView';
import AppSettings from './components/AppSettings';
import { UserProfile } from './types';
import { apiService } from './services/api';

type Tab = 'employees' | 'attendance' | 'settings';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'employees',  label: 'Employees',  icon: <Users className="w-5 h-5" /> },
  { id: 'attendance', label: 'Attendance', icon: <Calendar className="w-5 h-5" /> },
  { id: 'settings',   label: 'Settings',   icon: <Settings className="w-5 h-5" /> },
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('employees');

  // Restore session on mount
  useEffect(() => {
    if (!apiService.isLoggedIn) { setChecking(false); return; }
    apiService.me()
      .then(u => setUser(u))
      .catch(() => { apiService.logout(); })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (u: UserProfile) => setUser(u);

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setTab('employees');
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {tab === 'employees'  && <Employees />}
        {tab === 'attendance' && <AttendanceView />}
        {tab === 'settings'   && <AppSettings currentUser={user} onLogout={handleLogout} />}
      </div>

      {/* Bottom navigation */}
      <nav className="bg-zinc-900 border-t border-zinc-800 pb-safe">
        <div className="flex">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                tab === item.id ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-mono uppercase font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
