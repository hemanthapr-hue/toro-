/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Transaction, SheetConfig } from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './lib/auth';
import {
  getOrCreateSpreadsheet,
  fetchTransactions,
  addTransactionToSheet,
  updateTransactionInSheet,
  deleteTransactionFromSheet,
} from './lib/sheets';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { Dashboard } from './components/Dashboard';

import {
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  LogOut,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Sheets config & data
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'list'>('dashboard');

  // Form edit transaction target
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // General Notification Alert
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Trigger alert banner
  const triggerAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlert({ message, type });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  // 1. Listen for persistent user credentials on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        setNeedsAuth(false);
        await handleRegisterSpreadsheet(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Discover/Setup Business Google Sheet
  const handleRegisterSpreadsheet = async (accessToken: string) => {
    setIsSyncing(true);
    try {
      const config = await getOrCreateSpreadsheet(accessToken);
      setSheetConfig(config);
      
      // Fetch latest transaction records
      const records = await fetchTransactions(accessToken, config.spreadsheetId, config.sheetName);
      setTransactions(records);
    } catch (err: any) {
      console.error('Error setting up business sheet database:', err);
      triggerAlert('Could not locate or establish your Business Ledger sheet in Google Drive.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. User Login Trigger
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        triggerAlert('Account authenticated. Syncing with Google Drive...');
        await handleRegisterSpreadsheet(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      triggerAlert('Failed to authenticate your Google Workspace account.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. Logout trigger
  const handleLogout = async () => {
    setUser(null);
    setToken(null);
    setSheetConfig(null);
    setTransactions([]);
    setNeedsAuth(true);
    await logout();
    triggerAlert('Logged out of Google account context successfully.', 'info');
  };

  // 5. Save operation (Handles both Append and partial Edit triggers)
  const handleSaveTransaction = async (recordData: Transaction) => {
    if (!token || !sheetConfig) {
      triggerAlert('Authentication tokens expired. Please re-sign in.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      if (editingTransaction) {
        // Edit Row Action
        const success = await updateTransactionInSheet(
          token,
          sheetConfig.spreadsheetId,
          recordData,
          sheetConfig.sheetName
        );

        if (success) {
          triggerAlert('Toro database record edited successfully!');
          setEditingTransaction(null);
          // Transition back to list table view
          setActiveTab('list');
        } else {
          throw new Error('Google Sheets reject/timeout during edit.');
        }
      } else {
        // Appending New Row
        const success = await addTransactionToSheet(
          token,
          sheetConfig.spreadsheetId,
          recordData,
          sheetConfig.sheetName
        );

        if (success) {
          triggerAlert('New record successfully appended to Toro Business DB!');
          // Automatically navigate user back to see it in action
          setActiveTab('list');
        } else {
          throw new Error('Google Sheets append operation failed.');
        }
      }

      // Sync rows cache
      const freshRows = await fetchTransactions(token, sheetConfig.spreadsheetId, sheetConfig.sheetName);
      setTransactions(freshRows);
    } catch (err: any) {
      console.error(err);
      triggerAlert(err.message || 'Error occurred while saving to sheet.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 6. Delete Row operation
  const handleDeleteTransaction = async (id: string) => {
    if (!token || !sheetConfig) return;

    try {
      const success = await deleteTransactionFromSheet(
        token,
        sheetConfig.spreadsheetId,
        id,
        sheetConfig.sheetName
      );

      if (success) {
        triggerAlert('Row successfully deleted and dimension purged from Sheets', 'info');
        // Reload transactions
        const freshRows = await fetchTransactions(token, sheetConfig.spreadsheetId, sheetConfig.sheetName);
        setTransactions(freshRows);
      } else {
        triggerAlert('Could not locate or purge row from sheet table.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerAlert('Failed to complete deletion request on Google Sheets.', 'error');
    }
  };

  // 7. Manual Refresh
  const handleReload = async () => {
    if (!token || !sheetConfig) return;
    setIsSyncing(true);
    triggerAlert('Syncing live data streams...', 'info');
    try {
      const freshRows = await fetchTransactions(token, sheetConfig.spreadsheetId, sheetConfig.sheetName);
      setTransactions(freshRows);
      triggerAlert('Ledger data up to date.');
    } catch (err) {
      console.error(err);
      triggerAlert('Syncing failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="app-root-shell" className="min-h-screen bg-[#0A0A0B] font-sans text-slate-300 transition-colors flex flex-col md:flex-row antialiased">
      
      {/* Dynamic Floating Banner Notification */}
      {alert && (
        <div
          id="toast-floating-banner"
          className={`fixed top-5 right-5 z-50 max-w-sm px-4 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in border transition-all ${
            alert.type === 'success'
              ? 'bg-[#121214] text-emerald-400 border-emerald-500/30'
              : alert.type === 'error'
              ? 'bg-[#121214] text-rose-400 border-rose-500/30'
              : 'bg-[#121214] text-slate-200 border-slate-800'
          }`}
        >
          <AlertCircle size={18} className="flex-shrink-0 text-emerald-500" />
          <span className="text-xs font-semibold">{alert.message}</span>
        </div>
      )}

      {/* BEFORE AUTH: Landing page setup */}
      {needsAuth ? (
        <div id="login-container" className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0A0A0B]">
          <div className="max-w-md w-full bg-[#121214] rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.8)] border border-slate-800 text-center space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl text-black shadow-lg shadow-emerald-500/10 mx-auto">
                <FileSpreadsheet size={32} className="stroke-[2.5px]" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Toro Business Manager
              </h1>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Connect your business ledger spreadsheet to read, write, and analyze contact records (ID, Name, Address, Phone number) in real time.
              </p>
            </div>

            <div className="bg-[#0F0F11] p-4 rounded-xl text-left border border-slate-800/60 text-xs text-slate-400 leading-relaxed space-y-2">
              <div className="flex gap-2.5">
                <span className="text-emerald-500">⚡</span>
                <span><strong>No middle database:</strong> Safe, direct real-time communication to worksheets in your personal Google Drive account.</span>
              </div>
              <div className="flex gap-2.5">
                <span className="text-emerald-500">🔐</span>
                <span><strong>Official Google Access:</strong> Authenticated securely via official Workspace OAuth endpoints.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <GoogleSignInButton onClick={handleLogin} isLoading={isLoggingIn} />
            </div>
          </div>
        </div>
      ) : (
        /* AFTER AUTH: High-Fidelity Split Screen Workspace */
        <>
          {/* Desktop Left Sidebar Navigation */}
          <aside id="workspace-sidebar" className="hidden md:flex w-64 border-r border-slate-800/60 flex-col bg-[#0F0F11] shrink-0 text-slate-300">
            {/* Header / Logo */}
            <div className="p-6 border-b border-slate-805/40 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-black font-extrabold text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 uppercase">
                TORO
              </div>
              <div>
                <span className="font-semibold text-slate-100 tracking-tight text-sm block">Toro Business</span>
                <span className="text-[10px] text-slate-500 mono leading-none font-bold">DIRECTORY ENGINE</span>
              </div>
            </div>

            {/* Main menu */}
            <nav id="sidebar-navigation" className="flex-1 p-5 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 px-2">
                Main Console
              </div>

              {/* Dashboard Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setEditingTransaction(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800/50 text-slate-100 border-l-2 border-emerald-500 pl-2.5'
                    : 'text-slate-400 hover:bg-slate-800/10 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard size={14} className={activeTab === 'dashboard' ? 'text-emerald-500' : 'text-slate-400'} />
                <span>Overview Dashboard</span>
              </button>

              {/* Insert transaction tab */}
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'form'
                    ? 'bg-slate-800/50 text-slate-100 border-l-2 border-emerald-500 pl-2.5'
                    : 'text-slate-400 hover:bg-slate-800/10 hover:text-slate-200'
                }`}
              >
                <PlusCircle size={14} className={activeTab === 'form' ? 'text-emerald-500' : 'text-slate-400'} />
                <span>{editingTransaction ? 'Modify Record' : 'Register Contact'}</span>
              </button>

              {/* Transaction lists tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('list');
                  setEditingTransaction(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-slate-800/50 text-slate-100 border-l-2 border-emerald-500 pl-2.5'
                    : 'text-slate-400 hover:bg-slate-800/10 hover:text-slate-200'
                }`}
              >
                <ListOrdered size={14} className={activeTab === 'list' ? 'text-emerald-500' : 'text-slate-400'} />
                <span>Directory Records</span>
              </button>
            </nav>

            {/* Sidebar Status Footer */}
            <div className="p-4 border-t border-slate-800/40">
              <div className="bg-[#121214] p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SHEETS FLOW</span>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Online
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-full">
                  User: <span className="text-slate-300 font-semibold">{user?.email}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Area Component Container */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0B]">
            {/* Header / Top Action bar */}
            <header id="app-header" className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 md:px-8 bg-[#0F0F11]/60 backdrop-blur-md sticky top-0 z-30">
              {/* Left Details (Visible to all) */}
              <div>
                <h2 className="text-sm md:text-base font-semibold text-slate-100 capitalize">
                  {activeTab === 'dashboard' ? 'Business Directory' : activeTab === 'form' ? 'Toro Record Input' : 'Spreadsheet Records'}
                </h2>
                <p className="text-[10px] md:text-xs text-slate-505 text-slate-500">Live storage feed from connected drive</p>
              </div>

              {/* Action and User details */}
              <div className="flex items-center gap-4">
                {/* Sync Indicators */}
                <div className="flex items-center gap-2 bg-[#121214] px-3 py-1.5 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Sync:</span>
                  <button
                    onClick={handleReload}
                    disabled={isSyncing}
                    id="btn-sync-reload"
                    className="text-[11px] font-bold text-slate-200 mono flex items-center gap-1 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={11} className={`text-emerald-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>REFRESH</span>
                  </button>
                </div>

                {/* Profile Widget */}
                <div className="flex items-center gap-2 border-l border-slate-800/60 pl-3">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-200">{user?.displayName || 'Business Owner'}</span>
                    <span className="text-[9px] text-slate-500 max-w-[120px] truncate">{user?.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out Google Workspace Session"
                    id="btn-google-logout"
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700/80 hover:text-rose-400 border border-slate-700 flex items-center justify-center transition-all cursor-pointer text-slate-350"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              </div>
            </header>

            {/* Mobile Bottom Screen Navigation Menu (Only visible on screens narrower than md) */}
            <nav id="mobile-navigation" className="flex md:hidden grid grid-cols-3 border-b border-slate-800 bg-[#0F0F11] p-1 text-xs sticky top-16 z-20">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setEditingTransaction(null);
                }}
                className={`py-2.5 rounded-lg flex flex-col items-center justify-center gap-1 font-semibold transition-colors ${
                  activeTab === 'dashboard'
                    ? 'text-emerald-400 bg-slate-800/30 font-bold'
                    : 'text-slate-400'
                }`}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('form')}
                className={`py-2.5 rounded-lg flex flex-col items-center justify-center gap-1 font-semibold transition-colors ${
                  activeTab === 'form'
                    ? 'text-emerald-400 bg-slate-800/30 font-bold'
                    : 'text-slate-400'
                }`}
              >
                <PlusCircle size={14} />
                <span>{editingTransaction ? 'Edit Row' : 'New Entry'}</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('list');
                  setEditingTransaction(null);
                }}
                className={`py-2.5 rounded-lg flex flex-col items-center justify-center gap-1 font-semibold transition-colors ${
                  activeTab === 'list'
                    ? 'text-emerald-400 bg-slate-800/30 font-bold'
                    : 'text-slate-400'
                }`}
              >
                <ListOrdered size={14} />
                <span>Records</span>
              </button>
            </nav>

            {/* Scrollable Container Area */}
            <main id="app-main-content" className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
              {isSyncing && transactions.length === 0 ? (
                /* Beautiful Initialization state */
                <div id="first-sync-loading-block" className="h-[50vh] flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-emerald-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileSpreadsheet className="text-emerald-500 h-4 w-4 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-200 text-sm">Syncing Workspace Workbook</h3>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Connecting directly to your Google account to create or fetch <code className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-[10px] text-emerald-400">Toro Business DB</code>...
                    </p>
                  </div>
                </div>
              ) : (
                /* Dynamic Tab renders with fade transitions */
                <div id="tab-outlet" className="transition-all duration-300">
                  {activeTab === 'dashboard' && (
                    <Dashboard
                      transactions={transactions}
                      spreadsheetUrl={sheetConfig?.spreadsheetUrl}
                      onNavigateToForm={() => setActiveTab('form')}
                    />
                  )}

                  {activeTab === 'form' && (
                    <div className="max-w-2xl mx-auto">
                      <TransactionForm
                        onSave={handleSaveTransaction}
                        initialTransaction={editingTransaction}
                        isSubmitting={isSyncing}
                        onCancelEdit={() => {
                          setEditingTransaction(null);
                          setActiveTab('list');
                        }}
                      />
                    </div>
                  )}

                  {activeTab === 'list' && (
                    <TransactionList
                      transactions={transactions}
                      isLoading={isSyncing}
                      onEdit={(tx) => {
                        setEditingTransaction(tx);
                        setActiveTab('form');
                      }}
                      onDelete={handleDeleteTransaction}
                    />
                  )}
                </div>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}
