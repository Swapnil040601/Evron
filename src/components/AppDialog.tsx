import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, HelpCircle, Info } from 'lucide-react';
import { _registerDialogSetter, DialogRequest } from '../utils/dialog';

export default function AppDialog() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);

  useEffect(() => {
    _registerDialogSetter(setQueue);
    return () => { _registerDialogSetter(null); };
  }, []);

  const current = queue[0];
  if (!current) return null;

  const handleResolve = (value: boolean) => {
    current.resolve(value);
    setQueue(q => q.slice(1));
  };

  const iconMap = {
    error:   <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div>,
    warning: <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-amber-400" /></div>,
    success: <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-emerald-400" /></div>,
    info:    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center"><Info className="w-6 h-6 text-blue-400" /></div>,
  };

  const confirmIcon = <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center"><HelpCircle className="w-6 h-6 text-amber-400" /></div>;
  const icon = current.type === 'confirm' ? confirmIcon : iconMap[current.variant ?? 'info'];

  const btnColor = current.type === 'confirm'
    ? 'bg-red-600 hover:bg-red-500 active:bg-red-700'
    : current.variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-500'
      : current.variant === 'error'
        ? 'bg-red-600 hover:bg-red-500'
        : 'bg-zinc-700 hover:bg-zinc-600';

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl"
        style={{ animation: 'dialogIn 0.15s ease-out' }}
      >
        <style>{`@keyframes dialogIn { from { opacity:0; transform:scale(0.93) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

        <div className="px-6 pt-7 pb-5 flex flex-col items-center gap-4 text-center">
          {icon}
          <p className="text-sm text-zinc-100 font-mono leading-relaxed">{current.message}</p>
        </div>

        <div className="px-5 pb-6 flex gap-3">
          {current.type === 'confirm' && (
            <button
              onClick={() => handleResolve(false)}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 rounded-xl text-zinc-300 font-mono text-xs uppercase tracking-widest transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => handleResolve(true)}
            className={`flex-1 py-3 ${btnColor} rounded-xl text-white font-mono text-xs uppercase tracking-widest font-bold transition`}
          >
            {current.type === 'confirm' ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
