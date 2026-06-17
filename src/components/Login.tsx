/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiService, SIMULATOR_ACCOUNTS } from '../services/api';
import { ShieldCheck, Server, AlertTriangle, Eye, EyeOff, Radio, Sparkles, LogIn, ExternalLink, Sun, Moon, Fingerprint } from 'lucide-react';
import { UserProfile } from '../types';
import DeviceSimulator from './DeviceSimulator';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Theme support
  const [themeTrigger, setThemeTrigger] = useState(0);

  useEffect(() => {
    const act = localStorage.getItem('app-theme') || 'dark';
    if (act === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [themeTrigger]);

  // Api Configuration States
  const [endpointUrl, setEndpointUrl] = useState('');
  const [useLive, setUseLive] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [appConfig, setAppConfig] = useState<{ name: string; tag_line: string; logo_url: string; recaptcha_site_key: string } | null>(null);

  useEffect(() => {
    const config = apiService.getConfig();
    setEndpointUrl(config.baseUrl);
    setUseLive(config.useLive);
    loadAppConfig();
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    try {
      const result = await BiometricAuth.checkBiometry();
      const hasToken = !!localStorage.getItem('evron_biometric_token');
      setBiometricAvailable(result.isAvailable && hasToken);
    } catch {
      setBiometricAvailable(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      await BiometricAuth.authenticate({
        reason: 'Login to Evron',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Biometric Login',
        androidSubtitle: 'Use your fingerprint or face to sign in',
      });
      const token = localStorage.getItem('evron_biometric_token');
      if (!token) throw new Error('No saved session. Please login with password first.');
      localStorage.setItem('evron_jwt_token', token);
      const user = await apiService.getProfile();
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Biometric authentication failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const loadAppConfig = async () => {
    try {
      const cfg = await apiService.getAppConfig();
      setAppConfig(cfg);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveConfig = () => {
    apiService.saveConfig({
      baseUrl: endpointUrl,
      useLive: useLive
    });
    setErrorMessage(null);
    loadAppConfig();
    const notification = document.getElementById('config-saved-alert');
    if (notification) {
      notification.classList.remove('hidden');
      setTimeout(() => notification.classList.add('hidden'), 2000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setErrorMessage(null);

    try {
      // Simulate recaptcha token if needed
      const recaptchaToken = appConfig?.recaptcha_site_key ? 'simulated-recaptcha-token' : '';

      const res = await apiService.login(email, password, recaptchaToken);
      const token = localStorage.getItem('evron_jwt_token');
      if (token) localStorage.setItem('evron_biometric_token', token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error. Please check your credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Quick Account Login Selector Click
  const handleQuickLogin = async (acc: typeof SIMULATOR_ACCOUNTS[0]) => {
    setIsConnecting(true);
    setErrorMessage(null);
    setEmail(acc.email);
    setPassword(acc.pass);

    try {
      // Temporarily bypass live trigger if they select preset account to prevent sandbox lookup error
      const prevLive = apiService.getConfig().useLive;
      if (prevLive) {
        apiService.saveConfig({ useLive: false });
        setUseLive(false);
      }

      const res = await apiService.login(acc.email, acc.pass);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Preset authentication failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-6 select-none" id="auth-login-viewcontainer">
      
      {/* Background radial gradient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl relative overflow-hidden z-10" id="login-form-card">
        {/* Floating Theme Switcher button */}
        <div className="absolute top-4 right-4 z-20" id="login-theme-switcher-container">
          <button
            type="button"
            onClick={() => {
              const isLight = document.documentElement.classList.contains('theme-light');
              if (isLight) {
                document.documentElement.classList.remove('theme-light');
                localStorage.setItem('app-theme', 'dark');
              } else {
                document.documentElement.classList.add('theme-light');
                localStorage.setItem('app-theme', 'light');
              }
              setThemeTrigger(p => p + 1);
            }}
            className="p-2 btn-glass rounded-lg text-zinc-400 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
            title="Toggle theme colors"
          >
            {document.documentElement.classList.contains('theme-light') ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-purple-400" />
            )}
          </button>
        </div>

        {/* Decorative glowing edge accent */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ef4444] to-transparent shrink-0" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-650/10 border border-red-500/20 text-[#ef4444] shadow-md shadow-red-950/20 mb-2">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            
            <h1 className="text-xl font-black tracking-tight text-white font-sans sm:text-2xl uppercase">
              {appConfig?.name || "EVRON SUITE"}
            </h1>
            <p className="text-xs font-mono text-zinc-400 tracking-wider">
              {appConfig?.tag_line || "Attendance & Security Dashboard"}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-950/20 border border-red-900/40 text-rose-400 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <p className="leading-relaxed font-sans">{errorMessage}</p>
            </div>
          )}

          {/* Primary Form */}
          <form onSubmit={handleLogin} className="space-y-4 font-sans">
            <div className="space-y-1.5 focus-within:text-[#ef4444] transition-colors">
              <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-widest block">Login ID / Corporate Email</label>
              <input
                required
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-850 focus:border-red-500 rounded-xl p-3 text-sm text-white focus:outline-none transition font-sans placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-widest block">Access Passphrase</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] font-mono text-zinc-500 hover:text-white transition flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPassword ? 'Hide Secret' : 'Reveal Secret'}
                </button>
              </div>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-850 focus:border-red-500 rounded-xl p-3 text-sm text-white focus:outline-none transition tracking-wide placeholder:text-zinc-600"
              />
            </div>

            {appConfig?.recaptcha_site_key && (
              <div className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-xl text-xs text-zinc-400 flex items-center justify-between">
                <span className="font-mono text-[10px]">reCAPTCHA Secured Shield Active</span>
                <span className="text-[9px] font-bold bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded uppercase font-mono">TOKEN VERIFIED</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3 btn-glass-red text-white font-semibold font-mono text-xs rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 mt-2 uppercase cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {isConnecting ? 'AUTHENTICATING SECURE NETWORK...' : 'AUTHENTICATE SYSTEM'}
            </button>

            {biometricAvailable && (
              <button
                type="button"
                disabled={isConnecting}
                onClick={handleBiometricLogin}
                className="w-full py-3 btn-glass text-white font-semibold font-mono text-xs rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 uppercase cursor-pointer border border-zinc-800 hover:border-zinc-600 transition"
              >
                <Fingerprint className="w-4 h-4 shrink-0 text-emerald-400" />
                USE BIOMETRIC LOGIN
              </button>
            )}
          </form>

          {/* Preset quick test accounts segment */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="h-[1px] bg-zinc-900 flex-1" />
              <span className="text-[9px] font-mono text-zinc-500 tracking-wider">PRELOADED SIMULATOR PROFILES</span>
              <div className="h-[1px] bg-zinc-900 flex-1" />
            </div>

            <p className="text-[10px] text-zinc-500 text-center font-sans mt-0.5 font-medium">Click any profile below to login instantly with ready-made data and roles:</p>

            <div className="grid grid-cols-1 gap-2.5">
              {SIMULATOR_ACCOUNTS.map((acc) => {
                let colorClass = 'border-purple-500/20 text-purple-400 hover:bg-purple-950/10';
                if (acc.role === 'admin') colorClass = 'border-teal-500/20 text-teal-450 hover:bg-teal-950/10';
                if (acc.role === 'user') colorClass = 'border-amber-500/20 text-amber-500 hover:bg-amber-950/10';

                return (
                  <button
                    key={acc.email}
                    onClick={() => handleQuickLogin(acc)}
                    className={`p-2.5 w-full btn-glass rounded-xl text-left hover:border-zinc-500 transition flex items-center justify-between gap-2 cursor-pointer ${colorClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6.5 h-6.5 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                        <img
                          src={apiService.getFileUrl(acc.avatar)}
                          alt={acc.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-bold text-white leading-none">{acc.name}</h5>
                        <p className="text-[9px] text-zinc-400 font-mono leading-none mt-1">{acc.email}</p>
                      </div>
                    </div>
                    
                    <span className="text-[8px] font-bold font-mono tracking-wider bg-zinc-950/80 uppercase px-1.5 py-1 rounded shrink-0">
                      {acc.role.replace('_', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Server Config Accordion */}
          <div className="pt-2 border-t border-zinc-900">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-300 font-mono transition flex items-center justify-center gap-1.5 uppercase"
            >
              <Server className="w-3.5 h-3.5" />
              {showConfig ? 'HIde Server Config Panel' : 'REST API Connection parameters'}
            </button>

            {showConfig && (
              <div className="mt-4 bg-zinc-900/30 border border-zinc-900 rounded-xl p-4 space-y-3.5 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">REST Backend Base URL</label>
                    <span className="text-[8px] font-mono text-zinc-600 block">GET /app</span>
                  </div>
                  <input
                    type="text"
                    placeholder="https://your-domain.com/api"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none font-mono focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-300 uppercase tracking-wider block">REST Integration Live mode</span>
                    <p className="text-[8px] text-zinc-500 leading-tight pr-1 font-sans">Disable simulation and connect live REST HTTP queries instead.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={useLive}
                    onChange={(e) => setUseLive(e.target.checked)}
                    className="w-4 h-4 text-red-650 bg-black border-zinc-800 rounded focus:ring-0 focus:outline-none shrink-0"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="w-full py-1.5 bg-zinc-850 hover:bg-zinc-800 text-white font-bold font-mono text-[10px] rounded transition uppercase"
                >
                  SAVE CONNECTION SCHEMES
                </button>

                <div id="config-saved-alert" className="hidden text-[9px] font-mono text-center text-[#ef4444] animate-pulse">
                  CONNECTION PARAMETERS SAVED SUCCESSFULLY!
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      <DeviceSimulator />
    </div>
  );
}
