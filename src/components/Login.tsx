/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { apiService, SIMULATOR_ACCOUNTS } from '../services/api';
import { ShieldCheck, AlertTriangle, Eye, EyeOff, LogIn, Sun, Moon, Fingerprint } from 'lucide-react';
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

  const [themeTrigger, setThemeTrigger] = useState(0);

  useEffect(() => {
    const act = localStorage.getItem('app-theme') || 'dark';
    if (act === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [themeTrigger]);

  useEffect(() => {
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
        androidTitle: 'Fingerprint Login',
        androidSubtitle: 'Use your fingerprint or face to login',
      });
      const token = localStorage.getItem('evron_biometric_token');
      if (!token) throw new Error('No saved login. Please login with your password first.');
      localStorage.setItem('evron_jwt_token', token);
      const user = await apiService.getProfile();
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Fingerprint login failed. Please use your password.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const res = await apiService.login(email, password);
      const token = localStorage.getItem('evron_jwt_token');
      if (token) localStorage.setItem('evron_biometric_token', token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Wrong email or password. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQuickLogin = async (acc: typeof SIMULATOR_ACCOUNTS[0]) => {
    setIsConnecting(true);
    setErrorMessage(null);
    setEmail(acc.email);
    setPassword(acc.pass);
    try {
      const res = await apiService.login(acc.email, acc.pass);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-6 select-none" id="auth-login-viewcontainer">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl relative overflow-hidden z-10" id="login-form-card">

        {/* Theme toggle */}
        <div className="absolute top-4 right-4 z-20">
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
            className="p-2 btn-glass rounded-lg text-zinc-400 hover:text-white transition flex items-center justify-center cursor-pointer"
          >
            {document.documentElement.classList.contains('theme-light')
              ? <Sun className="w-4 h-4 text-amber-500" />
              : <Moon className="w-4 h-4 text-purple-400" />
            }
          </button>
        </div>

        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ef4444] to-transparent" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-650/10 border border-red-500/20 text-[#ef4444] shadow-md shadow-red-950/20 mb-2">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white font-sans sm:text-2xl uppercase">
              EVRON
            </h1>
            <p className="text-xs text-zinc-400">
              Attendance & Security System
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-red-950/20 border border-red-900/40 text-rose-400 rounded-xl text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-zinc-300 block">Email</label>
              <input
                required
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800 focus:border-red-500 rounded-xl p-3 text-sm text-white focus:outline-none transition placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-zinc-300 block">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800 focus:border-red-500 rounded-xl p-3 pr-20 text-sm text-white focus:outline-none transition placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white transition flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-3.5 btn-glass-red text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              <LogIn className="w-5 h-5 shrink-0" />
              {isConnecting ? 'Logging in...' : 'Login'}
            </button>

            {biometricAvailable && (
              <button
                type="button"
                disabled={isConnecting}
                onClick={handleBiometricLogin}
                className="w-full py-3 btn-glass text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer border border-zinc-800 hover:border-zinc-600 transition"
              >
                <Fingerprint className="w-5 h-5 shrink-0 text-emerald-400" />
                Use Fingerprint
              </button>
            )}
          </form>

          {/* Quick login profiles */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="h-[1px] bg-zinc-900 flex-1" />
              <span className="text-xs text-zinc-500">Quick Login</span>
              <div className="h-[1px] bg-zinc-900 flex-1" />
            </div>

            <p className="text-xs text-zinc-500 text-center">Tap a name below to login:</p>

            <div className="grid grid-cols-1 gap-2">
              {SIMULATOR_ACCOUNTS.map((acc) => {
                let colorClass = 'border-purple-500/20 text-purple-400 hover:bg-purple-950/10';
                if (acc.role === 'admin') colorClass = 'border-teal-500/20 text-teal-450 hover:bg-teal-950/10';
                if (acc.role === 'user') colorClass = 'border-amber-500/20 text-amber-500 hover:bg-amber-950/10';

                const roleLabel = acc.role === 'super_admin' ? 'Super Admin' : acc.role === 'admin' ? 'Admin' : 'Employee';

                return (
                  <button
                    key={acc.email}
                    onClick={() => handleQuickLogin(acc)}
                    className={`p-3 w-full btn-glass rounded-xl text-left hover:border-zinc-500 transition flex items-center justify-between gap-2 cursor-pointer ${colorClass}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                        <img
                          src={apiService.getFileUrl(acc.avatar)}
                          alt={acc.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white leading-none">{acc.name}</h5>
                        <p className="text-xs text-zinc-400 leading-none mt-1">{acc.email}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-zinc-950/80 px-2 py-1 rounded shrink-0 text-zinc-300">
                      {roleLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>


        </div>
      </div>
      <DeviceSimulator />
    </div>
  );
}
