'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Brain, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Download, 
  FileText, 
  FlaskConical, 
  Lock, 
  LogOut, 
  MessageSquare, 
  Printer, 
  Search, 
  Share2, 
  Shield, 
  Stethoscope,
  TrendingUp, 
  User, 
  Users, 
  AlertTriangle,
  Send,
  X,
  Bell,
  Sparkles,
  FileCheck,
  Languages,
  ChevronRight,
  ChevronLeft,
  Menu,
  TrendingDown,
  Folder
} from 'lucide-react';
import { 
  handleLogout, 
  createReportShare, 
  markNotificationAsRead, 
  getReportAIInterpretation,
  compareReportsAI,
  generateDoctorPrepAI,
  sendMessage,
  uploadDocument,
  toggleGoal,
  syncWearables
} from '../../actions';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  patientId?: string;
}

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
  reportId: string;
  doctorId: string;
  note: string;
  createdAt: Date;
  doctor: {
    user: {
      name: string;
    }
  }
}

interface ReportShare {
  id: string;
  sharedWith: string;
  accessDays: number;
  permission: string;
  token: string;
  expiresAt: Date;
}

interface Report {
  id: string;
  patientId: string;
  title: string;
  testDate: Date;
  status: string;
  fileUrl: string | null;
  results: LabResult[];
  doctorNotes: DoctorNote[];
  shares: ReportShare[];
  patient: {
    user: {
      name: string;
    }
  }
}

interface Notification {
  id: string;
  message: string;
  status: string;
  createdAt: Date;
}

interface AuditLog {
  id: string;
  action: string;
  timestamp: Date;
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

interface TimelineEvent {
  id: string;
  patientId: string;
  title: string;
  eventType: string;
  eventDate: Date;
  description: string | null;
}

interface Message {
  id: string;
  patientId: string;
  doctorId: string;
  senderRole: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: Date;
}

interface Goal {
  id: string;
  patientId: string;
  title: string;
  completed: boolean;
  updatedAt: Date;
}

interface WearableData {
  id: string;
  patientId: string;
  dataType: string;
  value: number;
  timestamp: Date;
}

interface PatientDashboardClientProps {
  sessionUser: SessionUser;
  currentPatientId: string;
  familyMembers: {
    id: string;
    name: string;
    email: string;
    gender: string | null;
    dateOfBirth: string | null;
  }[];
  reports: Report[];
  initialNotifications: Notification[];
  auditLogs: AuditLog[];
  initialDocuments: Document[];
  initialTimelineEvents: TimelineEvent[];
  initialMessages: Message[];
  initialGoals: Goal[];
  initialWearables: WearableData[];
}

export default function PatientDashboardClient({
  sessionUser,
  currentPatientId,
  familyMembers,
  reports,
  initialNotifications,
  auditLogs,
  initialDocuments,
  initialTimelineEvents,
  initialMessages,
  initialGoals,
  initialWearables
}: PatientDashboardClientProps) {
  // Navigation / Tab Selection
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'ai' | 'security' | 'compare' | 'timeline' | 'documents' | 'messages' | 'wearables' | 'ehr'>('dashboard');
  
  // Selected Patient (Family Account Switcher)
  const [selectedPatientId, setSelectedPatientId] = useState<string>(currentPatientId);
  
  // Local state variables for Phase 4 models
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(initialTimelineEvents);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [wearables, setWearables] = useState<WearableData[]>(initialWearables);

  // Mobile navigation and master-detail states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileReportsList, setShowMobileReportsList] = useState(true);

  // Filtered collections based on selected patient id
  const patientDocuments = documents.filter(d => d.patientId === selectedPatientId);
  const patientTimelineEvents = timelineEvents.filter(t => t.patientId === selectedPatientId);
  const patientMessages = messages.filter(m => m.patientId === selectedPatientId);
  const patientGoals = goals.filter(g => g.patientId === selectedPatientId);
  const patientWearables = wearables.filter(w => w.patientId === selectedPatientId);

  // Local Notifications state
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Filtered reports based on selected family member
  const patientReports = reports.filter(r => r.patientId === selectedPatientId);
  
  // Selected Report
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    patientReports.length > 0 ? patientReports[0].id : null
  );

  // Auto-switch selected report when patient updates
  useEffect(() => {
    const updatedReports = reports.filter(r => r.patientId === selectedPatientId);
    if (updatedReports.length > 0) {
      setSelectedReportId(updatedReports[0].id);
    } else {
      setSelectedReportId(null);
    }
    // Clear AI chat and comparison data when switching patients
    setAiChatMessages([]);
    setComparisonResult(null);
  }, [selectedPatientId, reports]);

  // Selected report object
  const activeReport = reports.find(r => r.id === selectedReportId) || null;

