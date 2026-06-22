import { handleLogin } from './actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { 
  Activity, 
  Brain, 
  FlaskConical, 
  Lock, 
  Shield, 
  Stethoscope, 
  ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LandingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = typeof params?.error === 'string' ? params.error : undefined;

  // If user is already logged in, redirect them to their respective dashboard
  const session = await getSession();
  if (session) {
    if (session.role === 'PATIENT') redirect('/patient/dashboard');
    if (session.role === 'DOCTOR') redirect('/doctor/dashboard');
    if (session.role === 'LAB_ADMIN') redirect('/admin/dashboard');
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-950 bg-grid-pattern relative flex flex-col items-center justify-center p-6 md:p-12 overflow-x-hidden">
      {/* Top Banner */}
      <div className="absolute top-6 left-6 md:left-12 flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
        <Activity className="h-7 w-7 animate-pulse-slow" />
        <span className="font-bold text-xl tracking-tight font-sans text-slate-800 dark:text-white">
          MedClinicX <span className="text-indigo-600 dark:text-indigo-400 font-normal">HealthIntel</span>
        </span>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mt-20 lg:mt-0 z-10">
        
        {/* Left Column: Marketing / Copy */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" />
            <span>HIPAA-Compliant & Secure</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-tight font-sans tracking-tight">
            AI Health <br />
            <span className="text-indigo-600 dark:text-indigo-400">Intelligence Platform</span>
          </h1>
          
          <p className="text-lg text-slate-655 dark:text-slate-400 max-w-xl font-semibold leading-relaxed text-indigo-650 dark:text-indigo-300">
            Transform medical reports into meaningful health insights for patients and providers.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl font-normal leading-relaxed">
            Go beyond simple static PDFs. Track longitudinal trends, understand lab metrics instantly in multi-language plain text, and prepare for doctor visits with automated AI intelligence.
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start space-x-3">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">AI Interpretation</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Understand lab metrics instantly in plain text.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Health Timelines</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Track key vitals like cholesterol over years.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Physician Notes</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Seamless comments and reviews from your doctor.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Lab Releases</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Administrators verify and push reports instantly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Portal Login Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-sans">
            Access Portal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Log in to view reports, reviews, and clinical insights.
          </p>

          {error && (
            <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs p-3.5 rounded-xl font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form action={handleLogin} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="enter email address"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl py-3.5 font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 dark:shadow-indigo-500/10 cursor-pointer"
            >
              <span>Continue Securely</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Section */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-600 font-bold tracking-wider">
                Or Test As Demo Role
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Sarah - Patient */}
            <form action={handleLogin} className="w-full">
              <input type="hidden" name="email" value="sarah@example.com" />
              <button
                type="submit"
                className="w-full text-left bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-950/40 dark:hover:bg-indigo-950/20 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300">
                    SA
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      Sarah Ahmed
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">Patient Dashboard</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5 group-hover:translate-x-1 transition duration-200">
                  <span>Enter</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </form>

            {/* Dr Robert - Doctor */}
            <form action={handleLogin} className="w-full">
              <input type="hidden" name="email" value="doctor@example.com" />
              <button
                type="submit"
                className="w-full text-left bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-950/40 dark:hover:bg-emerald-950/20 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-xs text-emerald-700 dark:text-emerald-300">
                    RC
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      Dr. Robert Chen
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">Physician Dashboard</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-0.5 group-hover:translate-x-1 transition duration-200">
                  <span>Enter</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </form>

            {/* Alice - Lab Admin */}
            <form action={handleLogin} className="w-full">
              <input type="hidden" name="email" value="admin@example.com" />
              <button
                type="submit"
                className="w-full text-left bg-slate-50 hover:bg-sky-50/50 dark:bg-slate-950/40 dark:hover:bg-sky-950/20 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-sky-100 dark:bg-sky-950 flex items-center justify-center font-bold text-xs text-sky-700 dark:text-sky-300">
                    AV
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                      Alice Vance
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">Lab Admin Dashboard</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center space-x-0.5 group-hover:translate-x-1 transition duration-200">
                  <span>Enter</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </form>
          </div>

          <div className="mt-6 flex justify-center text-center space-x-2 text-[10px] text-slate-400 dark:text-slate-600">
            <Lock className="h-3 w-3" />
            <span>End-to-End Encryption Enabled</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full mt-12 py-4 border-t border-slate-200/40 dark:border-slate-800/50 text-center z-10 shrink-0">
        <a
          href="https://www.medclinicx.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 font-bold hover:underline transition duration-150"
        >
          Healthcare system by Med Clinic X
        </a>
      </footer>
    </div>
  );
}
