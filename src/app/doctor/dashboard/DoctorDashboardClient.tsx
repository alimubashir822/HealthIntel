'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  FileText, 
  Stethoscope, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  LogOut, 
  Printer, 
  Activity, 
  Lock,
  MessageSquare,
  Sparkles,
  Folder,
  Download,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { handleLogout, submitDoctorNote, sendMessage } from '../../actions';

interface LabResult {
  id: string;
  testName: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: string;
}

interface DoctorNote {
  id: string;
  note: string;
  createdAt: Date;
}

interface Report {
  id: string;
  title: string;
  testDate: Date;
  status: string;
  fileUrl: string | null;
  results: LabResult[];
  doctorNotes: DoctorNote[];
}

interface Patient {
  id: string;
  name: string;
  email: string;
  gender: string | null;
  dateOfBirth: string | null;
  reports: Report[];
}

interface AuditLog {
  id: string;
  action: string;
  timestamp: Date;
}

interface Message {
  id: string;
  patientId: string;
  doctorId: string;
  senderRole: string;
  content: string;
  createdAt: Date;
}

interface TimelineEvent {
  id: string;
  patientId: string;
  title: string;
  eventType: string;
  eventDate: Date;
  description: string | null;
}

interface Document {
  id: string;
  patientId: string;
  title: string;
  category: string;
  fileSize: string;
  fileUrl: string | null;
  uploadedAt: Date;
}

interface DoctorDashboardClientProps {
  sessionUser: {
    name: string;
    email: string;
    role: string;
  };
  currentDoctorId: string;
  patients: Patient[];
  auditLogs: AuditLog[];
  initialMessages: Message[];
  initialTimelineEvents: TimelineEvent[];
  initialDocuments: Document[];
}