  // Search & Filter Reports
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredReportsList = patientReports.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Notification action handler
  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsRead(id);
    if (res.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // Secure Sharing States
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [shareDoctorName, setShareDoctorName] = useState('');
  const [shareDays, setShareDays] = useState(7);
  const [generatedShareUrl, setGeneratedShareUrl] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);

  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !shareDoctorName.trim()) return;

    setSharingLoading(true);
    const res = await createReportShare(selectedReportId, shareDoctorName, shareDays);
    setSharingLoading(false);

    if (res.success && res.shareUrl) {
      const baseUrl = window.location.origin;
      setGeneratedShareUrl(`${baseUrl}${res.shareUrl}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedShareUrl);
    alert('Sharing link copied to clipboard!');
  };

  // AI Lab Report Assistant Chat State
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [aiInputText, setAiInputText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<string>('en');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatMessages, aiLoading]);

  // Trigger quick summary from AI
  const handleTriggerSummary = async () => {
    if (!selectedReportId) return;
    setAiLoading(true);
    
    let summaryPrompt = 'Please summarize my report and explain key results.';
    if (aiLanguage === 'es') summaryPrompt = 'Por favor, resuma mi informe y explique los resultados clave.';
    if (aiLanguage === 'ar') summaryPrompt = 'يرجى تلخيص تقريري وشرح النتائج الرئيسية.';

    setAiChatMessages(prev => [...prev, { sender: 'user', text: summaryPrompt }]);
    
    const res = await getReportAIInterpretation(selectedReportId, undefined, aiLanguage);
    setAiLoading(false);
    
    if (res.content) {
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: res.content }]);
    } else {
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: 'An error occurred summarizing the report.' }]);
    }
  };

  // Trigger discuss questions
  const handleTriggerQuestions = async () => {
    if (!selectedReportId) return;
    setAiLoading(true);
    
    let questionPrompt = 'What questions should I discuss with my physician?';
    if (aiLanguage === 'es') questionPrompt = '¿Qué preguntas debería discutir con mi médico?';
    if (aiLanguage === 'ar') questionPrompt = 'ما هي الأسئلة التي يجب أن أطرحها على طبيبي؟';

    setAiChatMessages(prev => [...prev, { sender: 'user', text: questionPrompt }]);
    
    const res = await getReportAIInterpretation(selectedReportId, 'What are the top questions to discuss with my doctor?', aiLanguage);
    setAiLoading(false);
    
    if (res.content) {
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: res.content }]);
    } else {
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: 'Failed to generate questions. Please ask me directly!' }]);
    }
  };

  // Custom AI Query submission
  const handleSendCustomQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !aiInputText.trim()) return;

    const userText = aiInputText.trim();
    setAiInputText('');
    setAiChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setAiLoading(true);

    const res = await getReportAIInterpretation(selectedReportId, userText, aiLanguage);
    setAiLoading(false);

    if (res.content) {
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: res.content }]);
    } else {
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: 'I am unable to evaluate that specific query. Please consult your primary care doctor.' }]);
    }
  };

  // Report Comparison Engine States
  const [compareId1, setCompareId1] = useState('');
  const [compareId2, setCompareId2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Initialize compare IDs when list changes
  useEffect(() => {
    if (patientReports.length >= 2) {
      setCompareId1(patientReports[0].id);
      setCompareId2(patientReports[1].id);
    } else if (patientReports.length === 1) {
      setCompareId1(patientReports[0].id);
      setCompareId2('');
    } else {
      setCompareId1('');
      setCompareId2('');
    }
    setComparisonResult(null);
  }, [selectedPatientId, reports]);

  const handleGenerateComparison = async () => {
    if (!compareId1 || !compareId2) return;
    setComparisonLoading(true);
    const res = await compareReportsAI(compareId1, compareId2);
    setComparisonLoading(false);
    if (!res.error) {
      setComparisonResult(res);
    } else {
      alert(res.error);
    }
  };

  // AI Doctor Visit Prep States
  const [doctorPrepModalOpen, setDoctorPrepModalOpen] = useState(false);
  const [doctorPrepContent, setDoctorPrepContent] = useState('');
  const [doctorPrepLoading, setDoctorPrepLoading] = useState(false);

  const handleTriggerDoctorPrep = async () => {
    setDoctorPrepModalOpen(true);
    setDoctorPrepLoading(true);
    const res = await generateDoctorPrepAI(selectedPatientId);
    setDoctorPrepLoading(false);
    if (res.content) {
      setDoctorPrepContent(res.content);
    } else {
      setDoctorPrepContent('Failed to compile appointment planner checklist.');
    }
  };

  // Doctor ID lookup dynamically
  const primaryDoctorId = reports.flatMap(r => r.doctorNotes).find(n => n.doctorId)?.doctorId || 'default-doctor-id';

  // Secure Patient-Doctor Messages Handlers
  const [chatInputText, setChatInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    
    const userText = chatInputText.trim();
    setChatInputText('');
    setChatLoading(true);

    const res = await sendMessage(selectedPatientId, primaryDoctorId, 'PATIENT', userText);
    setChatLoading(false);

    if (res.success && res.message) {
      const newMsg = { ...res.message, createdAt: new Date(res.message.createdAt) } as Message;
      setMessages(prev => [...prev, newMsg]);

      // Mock dynamic Doctor auto-reply after 1.5 seconds for clinical interaction feel
      setTimeout(async () => {
        const replyRes = await sendMessage(
          selectedPatientId,
          primaryDoctorId,
          'DOCTOR',
          `Hello Sarah, Dr. Robert Chen here. I have received your message regarding: "${userText.length > 40 ? userText.substring(0, 40) + '...' : userText}". I will review this with your clinical records and get back to you shortly, or we can discuss it in our upcoming consultation.`
        );
        if (replyRes.success && replyRes.message) {
          const replyMsg = { ...replyRes.message, createdAt: new Date(replyRes.message.createdAt) } as Message;
          setMessages(prev => [...prev, replyMsg]);
        }
      }, 1500);
    }
  };

  // Smart Documents Handlers
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadDocCategory, setUploadDocCategory] = useState('Prescriptions');
  const [uploadDocLoading, setUploadDocLoading] = useState(false);

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocTitle.trim() || !uploadDocCategory) return;

    setUploadDocLoading(true);
    const mockSize = (Math.random() * 3 + 0.5).toFixed(1) + ' MB';
    const res = await uploadDocument(selectedPatientId, uploadDocTitle, uploadDocCategory, mockSize);
    setUploadDocLoading(false);

    if (res.success && res.document) {
      const newDoc = { ...res.document, uploadedAt: new Date(res.document.uploadedAt) } as Document;
      setDocuments(prev => [newDoc, ...prev]);
      
      // Also add the corresponding timeline event locally
      const mockEvent: TimelineEvent = {
        id: Math.random().toString(),
        patientId: selectedPatientId,
        title: `Uploaded document: ${uploadDocTitle}`,
        eventType: 'Document',
        eventDate: new Date(),
        description: `New archive added to category "${uploadDocCategory}". Size: ${mockSize}.`
      };
      setTimelineEvents(prev => [mockEvent, ...prev]);

      setUploadDocTitle('');
      alert('Document successfully uploaded and parsed into smart records.');
    } else {
      alert(res.error || 'Failed to upload document.');
    }
  };

  // Goals Checkbox Handler
  const handleToggleGoalCheck = async (goalId: string) => {
    // Optimistic toggle
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g));
    const res = await toggleGoal(goalId);
    if (res.error) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g));
      alert(res.error);
    }
  };

  // Wearables Synchronization Handler
  const [syncingWearables, setSyncingWearables] = useState(false);
  const handleSyncWearablesData = async () => {
    setSyncingWearables(true);
    const res = await syncWearables(selectedPatientId);
    setSyncingWearables(false);
    if (res.success) {
      setWearables(prev => prev.map(w => {
        if (w.patientId === selectedPatientId) {
          if (w.dataType === 'Steps') return { ...w, value: Math.floor(8000 + Math.random() * 3000), timestamp: new Date() };
          if (w.dataType === 'HeartRate') return { ...w, value: Math.floor(68 + Math.random() * 15), timestamp: new Date() };
          if (w.dataType === 'Sleep') return { ...w, value: parseFloat((6.5 + Math.random() * 2).toFixed(1)), timestamp: new Date() };
        }
        return w;
      }));
      alert('Vitals synchronized successfully from Apple Watch / Fitbit.');
    } else {
      alert(res.error || 'Sync failed.');
    }
  };

  // Extract Organ-based scorecards dynamically from latest reports
  const getOrganSystemsData = () => {
    const latestReps = [...patientReports].sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
    
    // Heart Health (Cholesterol)
    let heartVal: string | null = null;
    let heartStatus = 'N/A';
    latestReps.forEach(r => {
      const c = r.results.find(res => res.testName.toLowerCase() === 'cholesterol');
      if (c && !heartVal) {
        heartVal = `${c.value} ${c.unit}`;
        heartStatus = c.status;
      }
    });

    // Hematology (Hemoglobin, WBC)
    let bloodVal: string | null = null;
    let bloodStatus = 'N/A';
    latestReps.forEach(r => {
      const h = r.results.find(res => res.testName.toLowerCase() === 'hemoglobin');
      if (h && !bloodVal) {
        bloodVal = `${h.value} ${h.unit}`;
        bloodStatus = h.status;
      }
    });

    // Vitamins & Micronutrients (Vitamin D, B12)
    let vitVal: string | null = null;
    let vitStatus = 'N/A';
    latestReps.forEach(r => {
      const v = r.results.find(res => res.testName.toLowerCase() === 'vitamin d');
      if (v && !vitVal) {
        vitVal = `${v.value} ${v.unit}`;
        vitStatus = v.status;
      }
    });

    // Metabolic / Thyroid (TSH)
    let thyroidVal: string | null = null;
    let thyroidStatus = 'N/A';
    latestReps.forEach(r => {
      const t = r.results.find(res => res.testName.toLowerCase() === 'tsh');
      if (t && !thyroidVal) {
        thyroidVal = `${t.value} ${t.unit}`;
        thyroidStatus = t.status;
      }
    });

    return {
      heart: { value: heartVal || 'Pending Panel', status: heartStatus },
      blood: { value: bloodVal || 'Pending Panel', status: bloodStatus },
      vitamins: { value: vitVal || 'Pending Panel', status: vitStatus },
      thyroid: { value: thyroidVal || 'Pending Panel', status: thyroidStatus }
    };
  };

  const organData = getOrganSystemsData();

  // Extract cholesterol values for Selected Patient for Health Trend Analytics
  const getCholesterolTrendData = () => {
    const trendReports = reports
      .filter(r => r.patientId === selectedPatientId)
      .sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());

    const data: { dateStr: string; value: number }[] = [];
    trendReports.forEach(r => {
      const cholResult = r.results.find(res => res.testName.toLowerCase() === 'cholesterol');
      if (cholResult) {
        data.push({
          dateStr: new Date(r.testDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          value: cholResult.value
        });
      }
    });

    return data;
  };

  const cholesterolData = getCholesterolTrendData();

  const handlePrint = () => {
    window.print();
  };

  // Get status CSS classes
  const getResultStatusClass = (status: string) => {
    if (status === 'Normal') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20';
    if (status === 'High') return 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20';
    if (status === 'Low') return 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  const getSystemBadgeClass = (status: string) => {
    if (status === 'Normal') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    if (status === 'High' || status === 'Low') return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  };

  const unreadCount = notifications.length;

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

            <div className="flex items-center space-x-3 text-indigo-650 dark:text-indigo-400 mb-8 mt-2">
              <Activity className="h-6 w-6 animate-pulse-slow" />
              <span className="font-bold text-base tracking-tight">MedClinicX HealthIntel</span>
            </div>

            {/* User Info card */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                {sessionUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{sessionUser.name}</h4>
                <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-505 block">Health Intelligence</span>
              </div>
            </div>

            {/* Sidebar nav list */}
            <nav className="flex-grow space-y-1 overflow-y-auto pr-1">
              {[
                { id: 'dashboard', label: 'Overview Dashboard', icon: Activity },
                { id: 'reports', label: 'Reports & History', icon: FileText },
                { id: 'compare', label: 'Comparison Engine', icon: TrendingUp },
                { id: 'ai', label: 'AI Interpret Assistant', icon: Brain },
                { id: 'security', label: 'Sharing & Audit Log', icon: Lock },
                { id: 'timeline', label: 'My Health Timeline', icon: Clock },
                { id: 'documents', label: 'My Documents Vault', icon: Folder },
                { id: 'messages', label: 'Secure Chat', icon: MessageSquare },
                { id: 'wearables', label: 'Wearables Sync', icon: Activity },
                { id: 'ehr', label: 'EHR Integration', icon: FlaskConical }
              ].map((item) => {
                const TabIcon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                        : 'text-slate-550 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
                    }`}
                  >
                    <TabIcon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Family switcher & sign out */}
            <div className="mt-auto border-t border-slate-250/20 dark:border-slate-800 pt-4">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-505 mb-2">
                Family Health Vault
              </label>
              <div className="relative">
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-505 text-slate-700 dark:text-slate-350 cursor-pointer"
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === currentPatientId ? '(You)' : ''}
                    </option>
                  ))}
                </select>
                <Users className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>

              <form action={handleLogout} className="mt-3">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 text-xs font-bold text-rose-500 hover:text-rose-600 px-4 py-2 rounded-xl border border-rose-500/10 hover:bg-rose-500/5 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Secure Sign Out</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar Layout */}
      <aside className="no-print hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 z-20 shrink-0">
        <div className="flex items-center space-x-3 text-indigo-650 dark:text-indigo-400 mb-8">
          <Activity className="h-6 w-6 animate-pulse-slow" />
          <span className="font-bold text-base tracking-tight">MedClinicX HealthIntel</span>
        </div>

        {/* User Card */}
        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            {sessionUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{sessionUser.name}</h4>
            <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-505 block">Health Intelligence</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Overview Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Reports & History</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'compare'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Comparison Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>AI Interpret Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Sharing & Audit Log</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'timeline'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Health Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'documents'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <Folder className="h-4 w-4" />
            <span>My Documents</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'messages'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Secure Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('wearables')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'wearables'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Wearables Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('ehr')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'ehr'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-850'
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>EHR Integration</span>
          </button>
        </nav>

        {/* Doctor Prep Shortcut in sidebar */}
        <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-2xl no-print text-center">
          <Sparkles className="h-5 w-5 text-indigo-650 dark:text-indigo-400 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Doctor Visit Planner</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 leading-normal">
            Prepare clinical checklists and questions before your appointment.
          </p>
          <button
            onClick={handleTriggerDoctorPrep}
            className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] py-2 rounded-xl font-bold transition cursor-pointer"
          >
            Generate Prep Sheet
          </button>
        </div>

        {/* Family Switcher */}
        <div className="mt-auto border-t border-slate-250/20 dark:border-slate-800 pt-6">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Family Health Vault
          </label>
          <div className="relative">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-350 cursor-pointer"
            >
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.id === currentPatientId ? '(You)' : ''}
                </option>
              ))}
            </select>
            <Users className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          <form action={handleLogout} className="mt-4">
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
              className="text-[10px] text-slate-400 hover:text-indigo-600 dark:text-slate-550 dark:hover:text-indigo-400 font-bold hover:underline transition duration-150 block"
            >
              Healthcare system by Med Clinic X
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Navbar */}
        <header className="no-print h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center space-x-3 md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-md text-slate-805 dark:text-white">HealthIntel</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              AI Health Intelligence Platform
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 dark:text-slate-450 italic">
              "Transform medical reports into meaningful health insights"
            </span>
          </div>

          {/* Mobile switcher, alerts and Logout */}
          <div className="flex items-center space-x-4">
            {/* Family switcher for mobile */}
            <div className="md:hidden relative">
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-750 dark:text-slate-300 cursor-pointer pr-7 pr-8"
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name.split(' ')[0]}
                  </option>
                ))}
              </select>
              <Users className="absolute right-2 top-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/80 pb-2 mb-2">
                    <span className="font-bold text-xs">Inbox Alerts</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-500/10 text-rose-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No notifications.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {notifications.map(n => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-505 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {n.status === 'UNREAD' && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-[9px] font-bold text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer uppercase shrink-0 pt-0.5"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Sign Out */}
            <form action={handleLogout} className="md:hidden">
              <button
                type="submit"
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/5 border border-rose-500/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Tab content containers */}
        <div className="flex-1 p-6 md:p-8 space-y-8">
          
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 no-print animate-in fade-in duration-200">
              
              {/* Header Greeting & Doctor visit prep trigger */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Good Morning, {familyMembers.find(m => m.id === selectedPatientId)?.name.split(' ')[0]} 👋
                  </h2>
                  <p className="text-sm text-slate-505 dark:text-slate-400 mt-1">
                    Your longitudinal health diagnostics, tracked and interpreted in real time.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTriggerDoctorPrep}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 dark:bg-indigo-950/40 dark:text-indigo-305 dark:border-indigo-900 rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center space-x-2 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Doctor Visit Preparation</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('compare')}
                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Compare Lab Reports</span>
                  </button>
                </div>
              </div>

              {/* Organ Systems Overview + Health Score radial widget */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* Organ Systems Scorecard (Left 8 cols) */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <Stethoscope className="h-4.5 w-4.5 text-indigo-500" />
                      <span>Organ Systems Scorecard</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Organ categories aggregated from your clinical records</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Heart Health */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-lg">
                          ❤️
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Cardiovascular</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Total Cholesterol</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                          {organData.heart.value}
                        </span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${getSystemBadgeClass(organData.heart.status)}`}>
                          {organData.heart.status}
                        </span>
                      </div>
                    </div>

                    {/* Hematology */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-lg">
                          🩸
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-355">Hematology</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Hemoglobin Level</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                          {organData.blood.value}
                        </span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${getSystemBadgeClass(organData.blood.status)}`}>
                          {organData.blood.status}
                        </span>
                      </div>
                    </div>

                    {/* Vitamins */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-lg">
                          🧬
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Vitamins & Minerals</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Vitamin D3 Baseline</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                          {organData.vitamins.value}
                        </span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${getSystemBadgeClass(organData.vitamins.status)}`}>
                          {organData.vitamins.status}
                        </span>
                      </div>
                    </div>

                    {/* Thyroid */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-lg">
                          🧪
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Metabolic & Thyroid</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Thyroid Stimulating TSH</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                          {organData.thyroid.value}
                        </span>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${getSystemBadgeClass(organData.thyroid.status)}`}>
                          {organData.thyroid.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health Intel Score widget (Right 4 cols) */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-center text-center">
                  <div className="w-full border-b border-slate-100 dark:border-slate-800 pb-3 mb-3 text-left">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Health Score</h3>
                  </div>

                  {/* Radial Gauge SVG */}
                  <div className="relative h-32 w-32 flex items-center justify-center mt-2">
                    <svg className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="64" cy="64" r="50" fill="transparent" stroke="var(--muted)" strokeWidth="8" />
                      <circle cx="64" cy="64" r="50" fill="transparent" stroke="rgb(99, 102, 241)" strokeWidth="8" strokeDasharray="314" strokeDashoffset="25.1" strokeLinecap="round" />
                    </svg>
                    <div className="text-center z-10">
                      <span className="text-3xl font-black text-indigo-650 dark:text-indigo-400">92%</span>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Score</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 w-full text-left">
                    <h4 className="font-bold text-xs text-center">Excellent Biometric Profiles</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed px-4 text-center">
                      Engagement high. Profile completeness: 90% | Reports uploaded: 12.
                    </p>

                    {/* Interactive Health Goals Checklist */}
                    <div className="mt-4 border-t border-slate-150 dark:border-slate-800 pt-4 px-2 w-full">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                        My Health Goals
                      </span>
                      <div className="space-y-2.5">
                        {patientGoals.map(g => (
                          <label key={g.id} className="flex items-start space-x-2.5 cursor-pointer text-[11px] select-none group">
                            <input
                              type="checkbox"
                              checked={g.completed}
                              onChange={() => handleToggleGoalCheck(g.id)}
                              className="mt-0.5 rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className={`${g.completed ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-750 dark:text-slate-300'} font-semibold leading-normal group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition duration-150`}>
                              {g.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Timeline + Cholesterol trends chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* My Lab History timeline */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <Calendar className="h-4.5 w-4.5 text-indigo-500" />
                      <span>My Lab History</span>
                    </h3>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Timeline</span>
                  </div>

                  {patientReports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No medical reports found.</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-indigo-150 dark:border-slate-800 ml-3 pl-6 space-y-8 py-2">
                      {patientReports.map((report) => (
                        <div key={report.id} className="relative group cursor-pointer" onClick={() => {
                          setSelectedReportId(report.id);
                          setActiveTab('reports');
                          setShowMobileReportsList(false);
                        }}>
                          <div className="absolute -left-[31px] top-1.5 h-3 w-3 bg-indigo-600 dark:bg-indigo-400 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ring-4 ring-indigo-50 dark:ring-indigo-950/20 group-hover:scale-125 transition"></div>
                          
                          <div>
                            <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 tracking-wide uppercase">
                              {new Date(report.testDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-205 mt-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {report.title}
                            </h4>
                            <div className="mt-2 flex items-center space-x-2.5">
                              <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                                {report.results.length} markers
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                report.status === 'Reviewed' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10'
                                  : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10'
                              }`}>
                                {report.status === 'Reviewed' ? '✓ Reviewed' : report.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trends Chart */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                        <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                        <span>Health Trend Analytics</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Biometric monitoring over historical reports</p>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cholesterol (mg/dL)</span>
                  </div>

                  {cholesterolData.length < 2 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                      <TrendingUp className="h-10 w-10 text-slate-350 dark:text-slate-700 mb-3 animate-pulse-slow" />
                      <p className="text-sm text-slate-550">More reports needed to trace health trends.</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between space-y-4">
                      {/* Premium Custom SVG Chart */}
                      <div className="w-full h-48 relative pt-4 pr-4">
                        <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                          <line x1="40" y1="75" x2="480" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                          <line x1="40" y1="130" x2="480" y2="130" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                          <line x1="40" y1="180" x2="480" y2="180" stroke="var(--border)" strokeWidth="1" />

                          {(() => {
                            const points = cholesterolData.map((d, index) => {
                              const x = 40 + (index / (cholesterolData.length - 1)) * 440;
                              const normalizedVal = Math.max(150, Math.min(230, d.value));
                              const y = 180 - ((normalizedVal - 150) / 80) * 160;
                              return { x, y, val: d.value };
                            });

                            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaPath = `${linePath} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;

                            return (
                              <>
                                <path d={areaPath} fill="url(#chartGradient)" />
                                <path d={linePath} fill="none" stroke="rgb(99, 102, 241)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_2px_4px_rgba(99,102,241,0.3)]" />
                                {points.map((p, i) => (
                                  <g key={i} className="group/node cursor-pointer">
                                    <circle cx={p.x} cy={p.y} r="6" fill="rgb(99, 102, 241)" stroke="white" strokeWidth="2.5" />
                                    <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px] font-bold fill-indigo-650 dark:fill-indigo-350 opacity-100 font-sans">
                                      {p.val}
                                    </text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>

                        <div className="absolute left-0 top-4 text-[9px] font-bold text-slate-400">230</div>
                        <div className="absolute left-0 text-[9px] font-bold text-slate-400" style={{ top: '37.5%' }}>190</div>
                        <div className="absolute left-0 bottom-4 text-[9px] font-bold text-slate-400">150</div>
                      </div>

                      {/* X-Axis labels */}
                      <div className="flex justify-between pl-10 pr-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {cholesterolData.map((d, index) => (
                          <span key={index} className="text-[10px] font-bold text-slate-500 dark:text-slate-450">
                            {d.dateStr}
                          </span>
                        ))}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 flex items-start space-x-3 mt-4">
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">Cholesterol Reduction Trend Detected</span>
                          <p className="text-slate-500 mt-0.5 leading-relaxed">
                            Your total cholesterol decreased from **210 mg/dL** in Jan 2026 to **170 mg/dL** in June 2026. This reflects highly positive cardiovascular health progress!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: REPORTS & VIEWER */}
          {activeTab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
              
              {/* Left Column: Report List */}
              <div className={`${showMobileReportsList ? 'block' : 'hidden lg:block'} lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm no-print`}>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Available Reports</h3>
                
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search reports by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {filteredReportsList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No matching reports found.</p>
                  ) : (
                    filteredReportsList.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedReportId(r.id);
                          setShowMobileReportsList(false);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col cursor-pointer ${
                          selectedReportId === r.id
                            ? 'bg-indigo-650/5 dark:bg-indigo-950/20 border-indigo-500'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[9px] font-bold text-indigo-655 dark:text-indigo-400 uppercase">
                          {new Date(r.testDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                          {r.title}
                        </h4>
                        <div className="flex items-center justify-between mt-2.5 w-full">
                          <span className="text-[10px] text-slate-550 dark:text-slate-400">
                            {r.results.length} laboratory values
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'Reviewed' 
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : 'bg-indigo-500/10 text-indigo-600'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Viewer */}
              <div className={`${showMobileReportsList ? 'hidden lg:flex' : 'flex'} lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-8 shadow-sm print-container print-bordered relative overflow-hidden flex-col space-y-6`}>
                
                {activeReport ? (
                  <>
                    <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowMobileReportsList(true)}
                          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer mr-1"
                          aria-label="Back to reports list"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-505 dark:text-slate-400">
                          <Lock className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Clinical Document Signature Verified</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleTriggerDoctorPrep}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-305 dark:border-indigo-900 border border-indigo-200/20 rounded-xl p-2.5 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Pre-Visit Prep</span>
                        </button>
                        <button
                          onClick={() => setSharingModalOpen(true)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-2 cursor-pointer text-slate-650 dark:text-slate-350"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share Access</span>
                        </button>
                        <button
                          onClick={handlePrint}
                          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print / PDF</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Official Diagnostic Document</span>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                          {activeReport.title}
                        </h2>
                      </div>
                      <div className="text-left md:text-right text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Metro Diagnostic Labs</span>
                        <p className="text-slate-500">CLIA ID: 45D2109845</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800 print-row-bg">
                      <div>
                        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Patient Name</span>
                        <span className="text-xs font-bold block mt-0.5">{activeReport.patient.user.name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Date of Birth</span>
                        <span className="text-xs font-semibold block mt-0.5">
                          {familyMembers.find(m => m.id === activeReport.patientId)?.dateOfBirth || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Accession Date</span>
                        <span className="text-xs font-semibold block mt-0.5">
                          {new Date(activeReport.testDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Physician Review</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450 block mt-0.5">✓ {activeReport.status}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-3.5">
                        Analytical Findings
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 print-row-bg">
                              <th className="px-4 py-3 font-bold text-slate-500">Test Parameter</th>
                              <th className="px-4 py-3 font-bold text-slate-500 text-right">Value</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Unit</th>
                              <th className="px-4 py-3 font-bold text-slate-500">Reference Range</th>
                              <th className="px-4 py-3 font-bold text-slate-500 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                            {activeReport.results.map((res) => (
                              <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                                <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">{res.testName}</td>
                                <td className="px-4 py-3.5 text-right font-semibold text-slate-850 dark:text-slate-100">{res.value.toFixed(1)}</td>
                                <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{res.unit}</td>
                                <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400">{res.referenceRange}</td>
                                <td className="px-4 py-3.5 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getResultStatusClass(res.status)} ${
                                    res.status !== 'Normal' ? 'print-badge-deviation' : 'print-badge-normal'
                                  }`}>
                                    {res.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {activeReport.doctorNotes && activeReport.doctorNotes.length > 0 && (
                      <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-2xl border border-indigo-500/10 print-row-bg">
                        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-2">
                          <Stethoscope className="h-4.5 w-4.5" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            Physician Clinician Message ({activeReport.doctorNotes[0].doctor.user.name})
                          </h4>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350 italic">
                          "{activeReport.doctorNotes[0].note}"
                        </p>
                        <span className="block text-[9px] text-slate-400 mt-2">
                          Reviewed: {new Date(activeReport.doctorNotes[0].createdAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="hidden print:block border-t border-slate-200 mt-12 pt-8 text-center text-[10px] text-slate-400">
                      <p>Laboratory validation completed and released electronically. Cryptographic digital signature hash verified.</p>
                      <p className="mt-1 font-mono">MD-ID: {activeReport.id}</p>
                    </div>

                    <div className="no-print flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-405 p-2 rounded-lg">
                          <Brain className="h-4 w-4" />
                        </div>
                        <div className="text-xs">
                          <h4 className="font-bold text-slate-900 dark:text-white">AI Health Explanation Engine</h4>
                          <p className="text-slate-500 text-[10px] mt-0.5">Let the AI break down values and reference ranges.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('ai');
                          handleTriggerSummary();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-[10px] font-bold transition cursor-pointer"
                      >
                        Explain Report
                      </button>
                    </div>

                  </>
                ) : (
                  <div className="text-center py-24">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Select a lab report to view findings.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: REPORT COMPARISON ENGINE */}
          {activeTab === 'compare' && (
            <div className="space-y-8 animate-in fade-in duration-200 no-print">
              
              {/* Select reports Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    <span>Lab Report Comparison Engine</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Select two reports to run a side-by-side comparative analysis of clinical biometrics.
                  </p>
                </div>

                {patientReports.length < 2 ? (
                  <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3 animate-bounce" />
                    <h4 className="font-bold text-xs">Insufficient Diagnostic Data</h4>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                      You need at least **two** reports in your health vault to compare values side-by-side. Add reports in the Lab Admin panel.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Report Selector 1 */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Older Reference Report
                        </label>
                        <select
                          value={compareId1}
                          onChange={(e) => setCompareId1(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-550 text-slate-700 dark:text-slate-350 cursor-pointer"
                        >
                          {patientReports.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.title} ({new Date(r.testDate).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Report Selector 2 */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Newer Checkup Report
                        </label>
                        <select
                          value={compareId2}
                          onChange={(e) => setCompareId2(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-550 text-slate-700 dark:text-slate-350 cursor-pointer"
                        >
                          {patientReports.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.title} ({new Date(r.testDate).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleGenerateComparison}
                        disabled={comparisonLoading}
                        className="bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl px-6 py-3.5 text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-indigo-650/10 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{comparisonLoading ? 'Calculating Trends...' : 'Compare Side-by-Side'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Comparison Results Area */}
              {comparisonResult && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Table (Left 7) */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                    <h4 className="font-bold text-sm text-slate-905 dark:text-white">Comparative Diagnostics Table</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850">
                            <th className="px-4 py-3 font-bold text-slate-500">Biometric Metric</th>
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Older Value</th>
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Newer Value</th>
                            <th className="px-4 py-3 font-bold text-slate-500 text-center">Change %</th>
                            <th className="px-4 py-3 font-bold text-slate-555 text-center">Progress Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                          {comparisonResult.comparisons.map((c: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-3.5 font-bold">{c.parameter}</td>
                              <td className="px-4 py-3.5 text-right font-semibold text-slate-550">{c.olderValue} {c.unit}</td>
                              <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-white">{c.newerValue} {c.unit}</td>
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-indigo-650 dark:text-indigo-400">{c.changePercent}</td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  c.direction === 'Improved'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : c.direction === 'Declined'
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : 'bg-slate-100 dark:bg-slate-850 text-slate-500'
                                }`}>
                                  {c.direction === 'Improved' && <TrendingUp className="h-3 w-3 mr-0.5" />}
                                  {c.direction === 'Declined' && <TrendingDown className="h-3 w-3 mr-0.5" />}
                                  <span>{c.direction}</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* AI Comparison narrative (Right 5) */}
                  <div className="lg:col-span-5 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-500/10 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-sm text-indigo-700 dark:text-indigo-400 flex items-center space-x-1.5">
                      <Brain className="h-4.5 w-4.5" />
                      <span>AI Longitudinal Comparison Report</span>
                    </h4>
                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-350 whitespace-pre-line">
                      {comparisonResult.narrative}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 4: AI LAB REPORT ASSISTANT */}
          {activeTab === 'ai' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch no-print animate-in fade-in duration-200">
              
              {/* Left side: Report summary & selector */}
              <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col space-y-4 shadow-sm">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Report</h3>
                <p className="text-xs text-slate-500">
                  Select which report you want the AI Clinical Interpreter to explain.
                </p>

                <div className="relative">
                  <select
                    value={selectedReportId || ''}
                    onChange={(e) => setSelectedReportId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {patientReports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({new Date(r.testDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})
                      </option>
                    ))}
                  </select>
                  <FileText className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">AI Quick Prompts</span>
                  <button
                    onClick={handleTriggerSummary}
                    disabled={!selectedReportId || aiLoading}
                    className="w-full text-left bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-950/40 dark:hover:bg-indigo-950/20 border border-slate-200/50 dark:border-slate-850 rounded-xl p-3 text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Brain className="h-4 w-4 text-indigo-500" />
                    <span>Explain medical terminology</span>
                  </button>
                  <button
                    onClick={handleTriggerQuestions}
                    disabled={!selectedReportId || aiLoading}
                    className="w-full text-left bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-950/40 dark:hover:bg-indigo-950/20 border border-slate-200/50 dark:border-slate-850 rounded-xl p-3 text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4 text-indigo-500" />
                    <span>Questions for Doctor visit</span>
                  </button>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-500/10 flex items-start space-x-3 mt-auto">
                  <Shield className="h-4.5 w-4.5 text-indigo-650 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-[10px] leading-relaxed text-slate-505 dark:text-slate-400">
                    <strong>Medical Disclaimer:</strong> AI explanations are purely educational to interpret metrics. They do not constitute diagnostic medical advice or physician determinations.
                  </span>
                </div>
              </div>

              {/* Right side: Chat Window */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[550px]">
                {/* Chat Header with Language Selector */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-bold">
                      AI
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">AI Health Interpreter</h3>
                      <span className="text-[9px] font-semibold text-emerald-500 flex items-center space-x-1">
                        <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse-slow"></span>
                        <span>Secure Lab Intel Agent Online</span>
                      </span>
                    </div>
                  </div>

                  {/* Multi-language Selector */}
                  <div className="relative">
                    <select
                      value={aiLanguage}
                      onChange={(e) => setAiLanguage(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] font-bold focus:outline-none text-slate-700 dark:text-slate-350 cursor-pointer pr-6"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español (ES)</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                    <Languages className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {aiChatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
                      <Brain className="h-12 w-12 text-slate-300" />
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-205">AI Health Explanation</h4>
                      <p className="text-xs text-slate-500">
                        Ask a question about the active report (e.g. "Should I monitor Vitamin D?") or click one of the quick prompts on the left.
                      </p>
                    </div>
                  ) : (
                    aiChatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3.5 max-w-[85%] ${
                          msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                        }`}
                      >
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          msg.sender === 'user'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-750'
                            : 'bg-indigo-600 text-white'
                        }`}>
                          {msg.sender === 'user' ? 'ME' : 'AI'}
                        </div>
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-205 rounded-tr-none'
                            : 'bg-indigo-5/60 dark:bg-indigo-950/20 text-slate-805 dark:text-slate-205 border border-indigo-500/10 rounded-tl-none whitespace-pre-line'
                        }`} dir={aiLanguage === 'ar' ? 'rtl' : 'ltr'}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}

                  {aiLoading && (
                    <div className="flex items-start gap-3.5 max-w-[85%]">
                      <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        AI
                      </div>
                      <div className="p-4 rounded-2xl bg-indigo-5/60 dark:bg-indigo-950/20 border border-indigo-500/10 text-xs text-indigo-550 dark:text-indigo-400 font-semibold flex items-center space-x-2 rounded-tl-none">
                        <span className="h-2 w-2 bg-indigo-650 rounded-full animate-bounce"></span>
                        <span className="h-2 w-2 bg-indigo-650 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="h-2 w-2 bg-indigo-650 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        <span>Clinical Analyzer is evaluating lab values...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendCustomQuery} className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <input
                    type="text"
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    disabled={!selectedReportId || aiLoading}
                    placeholder={selectedReportId ? "Ask a health query about this report..." : "Select a report first"}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-105 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-550 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!selectedReportId || aiLoading || !aiInputText.trim()}
                    className="bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white p-2.5 rounded-xl transition disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 5: SHARING LOG & SECURITY AUDITS */}
          {activeTab === 'security' && (
            <div className="space-y-8 no-print animate-in fade-in duration-200">
              
              {/* Share Reports Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Report Sharing Links</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage secure external viewer tokens released for clinical review by third-party doctors.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3 font-bold text-slate-550">Report Title</th>
                        <th className="px-4 py-3 font-bold text-slate-550">Shared Recipient</th>
                        <th className="px-4 py-3 font-bold text-slate-555">Duration</th>
                        <th className="px-4 py-3 font-bold text-slate-550">Expires At</th>
                        <th className="px-4 py-3 font-bold text-slate-550">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {reports.flatMap(r => r.shares).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No shared links created yet. Share a report to generate secure access codes.
                          </td>
                        </tr>
                      ) : (
                        reports.flatMap(r => r.shares).map(s => {
                          const isExpired = new Date(s.expiresAt).getTime() < Date.now();
                          return (
                            <tr key={s.id}>
                              <td className="px-4 py-3.5 font-bold">
                                {reports.find(r => r.shares.some(sh => sh.id === s.id))?.title || 'Report'}
                              </td>
                              <td className="px-4 py-3.5 font-semibold">{s.sharedWith}</td>
                              <td className="px-4 py-3.5">{s.accessDays} days</td>
                              <td className="px-4 py-3.5 text-slate-500">{new Date(s.expiresAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  isExpired 
                                    ? 'bg-rose-500/10 text-rose-500' 
                                    : 'bg-emerald-500/10 text-emerald-555'
                                }`}>
                                  {isExpired ? 'Expired' : 'Active (View Only)'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit logs transparency */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Security Audit Log</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    HIPAA compliant audit trails documenting account accesses, viewer releases, and logins.
                  </p>
                </div>

                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <Lock className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-205">{log.action}</p>
                          <span className="text-[10px] text-slate-400">Audited Activity</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HEALTH TIMELINE SYSTEM */}
          {activeTab === 'timeline' && (
            <div className="space-y-8 no-print animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <span>My Health Journey Timeline</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  A unified chronological record of all medical reports, doctor consultations, prescriptions, and archives.
                </p>

                {patientTimelineEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No medical timeline events recorded.</p>
                  </div>
                ) : (
                  <div className="relative border-l border-indigo-150 dark:border-slate-800 ml-4 pl-8 space-y-8 py-4 mt-6">
                    {patientTimelineEvents.map((event) => (
                      <div key={event.id} className="relative group">
                        <div className="absolute -left-[45px] top-1 h-8 w-8 bg-indigo-555 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-xs font-bold ring-4 ring-indigo-50 dark:ring-indigo-950/10">
                          {event.eventType === 'Report' ? '🩸' : event.eventType === 'Visit' ? '❤️' : event.eventType === 'Medication' ? '💊' : '📄'}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold text-indigo-655 dark:text-indigo-400 tracking-wide uppercase">
                              {new Date(event.eventDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-505 dark:text-slate-450 uppercase tracking-wide">
                              {event.eventType}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                            {event.title}
                          </h4>
                          
                          {event.description && (
                            <p className="text-xs text-slate-505 dark:text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: ADVANCED FILE MANAGEMENT */}
          {activeTab === 'documents' && (
            <div className="space-y-8 no-print animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                        <Folder className="h-5 w-5 text-indigo-500" />
                        <span>Medical Document Vault</span>
                      </h3>
                      <p className="text-xs text-slate-505 mt-0.5">Secure clinical folder categories</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['Imaging', 'Prescriptions', 'Vaccinations', 'Insurance'].map((cat) => {
                      const count = patientDocuments.filter(d => d.category === cat).length;
                      return (
                        <div key={cat} className="p-4 bg-slate-50/50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-xl text-center shadow-sm hover:border-indigo-500 transition cursor-pointer">
                          <Folder className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
                          <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">{cat}</h4>
                          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">{count} Files</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3">All Uploaded Files</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850">
                            <th className="px-4 py-3 font-bold text-slate-500">Document Title</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Category</th>
                            <th className="px-4 py-3 font-bold text-slate-500">File Size</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Uploaded Date</th>
                            <th className="px-4 py-3 font-bold text-slate-550 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                          {patientDocuments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-slate-505">
                                No uploaded records in your health archives.
                              </td>
                            </tr>
                          ) : (
                            patientDocuments.map((doc) => (
                              <tr key={doc.id}>
                                <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                  📄 {doc.title}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="bg-indigo-550/10 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    {doc.category}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-505">{doc.fileSize}</td>
                                <td className="px-4 py-3.5 text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3.5 text-right">
                                  <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); alert('Simulating secure clinical file download...'); }}
                                    className="text-[10px] font-bold text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 flex items-center justify-end space-x-1 hover:underline"
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

                <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="font-bold text-sm text-slate-905 dark:text-white">Upload New File</h4>
                    <p className="text-[10px] text-slate-505 font-medium">Encrypt and archive records in category folders.</p>
                  </div>

                  <form onSubmit={handleUploadDocSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="docTitle" className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-2">
                        Document Title
                      </label>
                      <input
                        id="docTitle"
                        type="text"
                        required
                        placeholder="e.g. Lipitor Prescription"
                        value={uploadDocTitle}
                        onChange={(e) => setUploadDocTitle(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="docCategory" className="block text-[10px] font-bold uppercase tracking-wider text-slate-455 mb-2">
                        Category Folder
                      </label>
                      <select
                        id="docCategory"
                        value={uploadDocCategory}
                        onChange={(e) => setUploadDocCategory(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Prescriptions">Prescriptions</option>
                        <option value="Imaging">Imaging</option>
                        <option value="Vaccinations">Vaccinations</option>
                        <option value="Insurance">Insurance</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={uploadDocLoading || !uploadDocTitle.trim()}
                      className="w-full bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl py-3 text-xs font-bold transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
                    >
                      <Send className="h-4 w-4" />
                      <span>{uploadDocLoading ? 'Encrypting & Uploading...' : 'Upload & Parse Document'}</span>
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB 8: SECURE COMMUNICATIONS */}
          {activeTab === 'messages' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[550px] animate-in fade-in duration-200 no-print">
              <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 flex items-center justify-center font-bold">
                    DR
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Dr. Robert Chen (Primary Care)</h3>
                    <span className="text-[9px] font-semibold text-emerald-500 flex items-center space-x-1">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse-slow"></span>
                      <span>Secure Patient-Doctor Channel Active</span>
                    </span>
                  </div>
                </div>
                <span className="bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide">
                  HIPAA Encrypted
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
                {patientMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
                    <MessageSquare className="h-12 w-12 text-slate-300" />
                    <h4 className="text-sm font-bold text-slate-850 dark:text-slate-205">No Clinical Conversations</h4>
                    <p className="text-xs text-slate-500">
                      Send a message or query to Dr. Robert Chen regarding your lab values, symptoms, or prescriptions.
                    </p>
                  </div>
                ) : (
                  patientMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3.5 max-w-[85%] ${
                        msg.senderRole === 'PATIENT' ? 'ml-auto flex-row-reverse' : ''
                      }`}
                    >
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        msg.senderRole === 'PATIENT'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-750'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        {msg.senderRole === 'PATIENT' ? 'ME' : 'RC'}
                      </div>
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.senderRole === 'PATIENT'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-205 rounded-tr-none'
                          : 'bg-indigo-5/60 dark:bg-indigo-950/20 text-slate-805 dark:text-slate-205 border border-indigo-500/10 rounded-tl-none whitespace-pre-line'
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
                  <div className="flex items-start gap-3.5 max-w-[85%]">
                    <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-[10px] font-bold shrink-0 text-slate-505">
                      ME
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 font-semibold flex items-center space-x-2 rounded-tr-none">
                      <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                      <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      <span>Sending query to clinic gateway...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 px-6 py-2 border-t border-slate-200 dark:border-slate-805 flex flex-wrap gap-2 items-center">
                <span className="text-[9px] font-bold text-slate-400">Helper templates:</span>
                {['Vitamin D supplement query', 'Cholesterol medication refill', 'Discuss next checkup schedule'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setChatInputText(tag)}
                    className="bg-white hover:bg-indigo-500/10 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-[9px] px-2.5 py-1 rounded-lg text-slate-600 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-450 transition cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendChatMessage} className="bg-slate-50 dark:bg-slate-955 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  disabled={chatLoading}
                  placeholder="Type secure clinical query message..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-805 dark:text-slate-105 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-indigo-550 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInputText.trim()}
                  className="bg-indigo-655 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white p-2.5 rounded-xl transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 9: WEARABLE INTEGRATION */}
          {activeTab === 'wearables' && (
            <div className="space-y-8 no-print animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Avg Heart Rate</span>
                    <h3 className="text-3xl font-black text-slate-905 dark:text-white mt-2">
                      {patientWearables.find(w => w.dataType === 'HeartRate')?.value || 72} <span className="text-xs font-bold text-slate-405">BPM</span>
                    </h3>
                    <span className="text-[9px] text-emerald-505 font-bold block mt-1">✓ Normal Rest Rhythm</span>
                  </div>
                  <div className="text-3xl bg-rose-500/10 p-3 rounded-2xl">❤️</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Steps Today</span>
                    <h3 className="text-3xl font-black text-slate-905 dark:text-white mt-2">
                      {patientWearables.find(w => w.dataType === 'Steps')?.value || 9200} <span className="text-xs font-bold text-slate-405">Steps</span>
                    </h3>
                    <span className="text-[9px] text-indigo-505 font-bold block mt-1">✓ 92% of Daily Target</span>
                  </div>
                  <div className="text-3xl bg-indigo-500/10 p-3 rounded-2xl">🏃</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sleep Duration</span>
                    <h3 className="text-3xl font-black text-slate-905 dark:text-white mt-2">
                      {patientWearables.find(w => w.dataType === 'Sleep')?.value || 7.2} <span className="text-xs font-bold text-slate-405">Hrs</span>
                    </h3>
                    <span className="text-[9px] text-sky-505 font-bold block mt-1">✓ Deep Cycle Restored</span>
                  </div>
                  <div className="text-3xl bg-sky-500/10 p-3 rounded-2xl">💤</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                        <Activity className="h-4.5 w-4.5 text-indigo-500" />
                        <span>Wearables Vitals Sync Log</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Real-time daily heart rate oscillations (Apple Health / Google Fit)</p>
                    </div>
                    <button
                      onClick={handleSyncWearablesData}
                      disabled={syncingWearables}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-[10px] font-bold transition flex items-center space-x-1 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <span>{syncingWearables ? 'Syncing...' : 'Sync Tracker'}</span>
                    </button>
                  </div>

                  <div className="h-44 relative pt-4 pr-4">
                    <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="wearGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(244, 63, 94)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="rgb(244, 63, 94)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="20" y1="20" x2="480" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                      <line x1="20" y1="75" x2="480" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                      <line x1="20" y1="130" x2="480" y2="130" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
                      
                      <path d="M 20 75 L 60 75 L 80 50 L 100 110 L 120 20 L 140 85 L 180 75 L 220 75 L 240 40 L 260 120 L 280 30 L 300 90 L 340 75 L 380 75 L 400 45 L 420 115 L 440 25 L 460 80 L 480 75" fill="none" stroke="rgb(244, 63, 94)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 20 75 L 60 75 L 80 50 L 100 110 L 120 20 L 140 85 L 180 75 L 220 75 L 240 40 L 260 120 L 280 30 L 300 90 L 340 75 L 380 75 L 400 45 L 420 115 L 440 25 L 460 80 L 480 75 L 480 140 L 20 140 Z" fill="url(#wearGradient)" />
                    </svg>
                    <div className="absolute left-0 top-3 text-[8px] font-bold text-slate-400">120 BPM</div>
                    <div className="absolute left-0 top-16 text-[8px] font-bold text-slate-400">75 BPM</div>
                    <div className="absolute left-0 bottom-1 text-[8px] font-bold text-slate-400">40 BPM</div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-500/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <h3 className="font-bold text-base text-indigo-700 dark:text-indigo-400 flex items-center space-x-1.5">
                      <Brain className="h-4.5 w-4.5" />
                      <span>AI Daily Wearable Analysis</span>
                    </h3>
                    <p className="text-[10px] text-slate-550 mt-0.5">Automated tracker evaluations</p>
                  </div>

                  <div className="space-y-3.5 text-xs text-slate-655 dark:text-slate-350 leading-relaxed">
                    <p>
                      <strong>Summary</strong>: Your heart rate rest cycle is highly stable, oscillating between 68 and 74 BPM. Steps today (9,200) indicate positive metabolic progression, nearing your 10,000 baseline threshold.
                    </p>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-3 rounded-xl">
                      <span className="font-bold text-slate-900 dark:text-white">Recommendations:</span>
                      <ul className="list-disc pl-4 mt-1.5 space-y-1">
                        <li>Aim for 8 hours of sleep to improve REM duration logs.</li>
                        <li>Sustain moderate walking cycles to improve postprandial glycemic metrics.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: EHR INTEGRATIONS LAYER */}
          {activeTab === 'ehr' && (
            <div className="space-y-8 no-print animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <FlaskConical className="h-5 w-5 text-indigo-500" />
                    <span>EHR Connect Gateway</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect your clinical dashboard directly with clinical network systems (Mayo Clinic, Kaiser Permanente, Epic, Cerner) using HIPAA-compliant FHIR API standards.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex flex-col justify-between h-40">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Epic MyChart</span>
                      <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-bold">Connected</span>
                    </div>
                    <p className="text-[10px] text-slate-555 leading-relaxed">Synced: Today at 10:45 AM. Pulling diagnostics, vaccination sheets, and clinic vitals.</p>
                    <button
                      onClick={() => alert('Epic MyChart sync initiated via clinical secure endpoint.')}
                      className="text-[10px] font-bold text-indigo-650 hover:text-indigo-705 dark:text-indigo-400 text-left cursor-pointer"
                    >
                      Synchronize Records →
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex flex-col justify-between h-40">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Cerner Health</span>
                      <span className="bg-slate-100 dark:bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-bold">Available</span>
                    </div>
                    <p className="text-[10px] text-slate-555 leading-relaxed">Link Cerner Millennium medical systems to pull clinical imaging files directly.</p>
                    <button
                      onClick={() => alert('Cerner OAuth login simulation initiated...')}
                      className="text-[10px] font-bold text-indigo-650 hover:text-indigo-755 dark:text-indigo-400 text-left cursor-pointer"
                    >
                      Connect Healthcare Portal →
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-955 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex flex-col justify-between h-40">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Kaiser Permanente</span>
                      <span className="bg-slate-100 dark:bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full text-[9px] font-bold">Available</span>
                    </div>
                    <p className="text-[10px] text-slate-555 leading-relaxed">Sync Kaiser clinics databases for direct insurance validation and medicine refills.</p>
                    <button
                      onClick={() => alert('Kaiser OAuth login simulation initiated...')}
                      className="text-[10px] font-bold text-indigo-655 hover:text-indigo-705 dark:text-indigo-400 text-left cursor-pointer"
                    >
                      Connect Healthcare Portal →
                    </button>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-505 mb-3">Live FHIR Security Gateway Auditing</h4>
                  <div className="space-y-2 font-mono text-[9px] text-slate-555 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p>[{new Date().toLocaleDateString()}] FHIR DSTU3 Connector - Initialized OAuth handshake - Epic Gateway.</p>
                    <p>[{new Date().toLocaleDateString()}] GET /Patient/45a8f230d - Response HTTP 200 OK (0.12s).</p>
                    <p>[{new Date().toLocaleDateString()}] GET /Observation?category=laboratory - Response HTTP 200 OK - Synced 12 parameters.</p>
                    <p>[{new Date().toLocaleDateString()}] Security signature verified (SHA-256 HMAC digest: 3f8b0...).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* SHARING MODAL (Secure Sharing Portal) */}
      {sharingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-6 relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setSharingModalOpen(false);
                setShareDoctorName('');
                setGeneratedShareUrl('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center space-x-2">
                <Share2 className="h-5 w-5 text-indigo-500" />
                <span>Secure Clinical Sharing</span>
              </h3>
              <p className="text-xs text-slate-550 mt-1">
                Generate a temporary token key to share this laboratory result.
              </p>
            </div>

            {!generatedShareUrl ? (
              <form onSubmit={handleCreateShareLink} className="space-y-4">
                <div>
                  <label htmlFor="doctorName" className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-2">
                    Recipient Name / Doctor Name
                  </label>
                  <input
                    id="doctorName"
                    type="text"
                    required
                    placeholder="e.g. Dr. Ahmed"
                    value={shareDoctorName}
                    onChange={(e) => setShareDoctorName(e.target.value)}
                    className="w-full bg-slate-55/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-105 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                  />
                </div>

                <div>
                  <label htmlFor="shareDuration" className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-2">
                    Link Access Duration
                  </label>
                  <select
                    id="shareDuration"
                    value={shareDays}
                    onChange={(e) => setShareDays(parseInt(e.target.value))}
                    className="w-full bg-slate-55/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none text-slate-700 dark:text-slate-350 cursor-pointer"
                  >
                    <option value={1}>1 Day (24 hours)</option>
                    <option value={7}>7 Days (1 week)</option>
                    <option value={30}>30 Days (1 month)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={sharingLoading}
                  className="w-full bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl py-3 text-xs font-bold transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {sharingLoading ? 'Generating...' : 'Generate Sharing Link'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all select-all">
                  {generatedShareUrl}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-50 dark:hover:bg-indigo-600 text-white rounded-xl py-3 text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Copy URL Link</span>
                  </button>
                  <button
                    onClick={() => {
                      setSharingModalOpen(false);
                      setShareDoctorName('');
                      setGeneratedShareUrl('');
                    }}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold hover:bg-slate-100 transition cursor-pointer text-slate-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCTOR VISIT PREP MODAL (Printable Checklist) */}
      {doctorPrepModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 md:p-8 space-y-6 relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setDoctorPrepModalOpen(false);
                setDoctorPrepContent('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <span>AI Doctor Visit Checklist</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Print this checklist to guide discussion during your clinical consultation appointment.
              </p>
            </div>

            <div className="flex-grow overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50 dark:bg-slate-950/50 font-sans text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
              {doctorPrepLoading ? (
                <div className="h-full flex items-center justify-center space-x-2">
                  <span className="h-2.5 w-2.5 bg-indigo-650 rounded-full animate-bounce"></span>
                  <span className="h-2.5 w-2.5 bg-indigo-650 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-2.5 w-2.5 bg-indigo-650 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="font-bold text-indigo-655 dark:text-indigo-400">Compiling visit data...</span>
                </div>
              ) : (
                doctorPrepContent
              )}
            </div>

            <div className="flex justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4 shrink-0">
              <button
                onClick={() => {
                  setDoctorPrepModalOpen(false);
                  setDoctorPrepContent('');
                }}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 rounded-xl px-4 py-3 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Close Planner
              </button>
              <button
                onClick={handlePrint}
                disabled={doctorPrepLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Checklist</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
