const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.doctorNote.deleteMany({});
  await prisma.labResult.deleteMany({});
  await prisma.reportShare.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.labAdmin.deleteMany({});
  await prisma.doctor.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.familyGroup.deleteMany({});
  await prisma.lab.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.timelineEvent.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.wearableData.deleteMany({});

  console.log('Seeding database...');

  // Create Lab
  const lab = await prisma.lab.create({
    data: {
      name: 'Metro Diagnostic Labs',
    },
  });

  // Create Users
  const userPatient = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      name: 'Sarah Ahmed',
      role: 'PATIENT',
    },
  });

  const userDoctor = await prisma.user.create({
    data: {
      email: 'doctor@example.com',
      name: 'Dr. Robert Chen',
      role: 'DOCTOR',
    },
  });

  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Alice Vance',
      role: 'LAB_ADMIN',
    },
  });

  // Create Family Group for Sarah
  const familyGroup = await prisma.familyGroup.create({
    data: {
      name: 'Sarah\'s Family',
    },
  });

  // Create Patients
  const patientSarah = await prisma.patient.create({
    data: {
      userId: userPatient.id,
      dateOfBirth: '1995-04-12',
      gender: 'Female',
      familyId: familyGroup.id,
    },
  });

  // Additional family member for demo (Father)
  const userFather = await prisma.user.create({
    data: {
      email: 'father@example.com',
      name: 'Jamil Ahmed (Father)',
      role: 'PATIENT',
    },
  });
  const patientFather = await prisma.patient.create({
    data: {
      userId: userFather.id,
      dateOfBirth: '1965-08-20',
      gender: 'Male',
      familyId: familyGroup.id,
    },
  });

  // Create Doctor
  const doctor = await prisma.doctor.create({
    data: {
      userId: userDoctor.id,
      specialty: 'Internal Medicine',
    },
  });

  // Create Lab Admin
  const labAdmin = await prisma.labAdmin.create({
    data: {
      userId: userAdmin.id,
      labId: lab.id,
    },
  });

  // Create Reports for Sarah (CBC Blood Test - June 2026, Vitamin - March 2026, Thyroid - Jan 2026)
  
  // 1. Report: CBC Blood Test (June 2026)
  const report1 = await prisma.report.create({
    data: {
      patientId: patientSarah.id,
      labId: lab.id,
      title: 'CBC Blood Test',
      testDate: new Date('2026-06-22T08:00:00Z'),
      status: 'Reviewed',
      fileUrl: '/reports/cbc_june_2026.pdf',
    },
  });

  await prisma.labResult.createMany({
    data: [
      {
        reportId: report1.id,
        testName: 'Hemoglobin',
        value: 12.5,
        unit: 'g/dL',
        referenceRange: '12.0 - 15.5',
        status: 'Normal',
      },
      {
        reportId: report1.id,
        testName: 'Cholesterol',
        value: 170.0,
        unit: 'mg/dL',
        referenceRange: '100.0 - 200.0',
        status: 'Normal',
      },
      {
        reportId: report1.id,
        testName: 'Vitamin D',
        value: 32.0,
        unit: 'ng/mL',
        referenceRange: '30.0 - 100.0',
        status: 'Normal',
      },
      {
        reportId: report1.id,
        testName: 'White Blood Cell',
        value: 6.2,
        unit: 'x10^3/uL',
        referenceRange: '4.5 - 11.0',
        status: 'Normal',
      },
    ],
  });

  // Doctor note for report 1
  const note1 = await prisma.doctorNote.create({
    data: {
      reportId: report1.id,
      doctorId: doctor.id,
      note: 'Your overall blood count looks fantastic, Sarah! Hemoglobin and White Blood Cells are healthy. Your cholesterol is at a great target level of 170 mg/dL. Keep up the good diet.',
      createdAt: new Date('2026-06-22T10:30:00Z'),
    },
  });

  // 2. Report: Vitamin Test (March 2026)
  const report2 = await prisma.report.create({
    data: {
      patientId: patientSarah.id,
      labId: lab.id,
      title: 'Vitamin Test',
      testDate: new Date('2026-03-15T09:00:00Z'),
      status: 'Reviewed',
      fileUrl: '/reports/vitamin_march_2026.pdf',
    },
  });

  await prisma.labResult.createMany({
    data: [
      {
        reportId: report2.id,
        testName: 'Vitamin D',
        value: 28.0,
        unit: 'ng/mL',
        referenceRange: '30.0 - 100.0',
        status: 'Low',
      },
      {
        reportId: report2.id,
        testName: 'Vitamin B12',
        value: 450.0,
        unit: 'pg/mL',
        referenceRange: '200.0 - 900.0',
        status: 'Normal',
      },
      {
        reportId: report2.id,
        testName: 'Cholesterol',
        value: 190.0,
        unit: 'mg/dL',
        referenceRange: '100.0 - 200.0',
        status: 'Normal',
      },
    ],
  });

  await prisma.doctorNote.create({
    data: {
      reportId: report2.id,
      doctorId: doctor.id,
      note: 'Your Vitamin D is slightly low at 28 ng/mL. I recommend starting a daily 2000 IU supplement and spending 15 minutes in sunlight. We will recheck this in 3 months.',
      createdAt: new Date('2026-03-16T11:00:00Z'),
    },
  });

  // 3. Report: Thyroid Panel (January 2026)
  const report3 = await prisma.report.create({
    data: {
      patientId: patientSarah.id,
      labId: lab.id,
      title: 'Thyroid Panel',
      testDate: new Date('2026-01-10T08:30:00Z'),
      status: 'Reviewed',
      fileUrl: '/reports/thyroid_jan_2026.pdf',
    },
  });

  await prisma.labResult.createMany({
    data: [
      {
        reportId: report3.id,
        testName: 'TSH',
        value: 2.1,
        unit: 'uIU/mL',
        referenceRange: '0.4 - 4.0',
        status: 'Normal',
      },
      {
        reportId: report3.id,
        testName: 'Free T4',
        value: 1.2,
        unit: 'ng/dL',
        referenceRange: '0.8 - 1.8',
        status: 'Normal',
      },
      {
        reportId: report3.id,
        testName: 'Cholesterol',
        value: 210.0,
        unit: 'mg/dL',
        referenceRange: '100.0 - 200.0',
        status: 'High',
      },
    ],
  });

  await prisma.doctorNote.create({
    data: {
      reportId: report3.id,
      doctorId: doctor.id,
      note: 'Thyroid levels are completely normal. However, your total cholesterol is elevated at 210 mg/dL. Let\'s try adjusting your diet to reduce saturated fats, and we will monitor this in our next checkup.',
      createdAt: new Date('2026-01-12T14:20:00Z'),
    },
  });

  // Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: userPatient.id,
        message: 'Your CBC Blood Test results are ready.',
        status: 'UNREAD',
        createdAt: new Date('2026-06-22T08:05:00Z'),
      },
      {
        userId: userPatient.id,
        message: 'Dr. Robert Chen has reviewed your report.',
        status: 'UNREAD',
        createdAt: new Date('2026-06-22T10:35:00Z'),
      },
    ],
  });

  // Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: userAdmin.id,
        action: 'Uploaded CBC Blood Test report for Sarah Ahmed',
        timestamp: new Date('2026-06-22T08:00:00Z'),
      },
      {
        userId: userPatient.id,
        action: 'Viewed CBC Blood Test report',
        timestamp: new Date('2026-06-22T08:15:00Z'),
      },
      {
        userId: userDoctor.id,
        action: 'Reviewed report CBC Blood Test and added note',
        timestamp: new Date('2026-06-22T10:30:00Z'),
      },
    ],
  });

  // Seed Goals for Sarah Ahmed
  await prisma.goal.createMany({
    data: [
      {
        patientId: patientSarah.id,
        title: 'Complete annual blood test panel',
        completed: true,
      },
      {
        patientId: patientSarah.id,
        title: 'Review recent cholesterol levels with physician',
        completed: true,
      },
      {
        patientId: patientSarah.id,
        title: 'Upload medical history files',
        completed: false,
      },
      {
        patientId: patientSarah.id,
        title: 'Sync fitness tracker diagnostics',
        completed: false,
      },
    ],
  });

  // Seed Documents for Sarah Ahmed (smart folders: Prescriptions, Imaging, Vaccinations, Insurance)
  await prisma.document.createMany({
    data: [
      {
        patientId: patientSarah.id,
        title: 'Lipitor Cholesterol Prescription',
        category: 'Prescriptions',
        fileSize: '420 KB',
        fileUrl: '/documents/lipitor_prescription.pdf',
        uploadedAt: new Date('2026-03-16T12:00:00Z'),
      },
      {
        patientId: patientSarah.id,
        title: 'MRI Knee Scan Report',
        category: 'Imaging',
        fileSize: '4.8 MB',
        fileUrl: '/documents/mri_knee.pdf',
        uploadedAt: new Date('2025-11-05T14:30:00Z'),
      },
      {
        patientId: patientSarah.id,
        title: 'COVID-19 Vaccination Record',
        category: 'Vaccinations',
        fileSize: '1.2 MB',
        fileUrl: '/documents/vaccine_card.pdf',
        uploadedAt: new Date('2024-12-01T09:00:00Z'),
      },
      {
        patientId: patientSarah.id,
        title: 'BlueCross Health Insurance Card',
        category: 'Insurance',
        fileSize: '850 KB',
        fileUrl: '/documents/insurance_card.pdf',
        uploadedAt: new Date('2025-01-01T10:00:00Z'),
      },
    ],
  });

  // Seed Timeline Events for Sarah Ahmed (Report, Visit, Medication, Document)
  await prisma.timelineEvent.createMany({
    data: [
      {
        patientId: patientSarah.id,
        title: 'CBC Blood Test Complete',
        eventType: 'Report',
        eventDate: new Date('2026-06-22T08:00:00Z'),
        description: 'Completed annual CBC panel at Metro Diagnostic Labs. All values returned normal limits.',
      },
      {
        patientId: patientSarah.id,
        title: 'Cardiology Consultation',
        eventType: 'Visit',
        eventDate: new Date('2026-03-22T10:00:00Z'),
        description: 'Follow-up consultation with Dr. Robert Chen regarding cholesterol levels and dietary modifications.',
      },
      {
        patientId: patientSarah.id,
        title: 'Started Lipitor Treatment',
        eventType: 'Medication',
        eventDate: new Date('2026-03-16T12:00:00Z'),
        description: 'Began dosage of Lipitor 10mg once daily to manage cholesterol elevation trends.',
      },
      {
        patientId: patientSarah.id,
        title: 'Vitamin D Assessment Panel',
        eventType: 'Report',
        eventDate: new Date('2026-03-15T09:00:00Z'),
        description: 'Vitamin panel flagged Vitamin D slightly low at 28.0 ng/mL.',
      },
      {
        patientId: patientSarah.id,
        title: 'MRI Scan Performed',
        eventType: 'Document',
        eventDate: new Date('2025-11-05T14:30:00Z'),
        description: 'Imaging performed for minor left knee articulation issues.',
      },
    ],
  });

  // Seed Messages between Sarah Ahmed and Dr. Robert Chen
  await prisma.message.createMany({
    data: [
      {
        patientId: patientSarah.id,
        doctorId: doctor.id,
        senderRole: 'PATIENT',
        content: 'Hello Dr. Chen, I noticed my Vitamin D is slightly low in the recent test. Should I start a supplement?',
        createdAt: new Date('2026-03-15T15:00:00Z'),
      },
      {
        patientId: patientSarah.id,
        doctorId: doctor.id,
        senderRole: 'DOCTOR',
        content: 'Hi Sarah, yes, your Vitamin D is at 28 ng/mL. I recommend starting a daily 2000 IU supplement. Let\'s recheck in 3 months.',
        createdAt: new Date('2026-03-16T11:00:00Z'),
      },
      {
        patientId: patientSarah.id,
        doctorId: doctor.id,
        senderRole: 'PATIENT',
        content: 'Thank you! I will start that tomorrow.',
        createdAt: new Date('2026-03-16T11:30:00Z'),
      },
      {
        patientId: patientSarah.id,
        doctorId: doctor.id,
        senderRole: 'PATIENT',
        content: 'Hi Dr. Chen, I uploaded my recent vaccine record. Could you please take a look when you have a moment?',
        createdAt: new Date('2026-06-20T10:00:00Z'),
      },
      {
        patientId: patientSarah.id,
        doctorId: doctor.id,
        senderRole: 'DOCTOR',
        content: 'Excellent, thank you Sarah. I have added it to your records. Everything is up to date.',
        createdAt: new Date('2026-06-20T14:00:00Z'),
      },
    ],
  });

  // Seed Wearable Data for Sarah Ahmed (Steps, HeartRate, Sleep)
  await prisma.wearableData.createMany({
    data: [
      {
        patientId: patientSarah.id,
        dataType: 'Steps',
        value: 9200,
        timestamp: new Date(),
      },
      {
        patientId: patientSarah.id,
        dataType: 'HeartRate',
        value: 72,
        timestamp: new Date(),
      },
      {
        patientId: patientSarah.id,
        dataType: 'Sleep',
        value: 7.2,
        timestamp: new Date(),
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
