'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  User, 
  FileText, 
  FlaskConical, 
  Clock, 
  CheckCircle, 
  Send, 
  LogOut, 
  Activity, 
  Lock,
  PlusCircle,
  FileCheck,
  BarChart4,
  TrendingUp,
  Users,
  Menu,
  X
} from 'lucide-react';
import { handleLogout, uploadLabReport, releaseReport } from '../../actions';

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface ReportItem {
  id: string;
  title: string;
  testDate: Date;
  status: string;
  patientName: string;
  patientEmail: string;
  resultsCount: number;
}

interface AuditLog {
  id: string;
  action: string;
  timestamp: Date;
}

interface AdminDashboardClientProps {
  sessionUser: {
    name: string;
    email: string;
    role: string;
  };
  labName: string;
  patients: Patient[];
  reports: ReportItem[];
  auditLogs: AuditLog[];
}

interface ResultRow {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
}

export default function AdminDashboardClient({
  sessionUser,
  labName,
  patients,
  reports: initialReports,
  auditLogs
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'manage' | 'upload' | 'analytics' | 'gateway'>('manage');
  const [reportsList, setReportsList] = useState<ReportItem[]>(initialReports);
  
  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Upload Form States
  const [selectedPatientId, setSelectedPatientId] = useState(patients.length > 0 ? patients[0].id : '');
  const [reportTitle, setReportTitle] = useState('CBC Blood Test');
  const [testDateStr, setTestDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [resultsRows, setResultsRows] = useState<ResultRow[]>([
    { testName: 'Hemoglobin', value: '', unit: 'g/dL', referenceRange: '12.0 - 15.5' }
  ]);

  // Loading / Feedback States
  const [uploading, setUploading] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add a result row in the form builder
  const handleAddRow = () => {
    setResultsRows(prev => [...prev, { testName: '', value: '', unit: '', referenceRange: '' }]);
  };

  // Remove a result row in the form builder
  const handleRemoveRow = (index: number) => {
    if (resultsRows.length === 1) return;
    setResultsRows(prev => prev.filter((_, idx) => idx !== index));
  };

  // Update dynamic row value
  const handleRowChange = (index: number, field: keyof ResultRow, value: string) => {
    setResultsRows(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Release a report to patient (status transitions from Completed -> Delivered)
  const handleReleaseReport = async (reportId: string) => {
    setReleasingId(reportId);
    setStatusMessage(null);
    const res = await releaseReport(reportId);
    setReleasingId(null);

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Report successfully released and patient notified.' });
      setReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status: 'Delivered' } : r));
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to release report.' });
    }
  };

  // Submit report upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !reportTitle || !testDateStr) return;

    const formattedResults = [];
    for (const row of resultsRows) {
      if (!row.testName || !row.value) {
        setStatusMessage({ type: 'error', text: 'Please fill in all parameter names and values.' });
        return;
      }
      const parsedValue = parseFloat(row.value);
      if (isNaN(parsedValue)) {
        setStatusMessage({ type: 'error', text: `Invalid value "${row.value}" for ${row.testName}. Must be a number.` });
        return;
      }
      formattedResults.push({
        testName: row.testName,
        value: parsedValue,
        unit: row.unit,
        referenceRange: row.referenceRange
      });
    }

    setUploading(true);
    setStatusMessage(null);
    
    const res = await uploadLabReport(selectedPatientId, reportTitle, testDateStr, formattedResults);
    setUploading(false);

    if (res.success && res.reportId) {
      setStatusMessage({ type: 'success', text: 'Report successfully uploaded with lab results.' });
      setReportTitle('CBC Blood Test');
      setResultsRows([{ testName: 'Hemoglobin', value: '', unit: 'g/dL', referenceRange: '12.0 - 15.5' }]);
      
      const patientObj = patients.find(p => p.id === selectedPatientId);
      const newReport: ReportItem = {
        id: res.reportId,
        title: reportTitle,
        testDate: new Date(testDateStr),
        status: 'Completed',
        patientName: patientObj?.name || 'Patient',
        patientEmail: patientObj?.email || 'Email',
        resultsCount: formattedResults.length
      };
      setReportsList(prev => [newReport, ...prev]);
      setActiveTab('manage');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to upload report.' });
    }
  };

  // Simulated Analytics data
  const monthlyData = [
    { month: 'Jan', count: 110, height: '74%' },
    { month: 'Feb', count: 125, height: '84%' },
    { month: 'Mar', count: 120, height: '81%' },
    { month: 'Apr', count: 135, height: '91%' },
    { month: 'May', count: 140, height: '94%' },
    { month: 'Jun', count: 148, height: '100%' }
  ];

  const popularPanels = [
    { name: 'CBC Blood Panel', demand: '45%', duration: '12.5 hrs', category: 'Hematology' },
    { name: 'Lipid Cholesterol Panel', demand: '30%', duration: '14.2 hrs', category: 'Cardiology' },
    { name: 'Thyroid Panel', demand: '15%', duration: '15.0 hrs', category: 'Endocrine' },
    { name: 'Vitamin & Iron Panel', demand: '10%', duration: '11.8 hrs', category: 'Micronutrient' }
  ];

  return (
    <div className="flex-1 flex bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 font-sans relative">
      
      {/* Mobile Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer content */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in slide-in-from-left duration-250">
            {/* Close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 text-sky-600 dark:text-sky-400 mb-8 mt-2">
              <FlaskConical className="h-6 w-6" />
              <span className="font-bold text-lg tracking-tight">Lab Admin</span>
            </div>

            {/* User profile */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-sky-500/10 text-sky-605 dark:text-sky-400 flex items-center justify-center font-bold shrink-0">
                LA
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold truncate text-slate-850 dark:text-slate-200">{sessionUser.name}</h4>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-500 truncate block">{labName}</span>
              </div>
            </div>

            {/* Nav list */}
            <nav className="flex-grow space-y-1.5 overflow-y-auto pr-1">
              {[
                { id: 'manage', label: 'Manage Reports', icon: FileText },
                { id: 'upload', label: 'Upload New Report', icon: Plus },
                { id: 'analytics', label: 'Lab Business Analytics', icon: BarChart4 },
                { id: 'gateway', label: 'EHR Gateway Logs', icon: FlaskConical }
              ].map((item) => {
                const TabIcon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                      setStatusMessage(null);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-650/10'
                        : 'text-slate-505 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-205 hover:bg-slate-100/50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <TabIcon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="mt-auto border-t border-slate-250/20 dark:border-slate-800 pt-4">
              <form action={handleLogout}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 text-xs font-bold text-rose-505 hover:text-rose-600 px-4 py-2 rounded-xl border border-rose-500/10 hover:bg-rose-505/5 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Secure Sign Out</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="no-print hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 z-20 shrink-0">
        <div className="flex items-center space-x-3 text-sky-600 dark:text-sky-400 mb-8">
          <FlaskConical className="h-6 w-6" />
          <span className="font-bold text-lg tracking-tight">Lab Admin</span>
        </div>

        {/* User profile */}
        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            LA
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold truncate text-slate-850 dark:text-slate-200">{sessionUser.name}</h4>
            <span className="text-[10px] uppercase font-bold tracking-wider text-sky-500 truncate block">{labName}</span>
          </div>
        </div>

        <nav className="flex-grow space-y-1.5">
          <button
            onClick={() => {
              setActiveTab('manage');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'manage'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-650/10'
                : 'text-slate-500 hover:text-slate-905 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Manage Reports</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('upload');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'upload'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-655/10'
                : 'text-slate-500 hover:text-slate-905 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Upload New Report</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('analytics');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'analytics'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-655/10'
                : 'text-slate-500 hover:text-slate-905 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <BarChart4 className="h-4 w-4" />
            <span>Lab Business Analytics</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('gateway');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'gateway'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-655/10'
                : 'text-slate-500 hover:text-slate-905 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50'
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>EHR Gateway Logs</span>
          </button>
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-6 border-t border-slate-250/20 dark:border-slate-800">
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 text-xs font-bold text-rose-500 hover:text-rose-600 px-4 py-2.5 rounded-xl border border-rose-500/10 hover:bg-rose-500/5 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Secure Sign Out</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800 text-center shrink-0">
            <a
              href="https://www.medclinicx.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-400 hover:text-sky-600 dark:text-slate-500 dark:hover:text-sky-400 font-bold hover:underline transition duration-150 block"
            >
              Healthcare system by Med Clinic X
            </a>
          </div>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer mr-1"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-bold text-md text-slate-850 dark:text-white leading-tight">
              {labName} <span className="hidden sm:inline">Laboratory Management</span>
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-450 dark:text-slate-500">
              CLIA-Certified Diagnostic Center
            </span>
            <form action={handleLogout} className="md:hidden">
              <button
                type="submit"
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-505/5 border border-rose-500/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Tab wrappers */}
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-200">
          
          {statusMessage && (
            <div className={`p-4 rounded-xl text-xs ${
              statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
            }`}>
              {statusMessage.text}
            </div>
          )}

          {/* TAB 1: MANAGE REPORTS */}
          {activeTab === 'manage' && (
            <div className="space-y-8">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Laboratory Releases Log</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Release newly parsed completed reports directly to patients.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-sky-650/15 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Upload Lab Results</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3 font-bold text-slate-500">Patient</th>
                        <th className="px-4 py-3 font-bold text-slate-500">Report Title</th>
                        <th className="px-4 py-3 font-bold text-slate-500">Test Date</th>
                        <th className="px-4 py-3 font-bold text-slate-500">Parameters</th>
                        <th className="px-4 py-3 font-bold text-slate-500">Status Progression</th>
                        <th className="px-4 py-3 font-bold text-slate-550 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {reportsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                            No laboratory reports logged. Get started by uploading one.
                          </td>
                        </tr>
                      ) : (
                        reportsList.map((r) => (
                          <tr key={r.id}>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-855 dark:text-slate-205">{r.patientName}</div>
                              <div className="text-[10px] text-slate-500">{r.patientEmail}</div>
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{r.title}</td>
                            <td className="px-4 py-3.5 text-slate-500">{new Date(r.testDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3.5">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-505 dark:text-slate-400 font-semibold">
                                {r.resultsCount} checked
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center space-x-1">
                                <span className={`h-2 w-2 rounded-full ${
                                  r.status === 'Delivered' || r.status === 'Reviewed' 
                                    ? 'bg-emerald-500' 
                                    : 'bg-indigo-500 animate-pulse-slow'
                                }`}></span>
                                <span className="font-semibold text-[10px]">
                                  {r.status === 'Completed' ? 'Processing → Completed' : `Delivered → ${r.status}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {r.status === 'Completed' ? (
                                <button
                                  onClick={() => handleReleaseReport(r.id)}
                                  disabled={releasingId === r.id}
                                  className="bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-605 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer"
                                >
                                  {releasingId === r.id ? 'Releasing...' : 'Release to Patient'}
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end space-x-1">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>Released</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Admin Activity Audits</h4>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-600 dark:text-slate-400">{log.action}</span>
                      <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: UPLOAD REPORT */}
          {activeTab === 'upload' && (
            <div className="max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
              
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center space-x-2">
                  <PlusCircle className="h-5 w-5 text-sky-550" />
                  <span>Upload Lab Diagnostic Data</span>
                </h3>
                <p className="text-xs text-slate-505 mt-1">
                  Securely parse new clinical panels directly into the patient database timeline.
                </p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="patientSelect" className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-2">
                      Select Patient
                    </label>
                    <select
                      id="patientSelect"
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-505 cursor-pointer"
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="titleInput" className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-2">
                      Report Title
                    </label>
                    <input
                      id="titleInput"
                      type="text"
                      required
                      placeholder="e.g. CBC Blood Test"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-101 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="dateInput" className="block text-[10px] font-bold uppercase tracking-wider text-slate-555 dark:text-slate-400 mb-2">
                      Collection Date
                    </label>
                    <input
                      id="dateInput"
                      type="date"
                      required
                      value={testDateStr}
                      onChange={(e) => setTestDateStr(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-101 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lab Results Builder</h4>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-404 flex items-center space-x-1 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Parameter Row</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {resultsRows.map((row, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Parameter (e.g. Hemoglobin)"
                            value={row.testName}
                            onChange={(e) => handleRowChange(index, 'testName', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => handleRowChange(index, 'value', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 text-right"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Unit"
                            value={row.unit}
                            onChange={(e) => handleRowChange(index, 'unit', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            required
                            placeholder="Ref Range"
                            value={row.referenceRange}
                            onChange={(e) => handleRowChange(index, 'referenceRange', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            disabled={resultsRows.length === 1}
                            className="text-slate-400 hover:text-rose-500 disabled:opacity-30 transition cursor-pointer"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 space-x-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('manage')}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 rounded-xl px-5 py-3 text-xs font-bold transition hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-sky-600 hover:bg-sky-750 text-white rounded-xl px-6 py-3 text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-600/10"
                  >
                    <Send className="h-4.5 w-4.5" />
                    <span>{uploading ? 'Uploading Results...' : 'Verify & Log Lab Report'}</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB 3: LAB BUSINESS ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Reports Completed */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Reports Completed</span>
                  <div className="mt-4">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">148</h3>
                    <p className="text-xs text-sky-500 font-bold mt-1">+15% Month-over-Month</p>
                  </div>
                </div>

                {/* Turnaround Time */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Average Delivery Time</span>
                  <div className="mt-4">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">14.2 hrs</h3>
                    <p className="text-xs text-emerald-500 font-bold mt-1">99.8% SLA Compliance</p>
                  </div>
                </div>

                {/* Patient growth */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Patient Growth</span>
                  <div className="mt-4">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">+22</h3>
                    <p className="text-xs text-sky-500 font-bold mt-1">+8% New Accounts</p>
                  </div>
                </div>

                {/* Quality Score */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Accuracy Verification</span>
                  <div className="mt-4 flex items-center space-x-2 text-emerald-500">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-xs font-bold leading-tight">100% QA Standard Met</span>
                  </div>
                </div>
              </div>

              {/* Monthly volume + popular diagnostics layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Reports Volume Monthly Bar Chart (Left 7) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <BarChart4 className="h-4.5 w-4.5 text-sky-550" />
                      <span>Monthly Report Completions</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Laboratory report volume compiled over the past 6 months</p>
                  </div>

                  {/* HTML/CSS Bar Chart Grid */}
                  <div className="h-48 flex items-end justify-between px-6 pt-4 border-b border-slate-200/50 dark:border-slate-800/80">
                    {monthlyData.map((d, index) => (
                      <div key={index} className="flex flex-col items-center space-y-2 w-10 group cursor-pointer">
                        {/* Tooltip value */}
                        <span className="text-[9px] font-extrabold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition duration-200">
                          {d.count}
                        </span>
                        {/* Bar */}
                        <div 
                          className="w-full bg-sky-600 dark:bg-sky-500/80 rounded-t-lg transition-all duration-500 group-hover:bg-indigo-500" 
                          style={{ height: d.height }}
                        ></div>
                        {/* Month */}
                        <span className="text-[9px] font-bold text-slate-400 block pt-1">{d.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular diagnostics (Right 5) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <TrendingUp className="h-4.5 w-4.5 text-sky-550" />
                      <span>Popular Diagnostic Panels</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Top checkup orders by volume</p>
                  </div>

                  <div className="space-y-3.5">
                    {popularPanels.map((p, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-250">{p.name}</h4>
                          <span className="text-[9px] text-slate-405 block mt-0.5">{p.category} | turnaround: {p.duration}</span>
                        </div>
                        <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm">
                          {p.demand}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: EHR GATEWAY LOGS */}
          {activeTab === 'gateway' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <FlaskConical className="h-5 w-5 text-sky-500" />
                    <span>Live CLIA Compliance & FHIR Gateway Logs</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    HL7/FHIR observation transmissions, CLIA compliance handshakes, and database synchronization pipelines with external clinical EMR records.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col justify-between h-40">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Mayo Clinic Link</span>
                      <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-bold">Active</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">FHIR API synced successfully. Observation records uploaded and verified using SHA-256 signatures.</p>
                    <span className="text-[10px] font-mono text-slate-400">Node ID: MC-9284-A</span>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex flex-col justify-between h-40">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Epic Systems Gateway</span>
                      <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-bold">Active</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">CLIA-certified transmission handshake. Diagnostic panel releases automatically route to Epic MyChart.</p>
                    <span className="text-[10px] font-mono text-slate-400">Node ID: EP-4581-X</span>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex flex-col justify-between h-40">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Kaiser EMR Pipeline</span>
                      <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-bold">Active</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Longitudinal blood biomarker records synced under OAuth2 secure session parameters.</p>
                    <span className="text-[10px] font-mono text-slate-400">Node ID: KP-3829-M</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-455 mb-3">Live Transmission Stream (HL7/FHIR)</h4>
                  <div className="space-y-2.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[300px] overflow-y-auto">
                    <p className="text-emerald-650">[{new Date().toLocaleString()}] SUCCESS: [HL7 ORU^R01] Message accepted by Epic Gateway. Control ID: Msg-82910</p>
                    <p>MSH|^~\&|METRO_LAB|CLIA_45D2109845|EPIC|MYCHART|{new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14)}||ORU^R01|82910|P|2.5</p>
                    <p>PID|1||Sarah_Ahmed_45a||Ahmed^Sarah||19910815|F</p>
                    <p>OBR|1||Accession_5928||CBC_Blood_Test||202606221030</p>
                    <p>OBX|1|NM|Hemoglobin^Hemoglobin|1|13.2|g/dL|12.0-15.5|N|||F</p>
                    <p>OBX|2|NM|Cholesterol^Cholesterol|1|170.0|mg/dL|&lt;200|N|||F</p>
                    <p className="text-slate-400">[{new Date().toLocaleString()}] SECURE: Digitally signing report using CLIA private key block. Certificate verified.</p>
                    <p className="text-sky-600">[{new Date().toLocaleString()}] INFO: Transmitted 12 observation values to Mayo Clinic. Handshake response: HTTP 201 Created.</p>
                    <p className="text-slate-400">[{new Date().toLocaleString()}] AUDIT: Compliance log record written. HIPAA Cryptographic audit trail complete.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
