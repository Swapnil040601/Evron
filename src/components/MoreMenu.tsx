/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Utensils, Zap, Calendar, Settings as SettingsIcon, Flame, ShieldAlert, MonitorCheck, FileSpreadsheet, ArrowLeft, Smartphone } from 'lucide-react';

// Import subcomponents
import Canteen from './Canteen';
import Shifts from './Shifts';
import Holidays from './Holidays';
import Settings from './Settings';
import AdminStatus from './AdminStatus';
import Reports from './Reports';
import ProductivityComplianceHub from './ProductivityComplianceHub';

// Import Types
import { Employee, CanteenVisit, Shift, Holiday, SecurityEvent } from '../types';

interface MoreMenuProps {
  employees: Employee[];
  canteenVisits: CanteenVisit[];
  onAddCanteenVisit: (visit: CanteenVisit) => void;
  shifts: Shift[];
  holidays: Holiday[];
  securityEvents: SecurityEvent[];
  onAddSecurityEvent: (event: SecurityEvent) => void;
  activePreSelectedSubTool?: string | null;
  onClearPreSelectedTool?: () => void;
  onSyncData?: () => void;
  onTriggerAlert?: (detail: string, cameraName: string, status: 'critical' | 'warning' | 'info') => void;
  onLogout?: () => void;
}

export default function MoreMenu({
  employees,
  canteenVisits,
  onAddCanteenVisit,
  shifts,
  holidays,
  securityEvents,
  onAddSecurityEvent,
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

  // Define the 8 admin tools lists
  const toolsList = [
    {
      id: 'Canteen',
      name: 'Smart Canteen',
      desc: 'Meal timings & billing',
      icon: <Utensils className="w-5 h-5 text-emerald-400" />,
      tag: 'MEAL LABS'
    },
    {
      id: 'Shifts',
      name: 'Shift Schedules',
      desc: 'Grace periods & staff count',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      tag: 'ROSTERS'
    },
    {
      id: 'Holidays',
      name: 'Holidays Planner',
      desc: 'Annual scheduled leaves',
      icon: <Calendar className="w-5 h-5 text-blue-400" />,
      tag: 'EXEMPTIONS'
    },
    {
      id: 'Settings',
      name: 'Settings',
      desc: 'App parameters & SMTP configuration',
      icon: <SettingsIcon className="w-5 h-5 text-zinc-400" />,
      tag: 'PARAMS'
    },
    {
      id: 'Fire',
      name: 'Thermal / Fire',
      desc: 'Incident status screen & logs',
      icon: <Flame className="w-5 h-5 text-rose-500" />,
      tag: 'INCIDENTS'
    },
    {
      id: 'Secured',
      name: 'Secured Gates',
      desc: 'Portals lock state & access log',
      icon: <ShieldAlert className="w-5 h-5 text-teal-400" />,
      tag: 'BYPASS'
    },
    {
      id: 'Monitor',
      name: 'NVR / Monitor',
      desc: 'Bandwidth, CPU & storage pool',
      icon: <MonitorCheck className="w-5 h-5 text-violet-400" />,
      tag: 'HARDWARE'
    },
    {
      id: 'Reports',
      name: 'Reports Engine',
      desc: 'Excel and XLS summary reports',
      icon: <FileSpreadsheet className="w-5 h-5 text-pink-400" />,
      tag: 'EXPORT'
    },
    {
      id: 'Productivity',
      name: 'Productivity & AI',
      desc: 'GPS tracking, MDM app violation logs & AI camera rules',
      icon: <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />,
      tag: 'COMPLIANCE'
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
          BACK TO ADMIN TOOLS
        </button>

        <div className="bg-zinc-905 w-full">
          {activeTool === 'Canteen' && (
            <Canteen visits={canteenVisits} onAddVisit={onAddCanteenVisit} />
          )}

          {activeTool === 'Shifts' && (
            <Shifts shifts={shifts} />
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

          {activeTool === 'Secured' && (
            <AdminStatus mode="Secured" events={securityEvents} onAddEvent={onAddSecurityEvent} />
          )}

          {activeTool === 'Monitor' && (
            <AdminStatus mode="Monitor" events={securityEvents} onAddEvent={onAddSecurityEvent} />
          )}

          {activeTool === 'Reports' && (
            <Reports onSyncData={onSyncData} />
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
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Administrative Ecosystem</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Consolidated terminal utilities and auxiliary micro-services</p>
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
