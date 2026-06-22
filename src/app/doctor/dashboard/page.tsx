import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import DoctorDashboardClient from './DoctorDashboardClient';
import type { Patient, User, Report, LabResult, DoctorNote } from '@prisma/client';

export default async function DoctorDashboardPage() {
  const session = await getSession();

  // Route protection
  if (!session) {
    redirect('/');
  }

  if (session.role !== 'DOCTOR') {
    if (session.role === 'PATIENT') redirect('/patient/dashboard');
    if (session.role === 'LAB_ADMIN') redirect('/admin/dashboard');
    redirect('/');
  }

  // Get active doctor profile
  const doctor = await db.doctor.findUnique({
    where: { userId: session.id },
    include: {
      user: true,
    },
  });

  if (!doctor) {
    redirect('/');
  }

  // Get all patients with their reports and results
  const patients = await db.patient.findMany({
    include: {
      user: true,
      reports: {
        include: {
          results: true,
          doctorNotes: true,
        },
        orderBy: {
          testDate: 'desc',
        },
      },
    },
  });

  // Get doctor's specific audit logs
  const auditLogs = await db.auditLog.findMany({
    where: {
      userId: session.id,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 10,
  });

  // Fetch messaging logs, timeline events, and documents
  const messages = await db.message.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });

  const timelineEvents = await db.timelineEvent.findMany({
    orderBy: {
      eventDate: 'desc',
    },
  });

  const documents = await db.document.findMany({
    orderBy: {
      uploadedAt: 'desc',
    },
  });

  const patientsTyped = patients as (Patient & {
    user: User;
    reports: (Report & {
      results: LabResult[];
      doctorNotes: DoctorNote[];
    })[];
  })[];

  return (
    <DoctorDashboardClient
      sessionUser={session}
      currentDoctorId={doctor.id}
      patients={patientsTyped.map(p => ({
        id: p.id,
        name: p.user.name,
        email: p.user.email,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        reports: p.reports.map(r => ({
          id: r.id,
          title: r.title,
          testDate: r.testDate,
          status: r.status,
          fileUrl: r.fileUrl,
          results: r.results.map(res => ({
            id: res.id,
            testName: res.testName,
            value: res.value,
            unit: res.unit,
            referenceRange: res.referenceRange,
            status: res.status,
          })),
          doctorNotes: r.doctorNotes.map(n => ({
            id: n.id,
            note: n.note,
            createdAt: n.createdAt,
          })),
        })),
      }))}
      auditLogs={auditLogs}
      initialMessages={messages}
      initialTimelineEvents={timelineEvents}
      initialDocuments={documents}
    />
  );
}
