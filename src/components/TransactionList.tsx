/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction } from '../types';
import { Search, Edit3, Trash2, Smartphone, MapPin, Hash, UserCircle } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Perform search query filtering
  const filteredRecords = transactions.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.id.toLowerCase().includes(term) ||
      r.name.toLowerCase().includes(term) ||
      r.address.toLowerCase().includes(term) ||
      r.phone.toLowerCase().includes(term)
    );
  });

  const handleDeleteClick = async (record: Transaction) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete record for "${record.name}" (ID: ${record.id})? This action will immediately update your Toro Google Sheet.`
    );
    if (confirmed) {
      setIsDeletingId(record.id);
      try {
        await onDelete(record.id);
      } finally {
        setIsDeletingId(null);
      }
    }
  };

  return (
    <div id="transaction-list-container" className="bg-[#121214] border border-slate-800/80 rounded-xl shadow-2xl p-6 md:p-8 transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 id="ledger-heading" className="text-base font-bold text-slate-100">
            Toro Registered Records
          </h2>
          <p className="text-xs text-slate-400">
            Direct real-time streaming from your active spreadsheet ({filteredRecords.length} records found)
          </p>
        </div>
      </div>

      {/* Filter and Search Dashboard Control Bar */}
      <div id="filter-control-bar" className="mb-6">
        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search size={14} />
          </span>
          <input
            type="text"
            id="search-transactions"
            placeholder="Search by ID, name, address, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0F0F11] border border-slate-800/80 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:border-emerald-500/40 focus:outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      {isLoading ? (
        <div id="loading-spinner-block" className="h-48 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[11px] text-slate-500">Synchronizing records cache...</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div id="empty-state-list" className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-[#0F0F11]">
          <div className="text-xl mb-1 text-slate-600">💼</div>
          <p className="text-xs font-semibold text-slate-300">No matching registry entries</p>
          <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
            Refine your query or register a new client/contact record using the workspace form.
          </p>
        </div>
      ) : (
        /* Responsive list (cards on mobile, elegant table on desktop) */
        <div id="ledger-data-wrapper">
          {/* Mobile list view */}
          <div className="block md:hidden space-y-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 bg-[#0F0F11] border border-slate-800/80 rounded-lg relative overflow-hidden space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded border border-emerald-500/20">
                      <Hash size={9} />
                      {record.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 pt-1">
                      <UserCircle size={14} className="text-slate-450" />
                      {record.name}
                    </h3>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-slate-500 shrink-0" />
                    <span className="truncate">{record.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone size={12} className="text-slate-500 shrink-0" />
                    <span>{record.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex justify-end gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <button
                    onClick={() => onEdit(record)}
                    className="p-1 px-2.5 text-slate-300 bg-slate-800 rounded flex items-center gap-1 transition-colors cursor-pointer hover:bg-slate-700"
                  >
                    <Edit3 size={10} />
                    Modify
                  </button>
                  <button
                    onClick={() => handleDeleteClick(record)}
                    disabled={isDeletingId === record.id}
                    className="p-1 px-2.5 text-rose-400 bg-rose-950/20 rounded flex items-center gap-1 transition-colors cursor-pointer hover:bg-rose-950/40"
                  >
                    <Trash2 size={10} />
                    {isDeletingId === record.id ? 'Purging...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet Table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th scope="col" className="pb-3 font-semibold text-slate-500 uppercase tracking-widest pl-4">Registry ID</th>
                  <th scope="col" className="pb-3 font-semibold text-slate-500 uppercase tracking-widest">Full Name</th>
                  <th scope="col" className="pb-3 font-semibold text-slate-500 uppercase tracking-widest">Physical Address</th>
                  <th scope="col" className="pb-3 font-semibold text-slate-500 uppercase tracking-widest">Phone Number</th>
                  <th scope="col" className="pb-3 font-semibold text-slate-500 uppercase tracking-widest text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-800/10 group transition-all"
                  >
                    <td className="py-3.5 pl-4">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/20">
                        <Hash size={10} />
                        {record.id}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-200">
                      {record.name}
                    </td>
                    <td className="py-3.5 text-slate-400 truncate max-w-[250px]" title={record.address}>
                      {record.address}
                    </td>
                    <td className="py-3.5 text-slate-400 font-mono">
                      {record.phone}
                    </td>
                    <td className="py-3.5 text-right pr-4">
                      <div className="inline-flex items-center gap-1 justify-end opacity-20 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(record)}
                          id={`btn-edit-tx-${record.id}`}
                          title="Modify Record"
                          className="px-2 py-1 text-slate-300 bg-slate-800 hover:bg-slate-700/80 rounded flex items-center gap-1 transition-all cursor-pointer font-bold uppercase text-[9px] tracking-wider"
                        >
                          <Edit3 size={9} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(record)}
                          id={`btn-delete-tx-${record.id}`}
                          title="Purge Record"
                          disabled={isDeletingId === record.id}
                          className="px-2 py-1 text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 rounded flex items-center gap-1 transition-all cursor-pointer font-bold uppercase text-[9px] tracking-wider"
                        >
                          <Trash2 size={9} />
                          <span>{isDeletingId === record.id ? '...' : 'Del'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
