/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CanteenVisit } from '../types';
import { Utensils, Coffee, Clock, Heart, PlusCircle, Search } from 'lucide-react';

interface CanteenProps {
  visits: CanteenVisit[];
  onAddVisit: (visit: CanteenVisit) => void;
}

export default function Canteen({ visits, onAddVisit }: CanteenProps) {
  const [mealFilter, setMealFilter] = useState<'All' | 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'>('All');
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorItem, setNewVisitorItem] = useState('');
  const [newVisitorMeal, setNewVisitorMeal] = useState<'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'>('Lunch');

  const filteredVisits = visits.filter(visit => {
    return mealFilter === 'All' || visit.mealType === mealFilter;
  });

  // Calculate dynamic stats
  const totalMealscans = visits.length;
  const breakfastCount = visits.filter(v => v.mealType === 'Breakfast').length;
  const lunchCount = visits.filter(v => v.mealType === 'Lunch').length;
  const snacksCount = visits.filter(v => v.mealType === 'Snacks').length;

  const handleSimulateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitorName || !newVisitorItem) { return; }

    const newVisit: CanteenVisit = {
      id: `CAN00${visits.length + 1}`,
      employeeName: newVisitorName,
      department: 'Engineering',
      item: newVisitorItem,
      time: '02:15 PM',
      mealType: newVisitorMeal
    };

    onAddVisit(newVisit);
    setNewVisitorName('');
    setNewVisitorItem('');
  };

  return (
    <div className="space-y-6" id="canteen-log-module">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Smart Canteen Monitors</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Biometric billing scanners & daily nutrition telemetry</p>
        </div>
      </div>

      {/* Canteen Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-white" id="canteen-stats-grid">
        <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wide uppercase block">Total Meals Tracked</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400 mt-1 block">{totalMealscans}</span>
          </div>
          <Utensils className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wide uppercase block">Breakfast Scanned</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-blue-400 mt-1 block">{breakfastCount}</span>
          </div>
          <Coffee className="w-5 h-5 text-blue-400" />
        </div>

        <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wide uppercase block">Lunch Scanned</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-amber-500 mt-1 block">{lunchCount}</span>
          </div>
          <Utensils className="w-5 h-5 text-amber-500" />
        </div>

        <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono tracking-wide uppercase block">Snacks / Breaks</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-indigo-400 mt-1 block">{snacksCount}</span>
          </div>
          <Clock className="w-5 h-5 text-indigo-400" />
        </div>
      </div>

      {/* Main split: Transaction list AND simulator trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Transaction log column (lg: 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-bold font-mono tracking-wider text-[#ef4444] uppercase">Visits history log ({filteredVisits.length})</h2>
            
            {/* Filter */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850">
              {(['All', 'Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const).map(meal => (
                <button
                  key={meal}
                  onClick={() => setMealFilter(meal)}
                  className={`px-3 py-1 text-[10px] font-mono rounded font-semibold transition ${
                    mealFilter === meal 
                      ? 'bg-[#ef4444] text-white shadow' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-850">
                    <th className="py-2.5 px-4 font-normal">Employee Subject</th>
                    <th className="py-2.5 px-4 font-normal">Department</th>
                    <th className="py-2.5 px-4 font-normal">Item scanned</th>
                    <th className="py-2.5 px-4 font-normal">Time stamp</th>
                    <th className="py-2.5 px-4 font-normal">Timing block</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                  {filteredVisits.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-2.5 px-4 text-white font-semibold">
                        {item.employeeName}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400 bg-zinc-900/10">
                        {item.department}
                      </td>
                      <td className="py-2.5 px-4 italic text-zinc-300">
                        {item.item}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500">
                        {item.time}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-500/20 px-2 py-0.5 rounded">
                          {item.mealType.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Simulation Billing Panel (lg: 4) */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-bold font-mono text-zinc-400 tracking-wider uppercase">Canteen Simulator</h2>
          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-4">
            <p className="text-xs text-zinc-500 font-sans">Simulate a face scan triggering a new cafeteria food checkout transaction:</p>

            <form onSubmit={handleSimulateVisit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 font-mono block uppercase">Select Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={newVisitorName}
                  onChange={(e) => setNewVisitorName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 font-mono block uppercase">Canteen Item Purchased</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Black Espresso Cafe & Cookies"
                  value={newVisitorItem}
                  onChange={(e) => setNewVisitorItem(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 font-mono block uppercase">Meal Category Cycle</label>
                <select
                  value={newVisitorMeal}
                  onChange={(e) => setNewVisitorMeal(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Snacks">Snacks / Break</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono text-xs rounded transition flex items-center justify-center gap-2 shadow"
              >
                <PlusCircle className="w-4 h-4" />
                CAPTURE BILLING SCAN
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
