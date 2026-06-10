/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { PlusCircle, Edit, RefreshCw, Smartphone, MapPin, User, Hash } from 'lucide-react';

interface TransactionFormProps {
  onSave: (record: Transaction) => Promise<void>;
  initialTransaction?: Transaction | null;
  onCancelEdit?: () => void;
  isSubmitting: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSave,
  initialTransaction,
  onCancelEdit,
  isSubmitting,
}) => {
  const [id, setId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Prefill helper for unique IDs
  const generatePlaceholderId = () => {
    return `TORO-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  useEffect(() => {
    if (initialTransaction) {
      setId(initialTransaction.id);
      setName(initialTransaction.name);
      setAddress(initialTransaction.address);
      setPhone(initialTransaction.phone);
    } else {
      setId(generatePlaceholderId());
      setName('');
      setAddress('');
      setPhone('');
    }
    setErrorMsg('');
  }, [initialTransaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    const trimmedId = id.trim();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedId) {
      setErrorMsg('A unique ID is required.');
      return;
    }
    if (!trimmedName) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!trimmedAddress) {
      setErrorMsg('Address is required.');
      return;
    }
    if (!trimmedPhone) {
      setErrorMsg('Phone Number is required.');
      return;
    }

    const recordData: Transaction = {
      id: trimmedId,
      name: trimmedName,
      address: trimmedAddress,
      phone: trimmedPhone,
    };

    try {
      await onSave(recordData);
      
      // Reset form if it was a new record
      if (!initialTransaction) {
        setId(generatePlaceholderId());
        setName('');
        setAddress('');
        setPhone('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the record.');
    }
  };

  return (
    <div id="transaction-form-card" className="bg-[#121214] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.6)] border border-slate-800/80 p-6 md:p-8 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2.5 rounded-lg ${initialTransaction ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {initialTransaction ? <Edit size={18} /> : <PlusCircle size={18} />}
        </div>
        <div>
          <h2 id="form-heading" className="text-base font-bold text-slate-100">
            {initialTransaction ? 'Modify Toro Record' : 'Register New Toro Record'}
          </h2>
          <p className="text-xs text-slate-400">
            {initialTransaction ? 'Update existing credentials stored in Google Sheet' : 'Directly append database entries to your linked Toro Google Sheets ledger'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div id="form-error-toast" className="p-3.5 mb-5 text-xs text-rose-400 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center gap-2">
          <span className="font-semibold text-sm">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form id="transaction-entry-form" onSubmit={handleSubmit} className="space-y-4">
        
        {/* ID Field */}
        <div>
          <label htmlFor="tx-id" className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Hash size={11} className="text-slate-500" />
            Registry ID
          </label>
          <input
            type="text"
            id="tx-id"
            name="id"
            value={id}
            disabled={!!initialTransaction} // Keep ID locked during edits to maintain row key integrity
            onChange={(e) => setId(e.target.value)}
            className="w-full bg-[#0F0F11] border border-slate-800/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:border-emerald-500/40 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            required
            placeholder="E.g. TORO-10023"
          />
        </div>

        {/* Name Field */}
        <div>
          <label htmlFor="tx-name" className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <User size={11} className="text-slate-500" />
            Full Name
          </label>
          <input
            type="text"
            id="tx-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0F0F11] border border-slate-800/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:border-emerald-500/40 focus:outline-none transition-all"
            required
            placeholder="E.g. Hemantha PR"
          />
        </div>

        {/* Address Field */}
        <div>
          <label htmlFor="tx-address" className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <MapPin size={11} className="text-slate-500" />
            Physical Address
          </label>
          <input
            type="text"
            id="tx-address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-[#0F0F11] border border-slate-800/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:border-emerald-500/40 focus:outline-none transition-all"
            required
            placeholder="E.g. 100 Toro Blvd, Suite 450"
          />
        </div>

        {/* Phone Number Field */}
        <div>
          <label htmlFor="tx-phone" className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Smartphone size={11} className="text-slate-500" />
            Phone Number
          </label>
          <input
            type="tel"
            id="tx-phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#0F0F11] border border-slate-800/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 focus:border-emerald-500/40 focus:outline-none transition-all"
            required
            placeholder="E.g. +1 (555) 019-2834"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3">
          {initialTransaction && (
            <button
              type="button"
              id="btn-cancel-edit"
              onClick={onCancelEdit}
              disabled={isSubmitting}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            id="btn-submit-transaction"
            disabled={isSubmitting}
            className={`flex-1 font-extrabold py-2.5 px-4 rounded-lg text-xs transition-all hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 uppercase tracking-wider bg-emerald-500 text-black shadow-md shadow-emerald-500/10`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="animate-spin h-3.5 w-3.5" />
                <span>Syncing Sheets...</span>
              </>
            ) : initialTransaction ? (
              'Apply Modifications'
            ) : (
              'Save To Toro Sheet'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