export default function DoctorDashboardClient({
  sessionUser,
  currentDoctorId,
  patients,
  auditLogs,
  initialMessages,
  initialTimelineEvents,
  initialDocuments
}: DoctorDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patients.length > 0 ? patients[0].id : ''
  );
  
  // Mobile master-detail layout toggle state
  const [showMobileDirectory, setShowMobileDirectory] = useState(true);

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

  // Selected report for the active patient
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Fallback / Auto-selection logic for reports when patient changes
  const activeReports = selectedPatient?.reports || [];
  const currentReportId = selectedReportId && activeReports.some(r => r.id === selectedReportId)
    ? selectedReportId
    : activeReports.length > 0 ? activeReports[0].id : null;

  const activeReport = activeReports.find(r => r.id === currentReportId) || null;

  // Form states
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New state variables for longitudinal patient datasets
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(initialTimelineEvents);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'timeline' | 'documents' | 'chat'>('reports');

  // Chat/Messaging input states
  const [chatInputText, setChatInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Filter patient sub-records
  const patientMessages = messages.filter(m => m.patientId === selectedPatientId);
  const patientTimelineEvents = timelineEvents.filter(t => t.patientId === selectedPatientId);
  const patientDocuments = documents.filter(d => d.patientId === selectedPatientId);

  useEffect(() => {
    setActiveSubTab('reports');
  }, [selectedPatientId]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || !selectedPatientId) return;

    const userText = chatInputText.trim();
    setChatInputText('');
    setChatLoading(true);

    const res = await sendMessage(selectedPatientId, currentDoctorId, 'DOCTOR', userText);
    setChatLoading(false);

    if (res.success && res.message) {
      const newMsg = { ...res.message, createdAt: new Date(res.message.createdAt) } as Message;
      setMessages(prev => [...prev, newMsg]);
    } else {
      alert(res.error || 'Failed to dispatch message.');
    }
  };

  // Search filter patients
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Presets templates for common reviews
  const presets = [
    {
      title: "Normal Review",
      text: "Your overall blood counts and cholesterol are completely normal. Keep up the healthy diet and regular physical activity."
    },
    {
      title: "Vitamin D Low",
      text: "Your Vitamin D is slightly low. I recommend taking a daily 2000 IU Vitamin D3 supplement and rechecking in 3 months."
    },
    {
      title: "High Cholesterol",
      text: "Your total cholesterol is slightly elevated. Let's try adjusting your diet to reduce saturated fats, and we will monitor this in our next checkup."
    }
  ];

  const handleApplyPreset = (text: string) => {
    setNoteText(text);
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReportId || !noteText.trim()) return;

    setSubmitting(true);
    setStatusMessage(null);
    const res = await submitDoctorNote(currentReportId, currentDoctorId, noteText);
    setSubmitting(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Clinical review notes successfully submitted and patient notified.' });
      setNoteText('');
      
      // Update report status in local state (or rely on page revalidation, let's keep local state responsive)
      if (activeReport) {
        activeReport.status = 'Reviewed';
        activeReport.doctorNotes.push({
          id: Math.random().toString(),
          note: noteText,
          createdAt: new Date(),
        });
      }
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to submit review notes.' });
    }
  };

  // Get status class for results
  const getResultStatusClass = (status: string) => {
    if (status === 'Normal') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (status === 'High') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    if (status === 'Low') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-650';
  };

  return (
    <div className="flex-1 flex bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 font-sans relative">
      
      {/* Sidebar Navigation */}
      <aside className="no-print hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 z-20 shrink-0">
        <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400 mb-8">
          <Activity className="h-6 w-6" />
          <span className="font-bold text-lg tracking-tight">Physician Portal</span>
        </div>

        {/* Doctor Identity Card */}
        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            DR
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold truncate text-slate-850 dark:text-slate-200">{sessionUser.name}</h4>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Internal Medicine</span>
          </div>
        </div>

        <nav className="flex-grow space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 mb-2">Workspace</div>
          <div className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white shadow-lg shadow-emerald-600/10">
            <User className="h-4 w-4" />
            <span>Patient Directory</span>
          </div>
        </nav>

        {/* Sign out */}
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
              className="text-[10px] text-slate-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 font-bold hover:underline transition duration-150 block"
            >
              Healthcare system by Med Clinic X
            </a>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        {/* Header (No-Print) */}
        <header className="no-print h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10 sticky top-0">
          <h2 className="font-bold text-md text-slate-800 dark:text-white hidden md:block">
            Dashboard overview
          </h2>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              HIPAA Cryptographic Session Active
            </span>
            <form action={handleLogout} className="md:hidden">
              <button
                type="submit"
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/5 border border-rose-500/10 cursor-pointer animate-pulse-slow"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Body Content */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Patients Directory (No-Print) */}
          <div className={`no-print ${showMobileDirectory ? 'block' : 'hidden lg:block'} lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Patients Directory</h3>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-500 font-bold">{filteredPatients.length}</span>
            </div>

            {/* Search Patients */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Patients List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredPatients.map((p) => {
                // Check if patient has any report awaiting review (status is "Completed" rather than "Reviewed")
                const hasPending = p.reports.some(r => r.status === 'Completed');
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setSelectedReportId(null); // Reset active report
                      setStatusMessage(null);
                      setShowMobileDirectory(false); // Hide directory on mobile to show workspace
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      selectedPatientId === p.id
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {p.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.name}</h4>
                        <span className="text-[9px] text-slate-500 truncate block mt-0.5">{p.email}</span>
                      </div>
                    </div>
                    {hasPending ? (
                      <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        Needs Review
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Clinical Workspace tabs */}
          <div className={`${!selectedPatientId || showMobileDirectory ? 'hidden lg:block' : 'block'} lg:col-span-8 space-y-6`}>
            
            {selectedPatient && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-4">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setShowMobileDirectory(true)}
                    className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer mr-1"
                    aria-label="Back to patients directory"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedPatient.name}</h3>
                    <p className="text-xs text-slate-505 dark:text-slate-455 mt-0.5">
                      DOB: {selectedPatient.dateOfBirth || 'N/A'} | Gender: {selectedPatient.gender || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Sub-tab switcher menu in header */}
                <div className="flex bg-slate-105 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
                  {[
                    { id: 'reports', label: 'Reports', icon: FileText },
                    { id: 'timeline', label: 'Timeline', icon: Clock },
                    { id: 'documents', label: 'Documents', icon: Folder },
                    { id: 'chat', label: 'Messaging', icon: MessageSquare }
                  ].map((subTab) => {
                    const TabIcon = subTab.icon;
                    const isActive = activeSubTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        type="button"
                        onClick={() => setActiveSubTab(subTab.id as any)}
                        className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                          isActive 
                            ? 'bg-emerald-605 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <TabIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{subTab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: REPORTS */}
            {activeSubTab === 'reports' && (
              <div className="space-y-6">
                {/* Switch reports dropdown */}
                {selectedPatient && selectedPatient.reports.length > 0 && (
                  <div className="flex justify-end">
                    <div className="relative w-full md:w-64">
                      <select
                        value={currentReportId || ''}
                        onChange={(e) => {
                          setSelectedReportId(e.target.value);
                          setStatusMessage(null);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-350 cursor-pointer pr-8 shadow-sm"
                      >
                        {selectedPatient.reports.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.title} ({new Date(r.testDate).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <FileText className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* AI Clinical Pre-Review Digest Card */}
                {selectedPatient && (
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-500/10 rounded-2xl p-5 space-y-3 no-print">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400">
                        <Sparkles className="h-4 w-4 animate-pulse-slow" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">AI Clinical Pre-Review Digest</span>
                      </div>
                      <span className="bg-indigo-650/10 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-305 px-2.5 py-0.5 rounded-full text-[9px] font-bold">HIPAA Compliant Assistant</span>
                    </div>
                    
                    <div className="text-xs space-y-3">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Patient History Summary:</span>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Parsed {selectedPatient.reports.length} longitudinal panels. Primary active parameters monitored: Cholesterol, Hemoglobin, Vitamin D, TSH.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/40 dark:border-slate-800/60">
                        <div>
                          <span className="font-bold text-slate-855 dark:text-slate-300">Biometric Changes Detected:</span>
                          <ul className="list-disc pl-4 mt-1.5 space-y-1 text-slate-500 dark:text-slate-400">
                            {selectedPatient.name.includes('Sarah') ? (
                              <>
                                <li>Cholesterol: Decreased from **210** to **170 mg/dL** (Improved, -19.0%)</li>
                                <li>Vitamin D: Increased from **28** to **32 ng/mL** (Normal, +14.3%)</li>
                              </>
                            ) : (
                              <li>No significant biometric shifts detected (clinical indicators stable).</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-slate-855 dark:text-slate-300">Recommended Consultation Topics:</span>
                          <ul className="list-disc pl-4 mt-1.5 space-y-1 text-slate-500 dark:text-slate-400">
                            {selectedPatient.name.includes('Sarah') ? (
                              <>
                                <li>Saturated fats management for cholesterol maintenance.</li>
                                <li>Vitamin D3 supplementation dosing (currently stable at 32 ng/mL).</li>
                              </>
                            ) : (
                              <li>Standard routine health and wellness review counseling.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeReport ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col space-y-6 animate-in fade-in duration-150">
                    
                    {/* Lab Header details */}
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeReport.title}</h3>
                        <span className="text-[10px] text-slate-400 mt-1 block">Test Accession: {activeReport.id}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        activeReport.status === 'Reviewed'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10'
                          : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10'
                      }`}>
                        {activeReport.status}
                      </span>
                    </div>

                    {/* Lab results table */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-3">Report Findings</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-955 border-b border-slate-200 dark:border-slate-800">
                              <th className="px-4 py-3 font-bold text-slate-550 dark:text-slate-400">Test Parameter</th>
                              <th className="px-4 py-3 font-bold text-slate-550 dark:text-slate-400 text-right">Value</th>
                              <th className="px-4 py-3 font-bold text-slate-550 dark:text-slate-400">Unit</th>
                              <th className="px-4 py-3 font-bold text-slate-550 dark:text-slate-400">Reference Range</th>
                              <th className="px-4 py-3 font-bold text-slate-550 dark:text-slate-400 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                            {activeReport.results.map((res) => (
                              <tr key={res.id}>
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-205">{res.testName}</td>
                                <td className="px-4 py-3 text-right font-semibold">{res.value.toFixed(1)}</td>
                                <td className="px-4 py-3 text-slate-550 dark:text-slate-400">{res.unit}</td>
                                <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{res.referenceRange}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${getResultStatusClass(res.status)}`}>
                                    {res.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Submitting Clinical Comments Notes Form */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-505 dark:text-slate-450 flex items-center space-x-1.5 mb-4">
                        <Stethoscope className="h-4.5 w-4.5 text-emerald-505" />
                        <span>Clinician Sign-off & Notes</span>
                      </h4>

                      {statusMessage && (
                        <div className={`p-4 rounded-xl text-xs mb-4 ${
                          statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {statusMessage.text}
                        </div>
                      )}

                      {/* Previous comments list */}
                      {activeReport.doctorNotes.length > 0 && (
                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl space-y-2">
                          <span className="text-[9px] font-bold text-emerald-600 uppercase">Existing Clinician Note</span>
                          <p className="text-xs text-slate-700 dark:text-slate-350 italic">
                            "{activeReport.doctorNotes[0].note}"
                          </p>
                          <span className="block text-[8px] text-slate-450">
                            Submitted on: {new Date(activeReport.doctorNotes[0].createdAt).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Comments Input Form */}
                      <form onSubmit={handleSubmitNote} className="space-y-4">
                        <div>
                          <label htmlFor="comments" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Add Review Note (Sends alert to patient)
                          </label>
                          <textarea
                            id="comments"
                            rows={4}
                            required
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Write clinical comments, supplements recommendation, dietary tweaks, or scheduling a follow-up visit..."
                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Presets tagging helper */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-1">
                            <Sparkles className="h-3 w-3 text-emerald-500" />
                            <span>Quick Presets:</span>
                          </span>
                          {presets.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleApplyPreset(p.text)}
                              className="bg-slate-100 hover:bg-emerald-500/10 dark:bg-slate-900 border border-slate-250/60 dark:border-slate-800 text-[10px] px-2.5 py-1 rounded-lg text-slate-655 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition cursor-pointer"
                            >
                              {p.title}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={submitting || !noteText.trim()}
                            className="bg-emerald-605 hover:bg-emerald-700 text-white rounded-xl px-5 py-3 text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-605/10"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>{submitting ? 'Releasing...' : 'Submit & Release to Patient'}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-905 p-24 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400">
                    <FileText className="h-10 w-10 mx-auto text-slate-350 dark:text-slate-700 mb-2" />
                    <p className="text-sm">Patient has no registered laboratory reports.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: TIMELINE */}
            {activeSubTab === 'timeline' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col space-y-6 shadow-sm animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <Clock className="h-4.5 w-4.5 text-emerald-500" />
                    <span>Clinical timeline records</span>
                  </h3>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Longitudinal History</span>
                </div>

                {patientTimelineEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No medical timeline events logged.</p>
                  </div>
                ) : (
                  <div className="relative border-l border-emerald-100 dark:border-slate-800 ml-4 pl-8 space-y-8 py-4 mt-6">
                    {patientTimelineEvents.map((event) => (
                      <div key={event.id} className="relative group">
                        <div className="absolute -left-[45px] top-1 h-8 w-8 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-605 dark:text-emerald-450 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold ring-4 ring-emerald-50 dark:ring-emerald-950/10">
                          {event.eventType === 'Report' ? '🩸' : event.eventType === 'Visit' ? '❤️' : event.eventType === 'Medication' ? '💊' : '📄'}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-emerald-605 dark:text-emerald-450 tracking-wide uppercase">
                              {new Date(event.eventDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wide">
                              {event.eventType}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                            {event.title}
                          </h4>
                          
                          {event.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: DOCUMENTS */}
            {activeSubTab === 'documents' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <Folder className="h-5 w-5 text-emerald-555" />
                      <span>Patient Health Archives</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Secure clinical documents uploaded by patient or clinical networks</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['Imaging', 'Prescriptions', 'Vaccinations', 'Insurance'].map((cat) => {
                    const count = patientDocuments.filter(d => d.category === cat).length;
                    return (
                      <div key={cat} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl text-center shadow-sm hover:border-emerald-555 transition cursor-pointer">
                        <Folder className="h-8 w-8 text-emerald-555 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">{cat}</h4>
                        <span className="text-[10px] text-slate-400 mt-1 block font-semibold">{count} Files</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Health Archive Files</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850">
                          <th className="px-4 py-3 font-bold text-slate-550">Document Title</th>
                          <th className="px-4 py-3 font-bold text-slate-550">Category</th>
                          <th className="px-4 py-3 font-bold text-slate-555">File Size</th>
                          <th className="px-4 py-3 font-bold text-slate-555">Uploaded Date</th>
                          <th className="px-4 py-3 font-bold text-slate-555 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                        {patientDocuments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                              No records uploaded in patient archives.
                            </td>
                          </tr>
                        ) : (
                          patientDocuments.map((doc) => (
                            <tr key={doc.id}>
                              <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                📄 {doc.title}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  {doc.category}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-slate-500">{doc.fileSize}</td>
                              <td className="px-4 py-3.5 text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3.5 text-right">
                                <a
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); alert('Simulating secure clinical file download...'); }}
                                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center justify-end space-x-1 hover:underline"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download</span>
                                </a>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SECURE CHAT */}
            {activeSubTab === 'chat' && selectedPatient && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[550px] animate-in fade-in duration-150">
                <div className="bg-slate-55 dark:bg-slate-955 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 flex items-center justify-center font-bold">
                      {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">Secure Channel: {selectedPatient.name}</h3>
                      <span className="text-[9px] font-semibold text-emerald-500 flex items-center space-x-1">
                        <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse-slow"></span>
                        <span>Direct Encrypted Provider-Patient Link</span>
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide font-mono">
                    HIPAA Encrypted
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
                  {patientMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
                      <MessageSquare className="h-12 w-12 text-slate-300" />
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-202">No Consultation History</h4>
                      <p className="text-xs text-slate-500">
                        Start a secure clinical dialogue with {selectedPatient.name} regarding reports or medication changes.
                      </p>
                    </div>
                  ) : (
                    patientMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3.5 max-w-[85%] ${
                          msg.senderRole === 'DOCTOR' ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          msg.senderRole === 'DOCTOR'
                            ? 'bg-emerald-605 text-white'
                            : 'bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {msg.senderRole === 'DOCTOR' ? 'ME' : msg.senderRole.substring(0, 2)}
                        </div>
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          msg.senderRole === 'DOCTOR'
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200 border border-emerald-555/10 rounded-tr-none'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                        }`}>
                          <p>{msg.content}</p>
                          <span className="block text-[8px] text-slate-400 mt-2 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex items-start gap-3.5 max-w-[85%] ml-auto flex-row-reverse">
                      <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0 text-white">
                        ME
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/20 text-xs text-slate-500 font-semibold flex items-center space-x-2 rounded-tr-none">
                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        <span>Encrypting message payload...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center">
                  <span className="text-[9px] font-bold text-slate-455">Clinical Recommendations:</span>
                  {[
                    'Review cholesterol lipid metrics at next checkup.',
                    'Sustain Vitamin D supplement intake.',
                    'Schedule follow-up diagnostics in 3 months.'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setChatInputText(tag)}
                      className="bg-white hover:bg-emerald-500/10 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-[9px] px-2.5 py-1 rounded-lg text-slate-605 hover:text-emerald-650 dark:text-slate-400 dark:hover:text-emerald-450 transition cursor-pointer font-semibold"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendChatMessage} className="bg-slate-55 dark:bg-slate-955 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    disabled={chatLoading}
                    placeholder="Send secure clinical recommendation note..."
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-805 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-emerald-505 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInputText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition disabled:opacity-50 shrink-0 cursor-pointer shadow-md shadow-emerald-606/10"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* HIPAA Compliance Logs (No-Print) */}
            <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Physician Access Security Audit</h3>
                <p className="text-[10px] text-slate-500">
                  Secure log tracing for HIPAA compliance. All report reads and comment additions are recorded.
                </p>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-850 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-600 dark:text-slate-400">{log.action}</span>
                    <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
