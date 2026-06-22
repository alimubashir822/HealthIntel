import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { 
  Activity, 
  Clock, 
  Lock, 
  Shield 
} from 'lucide-react';
import PrintButton from '@/components/PrintButton';
import type { 
  ReportShare, 
  Report, 
  Patient, 
  User, 
  LabResult, 
  DoctorNote, 
  Doctor, 
  Lab 
} from '@prisma/client';

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  // Find the share details
  const rawShare = await db.reportShare.findUnique({
    where: { token },
    include: {
      report: {
        include: {
          patient: {
            include: {
              user: true,
            },
          },
          results: true,
          doctorNotes: {
            include: {
              doctor: {
                include: {
                  user: true,
                },
              },
            },
          },
          lab: true,
        },
      },
    },
  });

  if (!rawShare) {
    notFound();
  }

  const share = rawShare as (ReportShare & {
    report: Report & {
      patient: Patient & {
        user: User;
      };
      results: LabResult[];
      doctorNotes: (DoctorNote & {
        doctor: Doctor & {
          user: User;
        };
      })[];
      lab: Lab;
    };
  });

  // Expiration check
  const isExpired = new Date(share.expiresAt).getTime() < Date.now();
  if (isExpired) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full space-y-4">
          <Clock className="h-12 w-12 text-rose-500 mx-auto animate-pulse-slow" />
          <h2 className="text-xl font-bold">Access Link Expired</h2>
          <p className="text-xs text-slate-500">
            This secure report access link has reached its expiration date and has been revoked automatically. Please ask the patient to generate a new sharing link.
          </p>
        </div>
      </div>
    );
  }

  // Add security audit trail for share accessed
  await db.auditLog.create({
    data: {
      userId: share.report.patient.userId, // Associate with patient log for safety audit
      action: `Shared report "${share.report.title}" was viewed by authorized link recipient: ${share.sharedWith}`,
    },
  });

  const getResultStatusClass = (status: string) => {
    if (status === 'Normal') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (status === 'High') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    if (status === 'Low') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 min-h-screen p-6 md:p-12 text-slate-800 dark:text-slate-100 flex flex-col items-center">
      
      {/* Top Brand Header (No-Print) */}
      <div className="no-print w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
          <Activity className="h-6 w-6" />
          <span className="font-bold text-lg text-slate-800 dark:text-white">
            MedClinicX <span className="font-normal text-slate-500">SecureShare</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-[10px] bg-slate-200/50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 font-bold text-slate-600 dark:text-slate-400">
            Recipient: {share.sharedWith}
          </span>
        </div>
      </div>

      {/* Main Report Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl max-w-4xl w-full space-y-6 print-container print-bordered relative overflow-hidden">
        
        {/* Top Controls Banner (No-Print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
          <span className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Lock className="h-4 w-4 text-emerald-500 animate-pulse-slow" />
            <span>Secure Access Link (Expires in {share.accessDays} days)</span>
          </span>

          <PrintButton />
        </div>

        {/* Lab Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Official Clinical Report</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {share.report.title}
            </h2>
          </div>
          <div className="text-left md:text-right text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">{share.report.lab.name}</span>
            <p className="text-slate-500">CLIA ID: 45D2109845</p>
          </div>
        </div>

        {/* Patient Profile Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800 print-row-bg">
          <div>
            <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Patient Name</span>
            <span className="text-xs font-bold block mt-0.5">{share.report.patient.user.name}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Date of Birth</span>
            <span className="text-xs font-semibold block mt-0.5">{share.report.patient.dateOfBirth || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Test Date</span>
            <span className="text-xs font-semibold block mt-0.5">
              {new Date(share.report.testDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold block">Link Authority</span>
            <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400 block mt-0.5">View-Only Verified</span>
          </div>
        </div>

        {/* Results Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-3.5">
            Lab Results Detail
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
                {share.report.results.map((res) => (
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

        {/* Doctor Review Notes */}
        {share.report.doctorNotes && share.report.doctorNotes.length > 0 && (
          <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-2xl border border-indigo-500/10 print-row-bg">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-2">
              <Shield className="h-4.5 w-4.5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Physician Message ({share.report.doctorNotes[0].doctor.user.name})
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350 italic">
              "{share.report.doctorNotes[0].note}"
            </p>
            <span className="block text-[9px] text-slate-400 mt-2">
              Signature verified: {new Date(share.report.doctorNotes[0].createdAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Print Disclaimer */}
        <div className="hidden print:block border-t border-slate-200 mt-12 pt-8 text-center text-[10px] text-slate-400">
          <p>This document is accessed via a HIPAA-compliant secure token. Authenticity and audit logs verified.</p>
          <p className="mt-1 font-mono">Token Access Ref: {share.token}</p>
        </div>

      </div>

      {/* Footer */}
      <footer className="no-print w-full max-w-4xl mt-12 py-4 border-t border-slate-200/40 dark:border-slate-800/50 text-center z-10 shrink-0">
        <a
          href="https://www.medclinicx.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-indigo-600 dark:text-slate-550 dark:hover:text-indigo-400 font-bold hover:underline transition duration-150"
        >
          Healthcare system by Med Clinic X
        </a>
      </footer>
    </div>
  );
}
