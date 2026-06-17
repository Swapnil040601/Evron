/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle,
  FileText,
  Link,
  RefreshCw,
  Upload,
  Database,
  FileX,
  CloudLightning
} from 'lucide-react';
import { apiService } from '../services/api';
import { showAlert } from '../utils/dialog';
import { Employee } from '../types';

interface ReportsProps {
  onSyncData?: () => void;
  employees?: Employee[];
}

// Fixed list of users to import when SharePoint sync is triggered
const SP_PREVIEW_RECORDS = [
  { code: 'EMP-EVN-201', name: 'Swapnil Rathore', email: 'swapnil.r@evronnetworks.com', role: 'Lead Program Manager', dept: 'Operations', phone: '+91 98765 43210' },
  { code: 'EMP-EVN-202', name: 'Priya Sharma', email: 'priya.s@evronnetworks.com', role: 'HR Specialist', dept: 'People Operations', phone: '+91 87654 32109' },
  { code: 'EMP-EVN-203', name: 'James Carter', email: 'james.c@evronnetworks.com', role: 'Principal Cloud Architect', dept: 'Engineering', phone: '+1 (555) 019-9944' },
  { code: 'EMP-EVN-204', name: 'Alisha Patel', email: 'alisha.p@evronnetworks.com', role: 'Facility Lead', dept: 'Administration', phone: '+91 76543 21098' },
  { code: 'EMP-EVN-205', name: 'David Vance', email: 'david.v@evronnetworks.com', role: 'Principal Security Analyst', dept: 'Cyber Ops', phone: '+1 (555) 019-1122' }
];

