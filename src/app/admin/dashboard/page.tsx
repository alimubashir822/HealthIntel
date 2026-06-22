import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const session = await getSession();

  // Route protection
  if (!session) {
    redirect('/');
  }

  if (session.role !== 'LAB_ADMIN') {
    if (session.role === 'PATIENT') redirect('/patient/dashboard');
    if (session.role === 'DOCTOR') redirect('/doctor/dashboard');
    redirect('/');
  }

  // Get active lab admin profile
  const labAdmin = await db.labAdmin.findUnique({
    where: { userId: session.id },
    include: {
      user: true,
      lab: true,
    },
  });

  if (!labAdmin) {
    redirect('/');
  }

  // Get all patients in the clinic
  const patients = await db.patient.findMany({
    include: {
      user: true,
    },
  });

  // Get all reports from this laboratory
  const reports = await db.report.findMany({
    where: {
      labId: labAdmin.labId,
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      results: true,
    },
    orderBy: {
      testDate: 'desc',
    },
  });

  // Get admin's specific audit logs
  const auditLogs = await db.auditLog.findMany({
    where: {
      userId: session.id,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 10,
  });

  return (
    <AdminDashboardClient
      sessionUser={session}
      labName={labAdmin.lab.name}
      patients={patients.map(p => ({
        id: p.id,
        name: p.user.name,
        email: p.user.email,
      }))}
      reports={reports.map(r => ({
        id: r.id,
        title: r.title,
        testDate: r.testDate,
        status: r.status,
        patientName: r.patient.user.name,
        patientEmail: r.patient.user.email,
        resultsCount: r.results.length,
      }))}
      auditLogs={auditLogs}
    />
  );
}
