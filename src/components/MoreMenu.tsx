/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Zap, Calendar, Settings as SettingsIcon, Flame, ShieldAlert, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import Shifts from './Shifts';
import Holidays from './Holidays';
import Settings from './Settings';
import AdminStatus from './AdminStatus';
import Reports from './Reports';
import ProductivityComplianceHub from './ProductivityComplianceHub';

// Import Types
import { Employee, Holiday, SecurityEvent, UserProfile } from '../types';

interface MoreMenuProps {
  employees: Employee[];
  holidays: Holiday[];
  securityEvents: SecurityEvent[];
  onAddSecurityEvent: (event: SecurityEvent) => void;
  currentUser: UserProfile;
  activePreSelectedSubTool?: string | null;
  onClearPreSelectedTool?: () => void;
  onSyncData?: () => void;
  onTriggerAlert?: (detail: string, cameraName: string, status: 'critical' | 'warning' | 'info') => void;
  onLogout?: () => void;
}

export default function MoreMenu({
  employees,
  holidays,
  securityEvents,
  onAddSecurityEvent,
  currentUser,
  activePreSelectedSubTool,
  onClearPreSelectedTool,
  onSyncData,
  onTriggerAlert,
  onLogout
}: MoreMenuProps) {
  // If parent pre-selected a sub-tool (from quick actions), mount it directly,
  // else use local select state.
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const activeTool = activePreSelectedSubTool || selectedTool;

  const handleBackToGrid = () => {
    if (activePreSelectedSubTool && onClearPreSelectedTool) {
      onClearPreSelectedTool();
    } else {
      setSelectedTool(null);
    }
  };

  const toolsList = [
    {
      id: 'Shifts',
      name: 'Shift Schedules',
      desc: 'Grace periods & staff count',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tag: 'SCHEDULES'
    },
    {
      id: 'Holidays',
      name: 'Holidays Planner',
      desc: 'Annual scheduled leaves',
      icon: <Calendar className="w-5 h-5 text-blue-400" />,
      tag: 'HOLIDAYS'
    },
    {
      id: 'Settings',
      name: 'Settings',
      desc: 'App settings & email setup',
      icon: <SettingsIcon className="w-5 h-5 text-zinc-400" />,
      tag: 'SETTINGS'
    },
    {
      id: 'Fire',
      name: 'Fire Alerts',
      desc: 'Fire and safety incident logs',
      icon: <Flame className="w-5 h-5 text-rose-500" />,
      tag: 'SAFETY'
    },
    {
      id: 'Reports',
      name: 'Reports',
      desc: 'Download attendance and expense reports',
      icon: <FileSpreadsheet className="w-5 h-5 text-pink-400" />,
      tag: 'EXPORT'
    },
    {
      id: 'Productivity',
      name: 'Productivity',
      desc: 'Location tracking, app monitoring & camera feed',
      icon: <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />,
      tag: 'TRACKING'
    }
  ];

  // RENDER CORRESPONDING TOOL CANVAS
  if (activeTool) {
    return (
      <div className="space-y-4" id="more-menu-subtool-viewport">
        {/* Back Link Row */}
        <button
          onClick={handleBackToGrid}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-900 rounded-lg text-xs font-mono text-zinc-400 hover:text-white transition"
          id="back-to-tools-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="bg-zinc-905 w-full">
          {activeTool === 'Shifts' && (
            <Shifts currentUser={currentUser} />
          )}

          {activeTool === 'Holidays' && (
            <Holidays holidays={holidays} />
          )}

          {activeTool === 'Settings' && (
            <Settings onLogout={onLogout} />
          )}

          {activeTool === 'Fire' && (
            <AdminStatus mode="Fire" events={securityEvents} onAddEvent={onAddSecurityEvent} />
          )}


          {activeTool === 'Reports' && (
            <Reports onSyncData={onSyncData} employees={employees} />
          )}

          {activeTool === 'Productivity' && (
            <ProductivityComplianceHub employees={employees} onTriggerAlert={onTriggerAlert} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" id="more-tools-grid-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Admin Tools</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">All admin tools in one place</p>
        </div>
      </div>

      {/* Grid of 8 Admin Tools */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="eight-admin-tools-grid">
        {toolsList.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className="group flex flex-col items-start bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700/80 p-5 rounded-xl text-left transition select-none hover:bg-zinc-900/70"
          >
            {/* Top row with icon & badge */}
            <div className="w-full flex items-center justify-between mb-4">
              <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-850 group-hover:bg-zinc-900 transition shrink-0">
                {tool.icon}
              </div>
              <span className="text-[8px] tracking-wider text-zinc-500 font-bold font-mono uppercase bg-zinc-950/80 px-1.5 py-0.5 rounded">
                {tool.tag}
              </span>
            </div>

            {/* Typography descriptors */}
            <h4 className="text-xs font-bold text-white uppercase tracking-tight group-hover:text-red-400 transition font-mono mb-1 leading-tight">
              {tool.name}
            </h4>
            <p className="text-[10px] text-zinc-400 font-sans leading-relaxed line-clamp-2">
              {tool.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