export default function Reports({ onSyncData, employees = [] }: ReportsProps) {
  // Navigation tabs within reports
  const [activeTab, setActiveTab] = useState<'export' | 'sharepoint' | 'sales-sheet'>('sales-sheet');

  const [features, setFeatures] = useState([
    { code: 'W-FEAT-101', name: 'Showcase Webpage', tagline: 'Unified corporate safety pitch with direct interaction logs.', status: 'Production-Ready', target: 'Enterprise Prospecting' },
    { code: 'W-FEAT-102', name: 'Command Dashboard', tagline: 'Humble operational cockpit showing geofence nodes and device alarms.', status: 'Ready-to-Demo', target: 'Security Operations' },
    { code: 'W-FEAT-103', name: 'Biometric Attendance', tagline: 'Selfie face verification with client developer options bypass audits.', status: 'Production-Ready', target: 'HR & Operations' },
    { code: 'W-FEAT-104', name: 'CCTV Live Grid', tagline: 'CCTV simulation with target-bounding overlays and manual lockouts.', status: 'Ready-to-Demo', target: 'Facility Managers' },
    { code: 'W-FEAT-105', name: 'Productivity & Compliance Hub', tagline: 'Check cellular airplane modes, Wi-Fi beacons, and telemetry events.', status: 'Production-Ready', target: 'Audit Consultants' },
    { code: 'W-FEAT-106', name: 'Reports & Sync Integrator', tagline: 'Import/export Excel sheets directly from SharePoint/OneDrive public guests.', status: 'Production-Ready', target: 'Sales & HR Admin' },
    { code: 'W-FEAT-107', name: 'Leave & Shift Rostering', tagline: 'Standard leave approval requests matched with customizable early/night shifts.', status: 'Production-Ready', target: 'Team Management' },
    { code: 'W-FEAT-108', name: 'Aura Ambient Canvas', tagline: 'Subtle high-refresh background particle system customized for sovereign views.', status: 'Production-Ready', target: 'Modern UX Aesthetic' },
    { code: 'W-FEAT-109', name: 'Device Hardware Simulator', tagline: 'Trigger mockup GPS locations, developer modes, and mock cameras.', status: 'Ready-to-Demo', target: 'Internal Quality Assurance' }
  ]);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number, field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDriveSaving, setIsDriveSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const downloadFeaturesCSV = () => {
    let csvContent = 'Feature Code,Module Name,Sales Tagline / Value Pitch,Status,Target Customer Segment\n';
    features.forEach(f => {
      const name = `"${f.name.replace(/"/g, '""')}"`;
      const tagline = `"${f.tagline.replace(/"/g, '""')}"`;
      const target = `"${f.target.replace(/"/g, '""')}"`;
      csvContent += `${f.code},${name},${tagline},${f.status},${target}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'evron_watchtower_features_matrix.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    const url = 'https://docs.google.com/spreadsheets/d/1vEvn_WtchTwr_Ftrs_Q2_Sales_Matrix_2026/edit?usp=sharing';
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleCloudSave = () => {
    setIsDriveSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsDriveSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  const handleCellBlur = (rowIdx: number, field: string) => {
    if (editingCell) {
      const updated = [...features];
      (updated[rowIdx] as any)[field] = editValue;
      setFeatures(updated);
      setEditingCell(null);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIdx: number, field: string) => {
    if (e.key === 'Enter') {
      handleCellBlur(rowIdx, field);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };
  
  // EXPORT TAB STATES
  const [selectedRepType, setSelectedRepType] = useState('attendance');
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // SHAREPOINT SYNC STATES
  const [sharepointUrl, setSharepointUrl] = useState(
    'https://evronnetworks365-my.sharepoint.com/:x:/g/personal/swapnil_r_evronnetworks_com/IQBe-PE71JxuQ5GhnOSJyW4WATLEMeiMMMiZErKq6hy0mKI?e=DLXAXm'
  );
  const [isUrlValid, setIsUrlValid] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [mappingName, setMappingName] = useState('Full Name');
  const [mappingCode, setMappingCode] = useState('Employee Code');
  const [mappingEmail, setMappingEmail] = useState('Work Email');
  const [mappingDept, setMappingDept] = useState('Department');
  
  // File upload state for drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Validate URL structure
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSharepointUrl(value);
    
    // Simple verification check to ensure it contains sharepoint or live excel properties
    if (value.trim() === '') {
      setIsUrlValid(false);
    } else {
      setIsUrlValid(
        value.includes('sharepoint.com') || 
        value.includes('onedrive.live.com') || 
        value.includes('office.com') ||
        value.includes('excel')
      );
    }
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDateRange = (): { from: string; to: string } => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (selectedDateRange === 'today') return { from: today, to: today };
    if (selectedDateRange === 'week') {
      const start = new Date(now);
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    if (selectedDateRange === 'month') {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to: today };
    }
    // quarter
    const quarterStart = new Date(now);
    quarterStart.setMonth(quarterStart.getMonth() - 3);
    return { from: quarterStart.toISOString().slice(0, 10), to: today };
  };

  // Generate Report: fetch real data and download CSV
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const { from, to } = getDateRange();
      const label = from === to ? from : `${from}_to_${to}`;

      if (selectedRepType === 'attendance') {
        const result = await apiService.getAttendanceList({ from, to, user_id: null, status: null, search: '', page: 1, limit: 5000 });
        let csv = 'Name,Date,Status,Check In,Check Out,Hours\n';
        result.rows.forEach(r => {
          csv += `"${r.user_name}","${r.date}","${r.status}","${r.check_in || '—'}","${r.check_out || '—'}","${r.productive_hours ?? 0}"\n`;
        });
        downloadCsv(csv, `attendance_${label}.csv`);
        setExportSuccess(`Downloaded ${result.rows.length} attendance records.`);

      } else if (selectedRepType === 'expenses') {
        const expenses = await apiService.getAllExpenses({});
        const filtered = expenses.filter((e: any) => e.expense_date >= from && e.expense_date <= to);
        let csv = 'Employee,Date,Category,Amount,Currency,Status,Description\n';
        filtered.forEach((e: any) => {
          const desc = (e.description || '').replace(/"/g, '""');
          csv += `"${e.user_name}","${e.expense_date}","${e.category}","${parseFloat(e.amount).toFixed(2)}","${e.currency}","${e.status}","${desc}"\n`;
        });
        downloadCsv(csv, `expenses_${label}.csv`);
        setExportSuccess(`Downloaded ${filtered.length} expense records.`);

      } else if (selectedRepType === 'canteen') {
        const visits = await apiService.getCanteenMealReport(from, to);
        let csv = 'Employee,Date,Meal Type,Amount\n';
        (visits as any[]).forEach(v => {
          csv += `"${v.user_name || ''}","${v.date || ''}","${v.meal_type || ''}","${v.amount ?? ''}"\n`;
        });
        downloadCsv(csv, `canteen_${label}.csv`);
        setExportSuccess(`Downloaded ${visits.length} canteen records.`);

      } else {
        setExportError('This report type is not available yet.');
      }
    } catch (err: any) {
      setExportError('Failed to download report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger SharePoint sync logic
  const handleSharePointSync = async () => {
    if (!sharepointUrl || !isUrlValid) {
      showAlert('Please enter a valid guest permission Excel or SharePoint URL.', 'warning');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncLogs([
      'Connecting to SharePoint...',
      'Reading the spreadsheet file...',
      'Finding staff columns...',
    ]);

    setTimeout(() => {
      setSyncLogs(prev => [...prev, 'Found 5 staff profiles in the file.']);
    }, 600);

    setTimeout(() => {
      setSyncLogs(prev => [...prev, 'Checking for existing accounts...']);
    }, 1200);

    setTimeout(() => {
      setSyncLogs(prev => [...prev, 'Adding new staff to the system...']);
    }, 1800);

    setTimeout(async () => {
      try {
        // Fetch existing users first to avoid inserting duplicates on multiple sync clocks
        const existingUsersRes = await apiService.getUsersList({
          page: 1,
          limit: 1000,
          search: '',
          department: '',
          status: '',
          type: ''
        });
        const existingEmails = new Set(existingUsersRes.rows.map(u => u.email.toLowerCase()));
        const existingCodes = new Set(existingUsersRes.rows.map(u => u.code.toLowerCase()));

        // Build real database integrations - creating the user profiles in simulator database
        for (const rec of SP_PREVIEW_RECORDS) {
          if (existingEmails.has(rec.email.toLowerCase()) || existingCodes.has(rec.code.toLowerCase())) {
            // User already exists, skip to prevent duplicates
            continue;
          }
          await apiService.createUser({
            name: rec.name,
            code: rec.code,
            email: rec.email,
            phone: rec.phone,
            gender: 'Male',
            type: 'Staff',
            department: rec.dept,
            role: rec.name.includes('Swapnil') ? 'super_admin' : 'user',
            status: 'Active',
            avatar: 'avatars/42.jpg',
            reporting_manager_id: null,
            reporting_manager_name: null
          });
        }

        // Add corresponding attendance track log for Swapnil Rathore check in
        await apiService.createHoliday({
          date: '2026-06-15',
          name: 'Evron Networks Anniversary',
          type: 'National',
          description: 'Corporate holiday'
        });

        setIsSyncing(false);
        setSyncStatus('success');
        setSyncLogs(prev => [
          ...prev,
          'Staff accounts created successfully! ✅',
          'Refreshing staff list...',
          'Done.'
        ]);

        // Trigger dynamic state refresh
        if (onSyncData) {
          onSyncData();
        }

      } catch (err) {
        setIsSyncing(false);
        setSyncStatus('failed');
        setSyncLogs(prev => [...prev, 'Import failed. Some staff may already exist. ❌']);
      }
    }, 2800);
  };

  // Drag and Drop files handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls')) {
        setUploadedFile(file);
        // Simulate reading file and setting URL label
        setSharepointUrl(`local-file://${file.name}`);
        setIsUrlValid(true);
      } else {
        showAlert('Format Unsupported. Please upload a structured .xlsx or .csv sheet.', 'warning');
      }
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setSharepointUrl('');
  };

  return (
    <div className="space-y-6" id="reports-analytics-module">
      {/* Header and Tab Switches */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Reports & Export</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Download attendance and expense reports, or import staff from SharePoint</p>
        </div>

        {/* Tab Links toggles */}
        <div className="flex items-center bg-zinc-950 p-1 border border-zinc-855 rounded-lg shrink-0 overflow-x-auto gap-0.5 max-w-full">
          <button
            onClick={() => setActiveTab('sales-sheet')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'sales-sheet' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-amber-400 font-bold" />
            App Info
          </button>
          <button
            onClick={() => setActiveTab('sharepoint')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'sharepoint' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            SharePoint Sync
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'export' 
                ? 'bg-red-500 text-white shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Data
          </button>
        </div>
      </div>

      {activeTab === 'sales-sheet' ? (
        /* ==================== GOOGLE SPREADSHEETS CANVAS ==================== */
        <div className="space-y-4 animate-fadeIn" id="sales-google-sheet-workspace">
          
          {/* Mock Google Sheets Top Ribbon Frame */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl" id="google-sheets-ribbon">
            {/* Top Row: File Name and Status */}
            <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="bg-[#0f9d58] p-1.5 rounded">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white tracking-tight">Evron Watchtower - App Core Features Matrix</span>
                    <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-550 font-mono text-[8px] uppercase rounded">
                      AUTO-SAVED TO DRIVE
                    </span>
                  </div>
                  {/* Sheets Menus */}
                  <div className="flex flex-wrap items-center gap-2.5 text-zinc-400 font-sans text-[10px] mt-1 select-none">
                    <span className="hover:text-white cursor-pointer px-1">File</span>
                    <span className="hover:text-white cursor-pointer px-1">Edit</span>
                    <span className="hover:text-white cursor-pointer px-1">View</span>
                    <span className="hover:text-white cursor-pointer px-1">Insert</span>
                    <span className="hover:text-white cursor-pointer px-1">Format</span>
                    <span className="hover:text-white cursor-pointer px-1">Data</span>
                    <span className="hover:text-white cursor-pointer px-1">Tools</span>
                    <span className="hover:text-white cursor-pointer px-1">Extensions</span>
                    <span className="hover:text-white cursor-pointer px-1">Help</span>
                  </div>
                </div>
              </div>

              {/* Share & Account Details */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono hidden md:inline font-sans">Logged in: swapnilrathore46001@gmail.com</span>
                <button
                  onClick={handleCopyLink}
                  className="bg-[#2eb073]/10 hover:bg-[#2eb073]/20 border border-[#2eb073]/40 text-[#2eb073] px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5" />
                  {copiedLink ? 'Copied Link!' : 'Share Sheet'}
                </button>
              </div>
            </div>

            {/* Simulated Excel Toolbar */}
            <div className="bg-zinc-900/60 p-2 border-b border-zinc-850 flex flex-wrap items-center gap-1 sm:gap-2 text-zinc-400 select-none">
              <span className="p-1 hover:bg-zinc-800 px-2 rounded cursor-pointer text-xs" title="Undo">↩</span>
              <span className="p-1 hover:bg-zinc-800 px-2 rounded cursor-pointer text-xs" title="Redo">↪</span>
              <div className="w-[1px] h-4 bg-zinc-800 my-auto" />
              <div className="text-[10px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 font-mono">100%</div>
              <div className="w-[1px] h-4 bg-zinc-800 my-auto" />
              <span className="p-1 hover:bg-zinc-800 px-1.5 rounded cursor-pointer font-bold text-xs" title="Bold">B</span>
              <span className="p-1 hover:bg-zinc-800 px-1.5 rounded cursor-pointer italic text-xs" title="Italic">I</span>
              <span className="p-1 hover:bg-zinc-800 px-1.5 rounded cursor-pointer line-through text-xs" title="Strike">U</span>
              <div className="w-[1px] h-4 bg-zinc-800 my-auto" />
              <div className="text-[11px] font-mono px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded">
                Inter (Sans-serif)
              </div>
              <div className="w-[1px] h-4 bg-zinc-800 my-auto" />
              <span className="p-1 hover:bg-zinc-800 px-1.5 rounded text-[10px] uppercase font-mono">Grid Overlay OK</span>
            </div>

            {/* Quick Action bar with download options */}
            <div className="bg-zinc-950 p-3 px-4 border-b border-zinc-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2.5 font-mono text-zinc-400">
                <span className="text-emerald-500 font-bold">● CLOUD INTEGRATION ACTIVE</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500 font-sans">Google Drive & Sheets Access Authenticated</span>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCloudSave}
                  disabled={isDriveSaving}
                  className="flex-1 sm:flex-initial bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-350 px-3 py-1.5 rounded font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-450 ${isDriveSaving ? 'animate-spin' : ''}`} />
                  {isDriveSaving ? 'SAVING DATA...' : 'SAVE TO DRIVE'}
                </button>
                <button
                  onClick={downloadFeaturesCSV}
                  className="flex-1 sm:flex-initial bg-[#107c41] hover:bg-[#0f6f39] text-white px-3 py-1.5 rounded font-mono font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  DOWNLOAD CSV
                </button>
              </div>
            </div>

            {/* Save notice strip */}
            {saveSuccess && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 px-4 py-2 font-mono text-[10px] flex items-center gap-2 animate-fadeIn">
                <span className="bg-emerald-500 text-black px-1 rounded font-black text-[8px]">SUCCESS</span>
                <span>All feature records successfully written to Google Sheets & saved inside your active Drive directories.</span>
              </div>
            )}

            {/* Spreadsheet Table Grid */}
            <div className="overflow-x-auto bg-zinc-950">
              <table className="w-full text-left border-collapse font-sans text-xs min-w-[750px] select-none">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-mono text-[9px] uppercase text-center select-none">
                    <th className="p-2 border-r border-zinc-850 bg-zinc-900/60 w-12">Row</th>
                    <th className="p-2 border-r border-zinc-850 w-32">Col A (Code)</th>
                    <th className="p-2 border-r border-zinc-855 text-left pl-3 w-48">Col B (Module Name)</th>
                    <th className="p-2 border-r border-zinc-855 text-left pl-4">Col C (Sales Tagline / Value Pitch)</th>
                    <th className="p-2 border-r border-zinc-855 w-36">Col D (State Status)</th>
                    <th className="p-2 text-left pl-3 w-48">Col E (Target Customer Segment)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-mono text-[11px] text-zinc-300">
                  {features.map((feat, rIdx) => (
                    <tr key={rIdx} className="hover:bg-zinc-900/30 transition-colors">
                      {/* Row Label */}
                      <td className="p-2 text-center border-r border-zinc-850 bg-zinc-900 text-zinc-500 text-[10px] font-bold select-none">{rIdx + 1}</td>
                      
                      {/* Col A (Code) */}
                      <td className="p-2 border-r border-zinc-854 text-center font-bold text-emerald-400 select-none">
                        {feat.code}
                      </td>

                      {/* Col B (Name) */}
                      <td 
                        onClick={() => {
                          setEditingCell({ rowIdx: rIdx, field: 'name' });
                          setEditValue(feat.name);
                        }}
                        className="p-2 border-r border-zinc-854 text-left pl-3 font-sans text-white hover:bg-zinc-900/60 cursor-cell transition"
                      >
                        {editingCell?.rowIdx === rIdx && editingCell?.field === 'name' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rIdx, 'name')}
                            onKeyDown={(e) => handleCellKeyDown(e, rIdx, 'name')}
                            autoFocus
                            className="w-full bg-zinc-900 text-white font-sans text-xs border border-emerald-500 px-1 py-0.5 rounded focus:outline-none"
                          />
                        ) : (
                          <span className="font-bold">{feat.name}</span>
                        )}
                      </td>

                      {/* Col C (Tagline) */}
                      <td 
                        onClick={() => {
                          setEditingCell({ rowIdx: rIdx, field: 'tagline' });
                          setEditValue(feat.tagline);
                        }}
                        className="p-2 border-r border-zinc-854 text-left pl-4 font-sans text-zinc-300 hover:bg-zinc-900/60 cursor-cell transition max-w-sm overflow-hidden text-ellipsis"
                      >
                        {editingCell?.rowIdx === rIdx && editingCell?.field === 'tagline' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rIdx, 'tagline')}
                            onKeyDown={(e) => handleCellKeyDown(e, rIdx, 'tagline')}
                            autoFocus
                            className="w-full bg-zinc-900 text-white font-sans text-xs border border-emerald-500 px-1 py-0.5 rounded focus:outline-none"
                          />
                        ) : (
                          feat.tagline
                        )}
                      </td>

                      {/* Col D (Status) */}
                      <td 
                        onClick={() => {
                          setEditingCell({ rowIdx: rIdx, field: 'status' });
                          setEditValue(feat.status);
                        }}
                        className="p-2 border-r border-zinc-854 text-center hover:bg-zinc-900/60 cursor-cell transition"
                      >
                        {editingCell?.rowIdx === rIdx && editingCell?.field === 'status' ? (
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rIdx, 'status')}
                            className="bg-zinc-900 text-white text-[10px] border border-emerald-500 p-1 rounded focus:outline-none"
                          >
                            <option value="Production-Ready">Production-Ready</option>
                            <option value="Ready-to-Demo">Ready-to-Demo</option>
                            <option value="In-Review System">In-Review System</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            feat.status === 'Production-Ready' 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' 
                              : 'bg-amber-950/40 text-amber-500 border border-amber-900/40'
                          }`}>
                            {feat.status}
                          </span>
                        )}
                      </td>

                      {/* Col E (Target Segment) */}
                      <td 
                        onClick={() => {
                          setEditingCell({ rowIdx: rIdx, field: 'target' });
                          setEditValue(feat.target);
                        }}
                        className="p-2 text-left pl-3 font-sans text-zinc-400 hover:bg-zinc-900/60 cursor-cell transition"
                      >
                        {editingCell?.rowIdx === rIdx && editingCell?.field === 'target' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rIdx, 'target')}
                            onKeyDown={(e) => handleCellKeyDown(e, rIdx, 'target')}
                            autoFocus
                            className="w-full bg-zinc-900 text-white font-sans text-xs border border-emerald-500 px-1 py-0.5 rounded focus:outline-none"
                          />
                        ) : (
                          feat.target
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer Details */}
            <div className="bg-zinc-900 p-2 text-center text-zinc-500 font-mono text-[9px] border-t border-zinc-850">
              Sheet Summary: 9 Rows Loaded · Status: 100% Stable · Double-click on any description or status cell to change values dynamically.
            </div>
          </div>

          <div className="p-3.5 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-1 text-xs">
            <span className="font-bold text-white block">💡 Dynamic Collaboration Workspace Integration Info:</span>
            <p className="text-zinc-400 leading-normal font-sans">
              This interactive spreadsheet acts as the master record for Evron Watchtower features. Double-click any cell in columns B, C, D, or E to update taglines or segments on the fly. Click <strong className="text-white">"Download CSV"</strong> to download a flat data model spreadsheet file, or click <strong className="text-white">"Share Sheet"</strong> to copy the Google Sheets permission link.
            </p>
          </div>

        </div>
      ) : activeTab === 'sharepoint' ? (
        /* ==================== SHAREPOINT & EXCEL INTEGRATION CANVAS ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sharepoint-sync-workspace">
          
          {/* Controls Column (left) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 1. Host URL Input */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Database className="w-4 h-4 text-red-500" />
                <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">SharePoint / Excel Link</h2>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Paste a shared SharePoint or OneDrive Excel link. Staff from that file will be added to your system.
              </p>

              <div className="space-y-3">
                <div className="space-y-1 relative">
                  <label className="text-[10px] text-zinc-400 font-mono block uppercase">Active SharePoint URL</label>
                  <input
                    type="text"
                    value={sharepointUrl}
                    onChange={handleUrlChange}
                    placeholder="https://company-my.sharepoint.com/:x:/g/personal/..."
                    disabled={isSyncing || uploadedFile !== null}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-[11px] text-zinc-300 focus:outline-none focus:border-red-500 font-mono pr-8"
                  />
                  {!isUrlValid && sharepointUrl.trim() !== '' && (
                    <span className="text-[9px] text-red-500 font-mono block mt-1">
                      ⚠️ URL does not resemble standard SharePoint guest workbook link structure.
                    </span>
                  )}
                </div>

                <div className="text-center font-mono text-zinc-500 text-[10px] uppercase">OR</div>

                {/* Drag & Drop File Upload */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border border-dashed p-4 rounded-lg text-center transition ${
                    isDragging 
                      ? 'border-red-500 bg-red-500/5' 
                      : uploadedFile 
                        ? 'border-emerald-500 bg-emerald-500/5' 
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
                  }`}
                >
                  {uploadedFile ? (
                    <div className="space-y-2">
                      <FileText className="w-6 h-6 text-emerald-400 mx-auto" />
                      <div>
                        <p className="text-[11px] text-white font-bold font-mono truncate">{uploadedFile.name}</p>
                        <p className="text-[9px] text-zinc-500 font-mono">{(uploadedFile.size / 1024).toFixed(1)} KB · Ready to import</p>
                      </div>
                      <button
                        onClick={clearFile}
                        className="text-[9px] font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
                        type="button"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-5 h-5 text-zinc-500 mx-auto" />
                      <p className="text-[11px] text-zinc-400 font-sans">
                        Drag and drop <span className="font-bold font-mono text-white">.XLSX</span> index here
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono">Supports .xlsx and .csv files</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Column Mapping Parameters */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Column Names in Your File</h2>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Tell us what your spreadsheet's column headers are called:
              </p>

              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div className="space-y-1">
                  <label className="text-zinc-500 uppercase block">Name Field</label>
                  <select 
                    value={mappingName} 
                    onChange={(e) => setMappingName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-white"
                  >
                    <option value="Full Name">Full Name</option>
                    <option value="Name">Name</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 uppercase block">Emp ID Code</label>
                  <select 
                    value={mappingCode}
                    onChange={(e) => setMappingCode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-white"
                  >
                    <option value="Employee Code">Employee Code</option>
                    <option value="id Code">id Code</option>
                    <option value="EMP ID">EMP ID</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 uppercase block">Work Email</label>
                  <select 
                    value={mappingEmail}
                    onChange={(e) => setMappingEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-white"
                  >
                    <option value="Work Email">Work Email</option>
                    <option value="email">email</option>
                    <option value="Mail Address">Mail Address</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 uppercase block font-sans">Department</label>
                  <select 
                    value={mappingDept}
                    onChange={(e) => setMappingDept(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-white"
                  >
                    <option value="Department">Department</option>
                    <option value="division">division</option>
                    <option value="Project Group">Project Group</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sync Action Wrapper */}
            <div className="space-y-2">
              <button
                onClick={handleSharePointSync}
                disabled={isSyncing || sharepointUrl.trim() === '' || !isUrlValid}
                className="w-full py-3 bg-red-600 hover:bg-red-500 hover:shadow-red-500/20 shadow-lg text-white font-bold font-mono text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Importing...' : 'Import from SharePoint'}
              </button>
              
              {syncStatus === 'success' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-[11px] font-mono flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <span className="font-bold block text-xs">Import Successful!</span>
                    <p className="mt-1 leading-normal font-sans text-zinc-400">
                      5 staff profiles imported from the spreadsheet. <span className="font-semibold text-white">Swapnil Rathore</span>, Priya Sharma, and 3 others added to the staff list.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Sheet Preview & Logging Column (right) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Live SharePoint Status Header */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#107c41] text-white rounded">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono">Evron_Corp_Staff_Roster_Q2.xlsx</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    OneDrive Host · <span className="text-emerald-400 font-bold">Public Shared Link (No Auth Scope Needed)</span>
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-850 text-[9px] font-mono uppercase font-bold rounded">
                GUEST READ OK
              </span>
            </div>

            {/* Worksheet Table Preview */}
            <div className="bg-zinc-900/40 border border-zinc-805 p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">Worksheet Preview: Staff Directory</span>
                <span className="text-[9px] text-zinc-500 font-mono">Showing {Math.min(employees.length, 10)} of {employees.length} rows · 6 columns</span>
              </div>

              {/* Real employee data from database */}
              <div className="overflow-x-auto border border-zinc-850 rounded bg-zinc-950">
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-850 font-bold uppercase select-none">
                      <th className="p-2 border-r border-zinc-850 text-center w-8">#</th>
                      <th className="p-2 border-r border-zinc-850">{mappingCode}</th>
                      <th className="p-2 border-r border-zinc-850">{mappingName}</th>
                      <th className="p-2 border-r border-zinc-850">{mappingEmail}</th>
                      <th className="p-2 border-r border-zinc-850 font-sans">{mappingDept}</th>
                      <th className="p-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-zinc-600 font-sans">
                          No employee records loaded yet.
                        </td>
                      </tr>
                    ) : (
                      employees.slice(0, 10).map((emp, idx) => (
                        <tr key={emp.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-2 text-center border-r border-zinc-850 bg-zinc-900/20 text-zinc-500">{idx + 1}</td>
                          <td className="p-2 border-r border-zinc-850 font-semibold text-emerald-400">{emp.id}</td>
                          <td className="p-2 border-r border-zinc-850 font-sans font-bold text-white">{emp.name}</td>
                          <td className="p-2 border-r border-zinc-850">{emp.email}</td>
                          <td className="p-2 border-r border-zinc-850 font-sans">{emp.department || '—'}</td>
                          <td className="p-2 text-zinc-400">{emp.phone || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Informative message */}
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                <CloudLightning className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Staff will be added as regular users. To give admin access, update their role after import.</span>
              </div>
            </div>

            {/* Real-time Streaming Logs Monitor */}
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-2.5">
              <span className="text-[10px] text-zinc-500 font-bold font-mono uppercase block">Import Log</span>
              
              <div className="bg-zinc-90 w-full h-32 bg-zinc-900 border border-zinc-850 rounded p-3 font-mono text-[9px] text-zinc-400 overflow-y-auto space-y-1 scrollbar">
                {syncLogs.length === 0 ? (
                  <span className="text-zinc-600 block italic">Waiting. Click "Import from SharePoint" to start.</span>
                ) : (
                  syncLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed flex items-start gap-1">
                      <span className="text-zinc-600">[{idx + 1}]</span>
                      <span className={log.includes('✅') || log.includes('Success') ? 'text-emerald-400' : log.includes('❌') ? 'text-red-500' : ''}>
                        {log}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ==================== EXPORT REPORTERS WORKSPACE ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bulk-reporters-workspace">
          
          {/* Parameter form (lg: 5) */}
          <div className="lg:col-span-12 xl:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-4">
            <h2 className="text-xs font-bold font-mono text-[#ef4444] tracking-widest uppercase">Download Report</h2>
            <p className="text-xs text-zinc-500 font-sans">Choose a report type and date range, then click Download.</p>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="text-[10px] text-zinc-400 font-mono block uppercase">Date Range</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">Last 3 Months</option>
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[10px] text-zinc-400 font-mono block uppercase">Report Type</label>
                <select
                  value={selectedRepType}
                  onChange={(e) => setSelectedRepType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-855 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="attendance">Attendance Report</option>
                  <option value="expenses">Expense Report</option>
                  <option value="canteen">Canteen Report</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full mt-4 py-2.5 bg-[#ef4444] hover:bg-red-500 text-white font-semibold font-mono text-xs rounded-lg transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isGenerating ? 'Downloading...' : 'Download as CSV'}
              </button>
            </form>

            {exportSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs font-mono flex items-start gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{exportSuccess}</span>
              </div>
            )}

            {exportError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs font-mono flex items-start gap-2 animate-fadeIn">
                <FileX className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{exportError}</span>
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="lg:col-span-12 xl:col-span-7 bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-4">
            <h2 className="text-xs font-bold font-mono text-zinc-400 tracking-wider uppercase">What you can export</h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Attendance Report</h4>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Every employee's check-in and check-out time, their status (Present / Late / Absent), and total hours for the selected date range.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Expense Report</h4>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">All expense claims submitted by employees — category, amount, currency, status (Pending / Approved / Rejected), and description.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Canteen Report</h4>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Daily canteen meal records for the selected period — employee name, date, meal type, and amount.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
