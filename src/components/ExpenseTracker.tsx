/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  IndianRupee
} from 'lucide-react';
import { apiService } from '../services/api';
import { UserProfile } from '../types';

interface ExpenseTrackerProps {
  currentUser: UserProfile;
}

const CATEGORIES = [
  'Travel',
  'Meals & Food',
  'Accommodation',
  'Office Supplies',
  'Client Entertainment',
  'Training & Education',
  'Medical',
  'Communication',
  'Other'
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

const STATUS_STYLES: Record<string, string> = {
  Pending:  'bg-amber-500/10 text-amber-400 border-amber-500/25',
  Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  Rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/25'
};

const today = () => new Date().toISOString().slice(0, 10);

function GpsCheckBadge({ expense }: { expense: any }) {
  const claimedKm = expense.category === 'Travel'
    ? parseFloat(expense.description?.match(/(\d+(?:\.\d+)?)\s*km/i)?.[1] || '0')
    : null;

  const gpsWalkKm = expense.gps_walk_km != null
    ? parseFloat(expense.gps_walk_km)
    : null;

  if (claimedKm == null || claimedKm === 0) {
    return (
      <span className="text-[9px] font-mono text-zinc-600 italic">No km in description</span>
    );
  }
  if (gpsWalkKm == null) {
    return (
      <span className="text-[9px] font-mono text-zinc-500 italic">No GPS data for this date</span>
    );
  }

  const diff = claimedKm - gpsWalkKm;
  const suspicious = diff > 2;

  return (
    <div className={`flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded border w-fit ${
      suspicious
        ? 'bg-red-950/40 text-red-400 border-red-900/50'
        : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
    }`}>
      <MapPin className="w-3 h-3 shrink-0" />
      {suspicious
        ? `⚠ Claimed ${claimedKm} km · GPS tracked ${gpsWalkKm.toFixed(1)} km`
        : `✓ GPS verified ${gpsWalkKm.toFixed(1)} km walked`
      }
    </div>
  );
}

export default function ExpenseTracker({ currentUser }: ExpenseTrackerProps) {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [expenseDate, setExpenseDate] = useState(today());
  const [description, setDescription] = useState('');

  // Admin review state
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = isAdmin
        ? await apiService.getAllExpenses(statusFilter ? { status: statusFilter } : {})
        : await apiService.getMyExpenses();
      setExpenses(data);
    } catch {
      setMsg({ type: 'err', text: 'Failed to load expenses.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setMsg({ type: 'err', text: 'Enter a valid amount.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiService.submitExpense({
        category,
        amount: parseFloat(amount),
        currency,
        expense_date: expenseDate,
        description: description.trim() || undefined
      });
      setMsg({ type: 'ok', text: 'Expense submitted successfully.' });
      setShowForm(false);
      setAmount('');
      setDescription('');
      setExpenseDate(today());
      load();
    } catch {
      setMsg({ type: 'err', text: 'Failed to submit expense. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await apiService.updateExpenseStatus(id, status, adminNote);
      setReviewingId(null);
      setAdminNote('');
      load();
    } catch {
      setMsg({ type: 'err', text: 'Failed to update status.' });
    }
  };

  const pendingCount = expenses.filter(e => e.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-red-500" />
            Expense Tracker
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            {isAdmin
              ? `${expenses.length} total · ${pendingCount} pending review`
              : 'Submit and track your expense claims'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-red-500"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          )}

          <button
            onClick={load}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {!isAdmin && (
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              New Expense
            </button>
          )}
        </div>
      </div>

      {/* Notification */}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-mono border ${
          msg.type === 'ok'
            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
            : 'bg-rose-950/30 text-rose-400 border-rose-900/40'
        }`}>
          {msg.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Submit Form */}
      {!isAdmin && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-500" />
            Submit Expense
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase block">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-red-500"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase block">Date</label>
              <input
                type="date"
                value={expenseDate}
                max={today()}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase block">Amount</label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-sm text-white px-2 py-2 rounded-lg font-mono focus:outline-none focus:border-red-500"
                >
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-sm text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="text-[10px] text-zinc-500 font-mono uppercase block">
                Description
                {category === 'Travel' && (
                  <span className="text-amber-500 ml-1">(include distance e.g. "25 km to airport")</span>
                )}
              </label>
              <input
                type="text"
                placeholder={category === 'Travel' ? '25 km to client site' : 'Brief description'}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold font-mono rounded-lg transition"
            >
              {submitting ? 'Submitting…' : 'Submit Expense'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-sm font-mono rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Expenses List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-zinc-500 font-mono text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
          Loading expenses…
        </div>
      ) : expenses.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 font-mono text-xs">
          {isAdmin ? 'No expense claims found.' : 'No expenses yet. Submit your first claim.'}
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => {
            const isExpanded = expandedId === exp.id;
            const isReviewing = reviewingId === exp.id;

            return (
              <div
                key={exp.id}
                className={`bg-zinc-900/40 border rounded-xl overflow-hidden transition ${
                  exp.status === 'Pending'
                    ? 'border-amber-900/40'
                    : exp.status === 'Approved'
                    ? 'border-emerald-900/40'
                    : 'border-rose-900/30'
                }`}
              >
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    exp.status === 'Pending' ? 'bg-amber-400' :
                    exp.status === 'Approved' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAdmin && (
                        <span className="text-xs font-bold text-white">{exp.user_name}</span>
                      )}
                      <span className="text-xs text-zinc-300 font-mono">{exp.category}</span>
                      <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${STATUS_STYLES[exp.status] || ''}`}>
                        {exp.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-zinc-500 font-mono">{exp.expense_date}</span>
                      {exp.description && (
                        <span className="text-[10px] text-zinc-500 truncate">{exp.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-white font-mono">
                      {exp.currency} {parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/60 pt-3">
                    {/* GPS cross-check (always show for travel, show for all if admin) */}
                    {(exp.category === 'Travel' || isAdmin) && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 font-mono uppercase block">GPS Verification</span>
                        <GpsCheckBadge expense={exp} />
                        {exp.gps_walk_km != null && (
                          <p className="text-[9px] text-zinc-600 font-mono">
                            GPS walk distance at submission: {parseFloat(exp.gps_walk_km).toFixed(2)} km
                          </p>
                        )}
                        {exp.current_gps_walk_m != null && (
                          <p className="text-[9px] text-zinc-600 font-mono">
                            Current GPS distance today: {(exp.current_gps_walk_m / 1000).toFixed(2)} km
                            {exp.gps_updated_at && ` (last updated ${new Date(exp.gps_updated_at).toLocaleTimeString()})`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Admin note if any */}
                    {exp.admin_note && (
                      <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-850">
                        <span className="text-[9px] text-zinc-500 font-mono uppercase block mb-1">Admin Note</span>
                        <p className="text-xs text-zinc-300">{exp.admin_note}</p>
                        {exp.reviewed_by_name && (
                          <p className="text-[9px] text-zinc-600 font-mono mt-1">
                            Reviewed by {exp.reviewed_by_name} · {exp.reviewed_at ? new Date(exp.reviewed_at).toLocaleString() : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Admin review actions */}
                    {isAdmin && exp.status === 'Pending' && (
                      <div className="space-y-2">
                        {isReviewing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Optional note to employee…"
                              value={adminNote}
                              onChange={e => setAdminNote(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-red-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReview(exp.id, 'Approved')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold font-mono rounded-lg transition"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleReview(exp.id, 'Rejected')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold font-mono rounded-lg transition"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                              <button
                                onClick={() => { setReviewingId(null); setAdminNote(''); }}
                                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono rounded-lg transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewingId(exp.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white text-xs font-mono rounded-lg transition"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Review This Claim
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
