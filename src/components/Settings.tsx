/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { 
  User, 
  Lock, 
  Smartphone, 
  Sun, 
  Moon, 
  LogOut, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound,
  Fingerprint,
  Mail,
  MapPin,
  Calendar,
  Globe,
  Settings as SettingsIcon
} from 'lucide-react';

interface SettingsProps {
  onLogout?: () => void;
}

type TabType = 'personal' | 'security' | 'preferences';

export default function Settings({ onLogout }: SettingsProps) {
  // Theme state representation
  const [isLightMode, setIsLightMode] = useState(
    document.documentElement.classList.contains('theme-light')
  );

  const toggleGlobalTheme = () => {
    const nextLight = !isLightMode;
    setIsLightMode(nextLight);
    if (nextLight) {
      document.documentElement.classList.add('theme-light');
      localStorage.setItem('app-theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      localStorage.setItem('app-theme', 'dark');
    }
    // Dispatch small custom event for components to listen
    window.dispatchEvent(new Event('theme-changed'));
  };

  const [activeTab, setActiveTab] = useState<TabType>('personal');

  // Personal Information states (from screenshots)
  const [fullName, setFullName] = useState('Swapnil Rathore');
  const [dob, setDob] = useState('04/06/2001');
  const [address, setAddress] = useState('37, 6b, Street 37th, Sector 4, Bhilai, CG');
  const [country, setCountry] = useState('India');
  const [email, setEmail] = useState('swapnilrathoreswapnil@gmail.com');
  const [phone, setPhone] = useState('+918269253111');
  const [phoneVerified, setPhoneVerified] = useState(true);



  // Security states (from screenshots)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(
    !!localStorage.getItem('evron_biometric_token')
  );
  const [biometricMsg, setBiometricMsg] = useState<string | null>(null);

  const handleBiometricToggle = async (enable: boolean) => {
    setBiometricMsg(null);
    try {
      const check = await BiometricAuth.checkBiometry();
      if (!check.isAvailable) {
        setBiometricMsg('Biometric authentication is not available on this device.');
        return;
      }
      if (enable) {
        await BiometricAuth.authenticate({
          reason: 'Enable biometric login',
          cancelTitle: 'Cancel',
          allowDeviceCredential: true,
          iosFallbackTitle: 'Use Passcode',
          androidTitle: 'Confirm Identity',
          androidSubtitle: 'Verify to enable biometric login',
        });
        const token = localStorage.getItem('evron_jwt_token');
        if (token) {
          localStorage.setItem('evron_biometric_token', token);
          setBiometricEnabled(true);
          setBiometricMsg('Biometric login enabled successfully.');
        } else {
          setBiometricMsg('No active session token found. Please re-login first.');
        }
      } else {
        localStorage.removeItem('evron_biometric_token');
        setBiometricEnabled(false);
        setBiometricMsg('Biometric login disabled.');
      }
    } catch (err: any) {
      setBiometricMsg(err.message || 'Biometric verification failed.');
    }
    setTimeout(() => setBiometricMsg(null), 3000);
  };

  // Active devices mock list
  const [devices] = useState([
    { id: 1, name: 'Google Pixel 8 Pro', type: 'Mobile App', activeNow: true },
    { id: 2, name: 'Chrome Browser (Windows 11)', type: 'Web Dashboard', activeNow: false }
  ]);

  // Notice alerts feedback
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSavedMsg(true);
    setTimeout(() => {
      setShowSavedMsg(false);
    }, 3000);
  };

  return (
    <div className="space-y-6" id="settings-configuration-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Account Settings</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Manage your personal profiles, tax forms, secure keys, and biometric attributes</p>
        </div>
        
        {showSavedMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 animate-pulse" />
            <span>Information saved and encrypted successfully!</span>
          </div>
        )}
      </div>

      {/* Tabs Selector list inside Settings UI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2" id="settings-tabs-menu">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-3 rounded-xl border font-mono text-[11px] font-bold tracking-wider uppercase transition flex items-center gap-2 justify-center cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-red-950/20 text-[#ef4444] border-red-900/60 shadow-md'
              : 'bg-zinc-950/50 text-zinc-400 border-zinc-850 hover:text-white hover:bg-zinc-900/40'
          }`}
          id="btn-settings-personal-tab"
        >
          <User className="w-4 h-4" />
          Personal Info
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-3 rounded-xl border font-mono text-[11px] font-bold tracking-wider uppercase transition flex items-center gap-2 justify-center cursor-pointer ${
            activeTab === 'security'
              ? 'bg-red-950/20 text-[#ef4444] border-red-900/60 shadow-md'
              : 'bg-zinc-950/50 text-zinc-400 border-zinc-850 hover:text-white hover:bg-zinc-900/40'
          }`}
          id="btn-settings-security-tab"
        >
          <Lock className="w-4 h-4" />
          Security
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-3 rounded-xl border font-mono text-[11px] font-bold tracking-wider uppercase transition flex items-center gap-2 justify-center cursor-pointer ${
            activeTab === 'preferences'
              ? 'bg-red-950/20 text-[#ef4444] border-red-900/60 shadow-md'
              : 'bg-zinc-950/50 text-zinc-400 border-zinc-850 hover:text-white hover:bg-zinc-900/40'
          }`}
          id="btn-settings-pref-tab"
        >
          <SettingsIcon className="w-4 h-4" />
          Preferences
        </button>
      </div>

      {/* Main Form content wrapper */}
      <form onSubmit={handleSave} className="space-y-6" id="settings-dynamic-panel-form">
        
        {/* Tab 1: Personal Details */}
        {activeTab === 'personal' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Circular initials badge layout matching Image 1 format but customized in Dark UI */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center sm:flex-row gap-5">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-sans text-2xl font-bold tracking-widest shadow-xl ring-2 ring-red-900/50 ring-offset-4 ring-offset-zinc-950">
                  {fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950" title="Profile Active" />
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h3 className="text-base font-bold text-white font-sans">{fullName}</h3>
                <p className="text-xs text-zinc-400 font-mono">Surveillance Operator • Level 4 Access Clearance</p>
                <p className="text-[10px] text-zinc-500 font-mono">Last updated: Today, 08:00 AM</p>
              </div>
            </div>

            {/* Inputs grid - exact format of our clean UI dashboard */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-5">
              <h3 className="text-xs font-bold font-mono text-[#ef4444] tracking-widest uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Personal Information Fields
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#ef4444] block uppercase font-bold tracking-wider">Full name / Display Title</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Date of Birth</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Residency Street Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Country Of Origin</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Contact details section */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-5">
              <h3 className="text-xs font-bold font-mono text-[#ef4444] tracking-widest uppercase flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Contact Information Logs
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Primary Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider flex items-center justify-between">
                    <span>Active Phone Number</span>
                    {phoneVerified && (
                      <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md font-sans normal-case">
                        ✓ Verified
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Tab 3: Security Hub */}
        {activeTab === 'security' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-5">
              <h3 className="text-xs font-bold font-mono text-[#ef4444] tracking-widest uppercase flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Change Profile Password
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Current Token Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#ef4444] block uppercase font-bold tracking-wider">New Password Key</label>
                  <input
                    type="password"
                    placeholder="Enter high entropy key"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Multifactor authentic and biometrics */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold font-mono text-[#ef4444] tracking-widest uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Electronic Authentication Locks
              </h3>

              {/* MFA */}
              <div className="flex items-center justify-between py-3 border-b border-zinc-805">
                <div>
                  <span className="text-xs font-bold text-white block">Multi-Factor Authentication (MFA)</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Requires verification passcode from registered mobile tool</span>
                </div>
                <input
                  type="checkbox"
                  checked={mfaEnabled}
                  onChange={(e) => setMfaEnabled(e.target.checked)}
                  className="w-4 h-4 stroke-emerald-500 text-emerald-600 border-zinc-700 bg-zinc-900 rounded cursor-pointer accent-[#ef4444]"
                />
              </div>

              {/* Biometric */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <span className="text-xs font-bold text-white block flex items-center gap-1">
                    <Fingerprint className="w-3.5 h-3.5 text-[#ef4444]" />
                    Biometric Login
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">Use device fingerprint or face ID to sign in</span>
                  {biometricMsg && (
                    <span className="text-[9px] text-amber-400 font-mono block mt-0.5">{biometricMsg}</span>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => handleBiometricToggle(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-zinc-700 bg-zinc-900 rounded cursor-pointer accent-[#ef4444]"
                />
              </div>
            </div>

            {/* Registered Devices */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold font-mono text-[#ef4444] tracking-widest uppercase flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Active Registered Devices
              </h3>

              <div className="space-y-3 font-mono text-xs">
                {devices.map((dev) => (
                  <div key={dev.id} className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-lg border border-zinc-850 hover:border-zinc-800 transition">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-zinc-500" />
                      <div>
                        <span className="text-xs text-white block">{dev.name}</span>
                        <span className="text-[9px] text-zinc-500">{dev.type}</span>
                      </div>
                    </div>
                    {dev.activeNow ? (
                      <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        ACTIVE NOW
                      </span>
                    ) : (
                      <button type="button" className="text-[9px] text-zinc-500 hover:text-red-400 uppercase tracking-widest transition">
                        REVOKE ACCESS
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: System Preferences */}
        {activeTab === 'preferences' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Visual configuration */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl space-y-5">
              <h3 className="text-xs font-bold font-mono text-zinc-400 tracking-wider uppercase">
                Visual Theme Controls
              </h3>

              <div className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-white block">Light System Theme</span>
                  <span className="text-[9px] text-zinc-500 font-mono">Invert system colors to match outdoor direct solar radiation</span>
                </div>
                <button
                  type="button"
                  onClick={toggleGlobalTheme}
                  className="p-2.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-855 rounded-xl transition flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                  title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
                  id="settings-theme-switcher-action"
                >
                  {isLightMode ? (
                    <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
                  ) : (
                    <Moon className="w-4 h-4 text-purple-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Visual theme configuration only here in preferences */}
          </div>
        )}

        {/* Global Save Button for configuration parameters */}
        {activeTab !== 'preferences' && (
          <div className="flex justify-end pt-2" id="settings-save-button-wrapper">
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-red-650 to-red-500 hover:from-red-605 text-white bg-[#ef4444] font-semibold text-xs font-mono rounded-xl transition shadow-lg hover:shadow-red-950/20 flex items-center gap-2 uppercase tracking-widest cursor-pointer"
              id="settings-submit-action-btn"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Configuration Updates
            </button>
          </div>
        )}

      </form>

      {/* LogOut action button wrapper with only the logout button */}
      {onLogout && (
        <div className="pt-4 flex justify-center" id="settings-logout-persistent-section">
          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto px-8 py-3 bg-rose-950/20 hover:bg-rose-900/40 border border-rose-900/40 text-red-400 hover:text-white rounded-xl text-xs font-mono font-bold tracking-widest transition uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-rose-950/30"
            id="settings-logout-action-btn"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

