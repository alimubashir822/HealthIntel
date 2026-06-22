import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import PatientDashboardClient from './PatientDashboardClient';
import type { Patient, User, FamilyGroup } from '@prisma/client';

export default async function PatientDashboardPage() {
  const session = await getSession();

  // Route protection
  if (!session) {
    redirect('/');
  }

  if (session.role !== 'PATIENT') {
    if (session.role === 'DOCTOR') redirect('/doctor/dashboard');
    if (session.role === 'LAB_ADMIN') redirect('/admin/dashboard');
    redirect('/');
  }

  // Get active patient profile
  const patient = await db.patient.findUnique({
    where: { userId: session.id },
    include: {
      user: true,
      familyGroup: {
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!patient) {
    redirect('/');
  }

  const patientTyped = patient as (Patient & {
    user: User;
    familyGroup: (FamilyGroup & {
      members: (Patient & {
        user: User;
      })[];
    }) | null;
  });

  // Get family members if group exists
  const familyMembers = (patientTyped.familyGroup?.members ?? [patientTyped]) as (Patient & { user: User })[];

  // Fetch reports for all family members to allow switching in the client UI
  const allFamilyReports = await db.report.findMany({
    where: {
      patientId: {
        in: familyMembers.map(m => m.id),
      },
    },
    include: {
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
      shares: true,
      patient: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      testDate: 'desc',
    },
  });

  // Fetch notifications
  const notifications = await db.notification.findMany({
    where: {
      userId: session.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch audit logs for transparency
  const auditLogs = await db.auditLog.findMany({
    where: {
      userId: session.id,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 5,
  });

  // Fetch Enterprise suite datasets
  const documents = await db.document.findMany({
    where: {
      patientId: {
        in: familyMembers.map(m => m.id),
      },
    },
    orderBy: {
      uploadedAt: 'desc',
    },
  });

  const timelineEvents = await db.timelineEvent.findMany({
    where: {
      patientId: {
        in: familyMembers.map(m => m.id),
      },
    },
    orderBy: {
      eventDate: 'desc',
    },
  });

  const messages = await db.message.findMany({
    where: {
      patientId: {
        in: familyMembers.map(m => m.id),
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const goals = await db.goal.findMany({
    where: {
      patientId: {
        in: familyMembers.map(m => m.id),
      },
    },
  });

  const wearableData = await db.wearableData.findMany({
    where: {
      patientId: {
        in: familyMembers.map(m => m.id),
      },
    },
  });

  return (
    <PatientDashboardClient
      sessionUser={session}
      currentPatientId={patient.id}
      familyMembers={familyMembers.map(m => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        gender: m.gender,
        dateOfBirth: m.dateOfBirth,
      }))}
      reports={allFamilyReports}
      initialNotifications={notifications}
      auditLogs={auditLogs}
      initialDocuments={documents}
      initialTimelineEvents={timelineEvents}
      initialMessages={messages}
      initialGoals={goals}
      initialWearables={wearableData}
    />
  );
}
