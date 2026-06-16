/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogOut, Server, Save, User, ScanFace, Info } from 'lucide-react';
import { apiService } from '../services/api';
import { UserProfile } from '../types';

interface AppSettingsProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

export default function AppSettings({ currentUser, onLogout }: AppSettingsProps) {
  const [url, setUrl] = useState(apiService.baseUrl);
  const [saved, setSaved] = useState(false);

  const handleSaveUrl = () => {
    apiService.setBaseUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-y-auto">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <h1 className="text-base font-bold text-white">Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Current user */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-800/30 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{currentUser.name}</p>
            <p className="text-zinc-500 text-xs font-mono">{currentUser.email}</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase mt-0.5">{currentUser.role} · {currentUser.department}</p>
          </div>
        </div>

        {/* Server URL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Server URL</h2>
          </div>
          <p className="text-[11px] text-zinc-500">The API base URL for the backend server.</p>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://192.168.1.x:3000/api"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition"
          />
          <button
            onClick={handleSaveUrl}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition"
          >
            {saved ? <><span className="text-emerald-400">✓</span> Saved!</> : <><Save className="w-4 h-4" /> Save URL</>}
          </button>
        </div>

        {/* App info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">About</h2>
          </div>
          <div className="space-y-1.5 text-[11px] font-mono text-zinc-500">
            <div className="flex justify-between">
              <span>App</span>
              <span className="text-zinc-300">Face Attendance System</span>
            </div>
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-zinc-300">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>AI Engine</span>
              <span className="text-emerald-400">Connected</span>
            </div>
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
