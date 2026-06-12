/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LeaveRequest } from '../types';
import { CheckCircle, XCircle, Clock, CalendarRange, UserCheck, ShieldAlert } from 'lucide-react';

interface LeaveApprovalsProps {
  leaveRequests: LeaveRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function LeaveApprovals({ leaveRequests, onApprove, onReject }: LeaveApprovalsProps) {
  const pendingRequests = leaveRequests.filter(req => req.status === 'Pending');
  const pastRequests = leaveRequests.filter(req => req.status !== 'Pending');

  return (
    <div className="space-y-6" id="leave-approvals-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Leave Registry & Approvals</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Process requests and manage employee attendance exclusions</p>
        </div>
      </div>

      {/* Grid: Pending Queue vs History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pending Requests Column (lg: 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-wider text-[#ef4444] font-mono uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Pending Leave Queue ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-semibold text-zinc-200">All caught up!</h4>
              <p className="text-xs text-zinc-500 font-mono">No pending leave requests found waiting in review queue.</p>
            </div>
          ) : (
            <div className="space-y-4" id="pending-leave-cards">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl space-y-3 hover:border-zinc-700 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-tight">{req.employeeName}</h3>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{req.role} · <span className="text-zinc-500">{req.department}</span></p>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-zinc-950 font-semibold font-mono text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded">
                        ID: {req.id}
                      </span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-bold">
                        {req.leaveType.toUpperCase()} LEAVE
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <CalendarRange className="w-4 h-4 text-zinc-500" />
                      <span>Duration: <strong className="text-white font-mono">{req.startDate}</strong> to <strong className="text-white font-mono">{req.endDate}</strong></span>
                    </div>
                    
                    {/* Explicit Leave Reason */}
                    <div className="bg-zinc-950/80 rounded-lg p-3 border border-zinc-850">
                      <span className="text-[9px] font-mono tracking-wider text-zinc-500 block uppercase mb-1">Stated Reason:</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans italic">
                        "{req.reason}"
                      </p>
                    </div>
                  </div>

                  {/* Approval Actions Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => onReject(req.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/30 text-rose-300 border border-rose-800/40 text-xs font-semibold rounded-lg transition font-mono"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      REJECT
                    </button>
                    <button
                      onClick={() => onApprove(req.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow font-mono"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      APPROVE & LOG
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historic logs / Past Requests Review Column (lg: 4) */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-bold tracking-wider text-zinc-400 font-mono uppercase pb-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            Verification History
          </h2>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
            {pastRequests.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono text-center py-6">
                No archived requests resolved currently in this cycle.
              </p>
            ) : (
              pastRequests.map((req) => {
                const isApproved = req.status === 'Approved';
                return (
                  <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 font-sans">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{req.employeeName}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-400 font-mono mb-1">
                      <span>{req.leaveType} Leave</span>
                      <span>{req.startDate}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate italic">"{req.reason}"</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
