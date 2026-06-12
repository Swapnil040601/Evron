import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message || error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-5 p-6 z-[999]">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <div className="text-center space-y-1">
            <p className="text-white font-bold font-mono text-sm">Something went wrong</p>
            <p className="text-zinc-500 font-mono text-[10px] max-w-xs">{this.state.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-mono text-xs uppercase tracking-wider"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tap to Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
