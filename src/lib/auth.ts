import { cookies } from 'next/headers';
import { db } from './db';

const SESSION_COOKIE_NAME = 'medclinicx_session';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR' | 'LAB_ADMIN';
  patientId?: string;
  doctorId?: string;
  labAdminId?: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: sessionCookie.value },
      include: {
        patient: true,
        doctor: true,
        labAdmin: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'PATIENT' | 'DOCTOR' | 'LAB_ADMIN',
      patientId: user.patient?.id,
      doctorId: user.doctor?.id,
      labAdminId: user.labAdmin?.id,
    };
  } catch (error) {
    console.error('Error fetching session user:', error);
    return null;
  }
}

export async function login(email: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email },
    include: {
      patient: true,
      doctor: true,
      labAdmin: true,
    },
  });

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: user.id,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'PATIENT' | 'DOCTOR' | 'LAB_ADMIN',
    patientId: user.patient?.id,
    doctorId: user.doctor?.id,
    labAdminId: user.labAdmin?.id,
  };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
