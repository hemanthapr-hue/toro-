/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Transaction } from '../types';
import { FileSpreadsheet, Users, Shield, PlusCircle, Server, CheckCircle } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  spreadsheetUrl?: string;
  onNavigateToForm?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  spreadsheetUrl,
  onNavigateToForm,
}) => {
  const totalRecords = transactions.length;

  // Retrieve the latest registered contacts (e.g. up to 5 items)
  const recentRecords = transactions.slice(0, 5);

  return (
    <div id="dashboard-wrapper" className="space-y-8">
      
      {/* Top Banner Actions */}
      <div id="dashboard-header-bar" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#0F0F11] to-[#121214] border border-slate-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
        {/* Background decorative vector */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1">
          <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Toro Operational System
          </span>
          <h2 className="text-base md:text-lg font-bold text-slate-100 tracking-tight pt-1.5">
            Cloud Registered Directory Database
          </h2>
          <p className="text-xs text-slate-400">
            Real-time contact row mapping backed by Google Drive sheets infrastructure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              id="link-view-google-sheets"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs py-2 px-3.5 rounded-lg transition-all shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <FileSpreadsheet size={13} />
              Open Live Google Sheet ↗
            </a>
          )}
          {onNavigateToForm && (
            <button
              onClick={onNavigateToForm}
              id="btn-navigate-form"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/65 font-bold text-xs py-2 px-3.5 rounded-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <PlusCircle size={13} className="text-emerald-400" />
              <span>Register Contact</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Bento Grid */}
      <div id="kpi-grid" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Total Registered contacts */}
        <div id="stats-total-records" className="bg-[#121214] border border-slate-800/80 p-6 rounded-xl transition-all flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-505 text-slate-500">
              Total Database Records
            </p>
            <h3 className="text-2xl font-bold text-slate-100 font-mono">
              {totalRecords}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              <CheckCircle size={9} />
              Active Synced Status
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Users size={20} />
          </div>
        </div>

        {/* Database Encryption Status */}
        <div id="stats-security-status" className="bg-[#121214] border border-slate-800/80 p-6 rounded-xl transition-all flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Security Protocol
            </p>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest pt-1">
              Google OAuth2 Secure
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1 select-none">
              Scoped write permission ensures credentials reside only inside Toro business properties.
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/5 text-slate-400 border border-slate-800 rounded-lg">
            <Shield size={18} />
          </div>
        </div>

        {/* Spreadsheet Storage KPI */}
        <div id="stats-system-kpi" className="bg-[#121214] border border-slate-800/80 p-6 rounded-xl transition-all flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Database Core Type
            </p>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest pt-1">
              Google Sheet Ledger
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
              Instantaneous reads/writes leveraging rapid serverless Google service APIs.
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/5 text-slate-400 border border-slate-800 rounded-lg">
            <Server size={18} />
          </div>
        </div>
      </div>

      {/* Main visual panel layout */}
      <div id="recent-activity-panel" className="bg-[#121214] border border-slate-800/80 p-6 rounded-xl">
        <h4 className="text-xs font-bold text-slate-200 mb-4 uppercase tracking-widest flex items-center gap-2">
          <span>👥</span> Recently Registered Customer / Partner Rows
        </h4>

        {recentRecords.length === 0 ? (
          <div className="h-44 border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500 text-xs">
            <span>No records present.</span>
            {onNavigateToForm && (
              <button
                onClick={onNavigateToForm}
                className="text-emerald-400 hover:underline mt-1 font-bold"
              >
                Create your first registry entry now
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {recentRecords.map((r, i) => (
              <div key={r.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider select-none">
                      #{i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-100">
                      {r.name}
                    </span>
                    <span className="font-mono text-[9px] bg-slate-800/40 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      ID: {r.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xl truncate">
                    📍 {r.address}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-400 font-mono font-semibold">
                    📞 {r.phone}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
