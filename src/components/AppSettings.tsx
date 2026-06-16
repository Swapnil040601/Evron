import React, { useState } from 'react';
import { LogOut, Server, Save, User, Info, Sun, Moon } from 'lucide-react';
import { apiService } from '../services/api';
import { UserProfile } from '../types';
import { Theme } from '../App';

interface AppSettingsProps {
  currentUser: UserProfile;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onLogout: () => void;
}

export default function AppSettings({ currentUser, theme, onThemeChange, onLogout }: AppSettingsProps) {
  const [url, setUrl]   = useState(apiService.baseUrl);
  const [saved, setSaved] = useState(false);
  const isLight = theme === 'light';

  const card  = isLight ? 'bg-white border-slate-200'   : 'bg-zinc-900 border-zinc-800';
  const label = isLight ? 'text-slate-500'               : 'text-zinc-400';
  const val   = isLight ? 'text-slate-900'               : 'text-white';
  const input = isLight
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-red-500'
    : 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-red-500';

  const handleSaveUrl = () => {
    apiService.setBaseUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${isLight ? 'bg-slate-50' : 'bg-zinc-950'}`}>
      <div className={`border-b px-4 py-3 ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <h1 className={`text-base font-bold ${val}`}>Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Current user */}
        <div className={`border rounded-2xl p-4 flex items-center gap-3 ${card}`}>
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-800/30 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className={`font-semibold text-sm ${val}`}>{currentUser.name}</p>
            <p className={`text-xs font-mono ${label}`}>{currentUser.email}</p>
            <p className={`text-[10px] font-mono uppercase mt-0.5 ${label}`}>
              {currentUser.role} · {currentUser.department}
            </p>
          </div>
        </div>

        {/* Theme toggle */}
        <div className={`border rounded-2xl p-4 space-y-3 ${card}`}>
          <h2 className={`text-sm font-semibold ${val}`}>Appearance</h2>
          <div className="flex gap-2">
            <button
              onClick={() => onThemeChange('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition ${
                !isLight
                  ? 'bg-zinc-700 border-zinc-600 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button
              onClick={() => onThemeChange('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition ${
                isLight
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
          </div>
        </div>

        {/* Server URL */}
        <div className={`border rounded-2xl p-4 space-y-3 ${card}`}>
          <div className="flex items-center gap-2">
            <Server className={`w-4 h-4 ${label}`} />
            <h2 className={`text-sm font-semibold ${val}`}>Server URL</h2>
          </div>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://192.168.1.x:5184/api"
            className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition ${input}`}
          />
          <button
            onClick={handleSaveUrl}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold rounded-xl transition ${
              isLight ? 'bg-slate-700 hover:bg-slate-600' : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            {saved ? <><span className="text-emerald-400">✓</span> Saved!</> : <><Save className="w-4 h-4" /> Save URL</>}
          </button>
        </div>

        {/* App info */}
        <div className={`border rounded-2xl p-4 space-y-2 ${card}`}>
          <div className="flex items-center gap-2">
            <Info className={`w-4 h-4 ${label}`} />
            <h2 className={`text-sm font-semibold ${val}`}>About</h2>
          </div>
          <div className={`space-y-1.5 text-[11px] font-mono ${label}`}>
            {[
              ['App',        'Face Attendance System'],
              ['Version',    '1.0.0'],
              ['AI Engine',  'Genesis'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className={k === 'AI Engine' ? 'text-emerald-400' : val}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-950/50 hover:bg-red-900/50 border border-red-900/40 text-red-400 font-bold rounded-2xl text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
