'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { login, logout, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache'; // Next.js revalidatePath
import type { LabResult, Report } from '@prisma/client';

export async function handleLogin(formData: FormData) {
  const email = formData.get('email') as string;
  if (!email) {
    redirect('/?error=Email is required');
  }

  const session = await login(email.trim().toLowerCase());
  if (!session) {
    redirect('/?error=User not found. Try one of the demo users.');
  }

  // Create audit log for login
  await db.auditLog.create({
    data: {
      userId: session.id,
      action: `Logged in as ${session.role}`,
    },
  });

  // Redirect based on role
  if (session.role === 'PATIENT') {
    redirect('/patient/dashboard');
  } else if (session.role === 'DOCTOR') {
    redirect('/doctor/dashboard');
  } else if (session.role === 'LAB_ADMIN') {
    redirect('/admin/dashboard');
  }
}

export async function handleLogout() {
  const session = await getSession();
  if (session) {
    await db.auditLog.create({
      data: {
        userId: session.id,
        action: 'Logged out',
      },
    });
  }
  await logout();
  redirect('/');
}

// Doctor Note Submission Action
export async function submitDoctorNote(reportId: string, doctorId: string, note: string) {
  if (!note.trim()) {
    return { error: 'Note cannot be empty' };
  }

  try {
    const doctorNote = await db.doctorNote.create({
      data: {
        reportId,
        doctorId,
        note: note.trim(),
      },
      include: {
        report: {
          include: {
            patient: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Notify patient
    await db.notification.create({
      data: {
        userId: doctorNote.report.patient.userId,
        message: `Dr. Robert Chen has reviewed your report: ${doctorNote.report.title}.`,
        status: 'UNREAD',
      },
    });

    // Audit Log
    const session = await getSession();
    if (session) {
      await db.auditLog.create({
        data: {
          userId: session.id,
          action: `Submitted clinical note for report ${reportId}`,
        },
      });
    }

    revalidatePath('/doctor/dashboard');
    revalidatePath('/patient/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error submitting doctor note:', error);
    return { error: 'Failed to save doctor note.' };
  }
}

// Lab Admin Release Action
export async function releaseReport(reportId: string) {
  try {
    const report = await db.report.update({
      where: { id: reportId },
      data: { status: 'Delivered' },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    // Notify patient
    await db.notification.create({
      data: {
        userId: report.patient.userId,
        message: `New lab report "${report.title}" is ready and available for review.`,
        status: 'UNREAD',
      },
    });

    // Audit Log
    const session = await getSession();
    if (session) {
      await db.auditLog.create({
        data: {
          userId: session.id,
          action: `Released report ${reportId} to patient`,
        },
      });
    }

    revalidatePath('/admin/dashboard');
    revalidatePath('/patient/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error releasing report:', error);
    return { error: 'Failed to release report.' };
  }
}

// Lab Admin Upload Action
export async function uploadLabReport(
  patientId: string,
  title: string,
  testDateStr: string,
  results: { testName: string; value: number; unit: string; referenceRange: string }[]
) {
  if (!patientId || !title || !testDateStr || results.length === 0) {
    return { error: 'All fields and at least one lab result are required.' };
  }

  try {
    // Get lab associated with the logged in lab admin
    const session = await getSession();
    if (!session || session.role !== 'LAB_ADMIN') {
      return { error: 'Unauthorized. Lab admin session not found.' };
    }

    const labAdmin = await db.labAdmin.findUnique({
      where: { userId: session.id },
    });

    if (!labAdmin) {
      return { error: 'Lab Admin record not found' };
    }

    const testDate = new Date(testDateStr);

    const report = await db.report.create({
      data: {
        patientId,
        labId: labAdmin.labId,
        title,
        testDate,
        status: 'Completed', // Initially completed, admin releases to make it Delivered
        fileUrl: `/reports/${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      },
    });

    // Create results with calculated high/low status
    for (const r of results) {
      let status = 'Normal';
      const rangeParts = r.referenceRange.split('-').map(p => parseFloat(p.trim()));
      if (rangeParts.length === 2) {
        const [low, high] = rangeParts;
        if (r.value < low) status = 'Low';
        else if (r.value > high) status = 'High';
      } else if (r.referenceRange.startsWith('<')) {
        const maxVal = parseFloat(r.referenceRange.replace('<', '').trim());
        if (r.value >= maxVal) status = 'High';
      } else if (r.referenceRange.startsWith('>')) {
        const minVal = parseFloat(r.referenceRange.replace('>', '').trim());
        if (r.value <= minVal) status = 'Low';
      }

      await db.labResult.create({
        data: {
          reportId: report.id,
          testName: r.testName,
          value: r.value,
          unit: r.unit,
          referenceRange: r.referenceRange,
          status,
        },
      });
    }

    // Create Audit Log
    await db.auditLog.create({
      data: {
        userId: session.id,
        action: `Uploaded report "${title}" for patient ID ${patientId}`,
      },
    });

    revalidatePath('/admin/dashboard');
    return { success: true, reportId: report.id };
  } catch (error) {
    console.error('Error uploading lab report:', error);
    return { error: 'Failed to upload report' };
  }
}

// Secure Report Share Action
export async function createReportShare(reportId: string, sharedWith: string, accessDays: number) {
  if (!sharedWith.trim()) {
    return { error: 'Recipient name or doctor name is required' };
  }

  try {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + accessDays);

    const share = await db.reportShare.create({
      data: {
        reportId,
        sharedWith: sharedWith.trim(),
        accessDays,
        permission: 'View only',
        token,
        expiresAt,
      },
    });

    // Audit Log
    const session = await getSession();
    if (session) {
      await db.auditLog.create({
        data: {
          userId: session.id,
          action: `Shared report ${reportId} with ${sharedWith} for ${accessDays} days`,
        },
      });
    }

    return { success: true, shareUrl: `/share/${token}`, token };
  } catch (error) {
    console.error('Error creating report share:', error);
    return { error: 'Failed to create sharing link' };
  }
}

// Mark notification as read
export async function markNotificationAsRead(id: string) {
  try {
    await db.notification.update({
      where: { id },
      data: { status: 'READ' },
    });
    revalidatePath('/patient/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error marking notification:', error);
    return { error: 'Failed to mark notification as read' };
  }
}

// AI Assistant Action
export async function getReportAIInterpretation(reportId: string, userQuery?: string, language: string = 'en') {
  try {
    const report = await db.report.findUnique({
      where: { id: reportId },
      include: {
        results: true,
        doctorNotes: true,
      },
    });

    if (!report) {
      return { error: 'Report not found' };
    }

    // Format lab results for AI
    const results = report.results as LabResult[];
    const resultsFormatted = results
      .map((r: LabResult) => `- ${r.testName}: ${r.value} ${r.unit} (Range: ${r.referenceRange}) - Status: ${r.status}`)
      .join('\n');

    const promptMessage = userQuery
      ? `Patient Query: "${userQuery}"\nBased on these results:\n${resultsFormatted}`
      : `Generate a structured, easy-to-understand summary of this report:\n${resultsFormatted}`;

    // Check if OPENAI_API_KEY is available (if not, use rule-based parser)
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an AI Clinical Assistant. Your job is to explain medical laboratory results in structured, highly encouraging, patient-friendly terms.
Rules:
1. Explain the meaning of the tested metrics in layperson terms.
2. DO NOT provide diagnostic judgments (e.g., say "Your Vitamin D is slightly low, which is common and easily manageable" instead of "You have clinical vitamin deficiency disease").
3. Always structure your report with:
   - Summary: A brief paragraph of what the test shows.
   - Important sections: Key values to note, highlighting normal vs out-of-range.
   - Questions to discuss with your doctor: 2-3 specific, logical questions.
4. Keep the tone professional, secure, and reassuring.
5. Respond in the language code requested: English ('en'), Spanish ('es'), or Arabic ('ar'). If Arabic, write in clear modern standard Arabic.`,
              },
              {
                role: 'user',
                content: `${promptMessage}\nLanguage: ${language}`,
              },
            ],
          }),
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return { content: data.choices[0].message.content };
        }
      } catch (err) {
        console.warn('OpenAI API call failed, falling back to local simulation:', err);
      }
    }

    // Dynamic Clinical Explanation Rules System (fallback/demo interpreter)
    let explanationText = '';

    if (userQuery) {
      const q = userQuery.toLowerCase();
      if (q.includes('vitamin') || q.includes('vit')) {
        const vitResult = results.find(r => r.testName.toLowerCase().includes('vitamin'));
        if (vitResult) {
          explanationText = `### Vitamin D Query Explanation
Your Vitamin D is measured at **${vitResult.value} ${vitResult.unit}**.
* **Clinical Insight**: Since the normal range is **${vitResult.referenceRange} ${vitResult.unit}**, your current reading is marked as **${vitResult.status}**. Vitamin D is key for bone health and immune support.
* **Suggested Doctor Topics**:
  1. Ask if a daily supplement (like 2,000 IU) is suitable for you.
  2. Ask how dietary adjustments or brief sunlight exposure can help.`;
        } else {
          explanationText = `### Vitamin Query Explanation
I couldn't find a direct Vitamin test in this specific report. However, general wellness reports indicate maintaining balanced micronutrients is key. Please consult your physician about checking Vitamin D or B12.`;
        }
      } else if (q.includes('cholesterol') || q.includes('lipid')) {
        const cholResult = results.find(r => r.testName.toLowerCase().includes('cholesterol'));
        if (cholResult) {
          explanationText = `### Cholesterol Query Explanation
Your Cholesterol is **${cholResult.value} ${cholResult.unit}**.
* **Clinical Insight**: This reading is categorized as **${cholResult.status}** (reference range is **${cholResult.referenceRange}**).
* **Suggested Doctor Topics**:
  1. Ask if dietary changes (like reducing saturated fats) are sufficient.
  2. Ask when to re-test to see if levels have improved.`;
        } else {
          explanationText = `### Lipid Panel Query Explanation
There is no direct Cholesterol reading in this report. In general, keeping total cholesterol below 200 mg/dL is standard. Discuss with your doctor if a Lipid Panel should be ordered.`;
        }
      } else if (q.includes('hemoglobin') || q.includes('cbc') || q.includes('blood')) {
        const hemoResult = results.find(r => r.testName.toLowerCase() === 'hemoglobin');
        explanationText = `### CBC & Blood Count Analysis
Your Hemoglobin level is **${hemoResult ? hemoResult.value : '12.5'} g/dL**, which is **Normal** (ideal range is **12.0 - 15.5 g/dL**).
* **Clinical Insight**: Hemoglobin is the protein in red blood cells that carries oxygen throughout your body. Your level indicates your red blood cell oxygenation is currently optimal.
* **Suggested Doctor Topics**:
  1. Ask if your iron levels are adequate.
  2. Ask how often a CBC should be repeated for routine monitoring.`;
      } else {
        explanationText = `### Response to "${userQuery}"
Based on your report "${report.title}" dated ${new Date(report.testDate).toLocaleDateString()}, you have ${results.length} tested metrics.
* **Tested Values**:
${results.map(r => `  - **${r.testName}**: ${r.value} ${r.unit} (${r.status})`).join('\n')}

* **Clinical Guidance**:
  - The metrics show your values are mostly in the ${results.some(r => r.status !== 'Normal') ? 'varying' : 'healthy normal'} range.
  - Make sure to review the specific notes from Dr. Robert Chen on this report.

* **Questions to discuss with your doctor**:
  1. How do these numbers correlate with my current symptoms or lifestyle?
  2. Are there any modifications to diet or activities I should make?`;
      }
    } else {
      // General Report Summary
      const outOfRange = results.filter((r: LabResult) => r.status !== 'Normal');
      const lowList = outOfRange.filter((r: LabResult) => r.status === 'Low').map((r: LabResult) => r.testName);
      const highList = outOfRange.filter((r: LabResult) => r.status === 'High').map((r: LabResult) => r.testName);

      explanationText = `### Report Summary: ${report.title}
Your report contains **${results.length} tested values**. Most of your results fall within the standard clinical parameters.

### Important Sections:
${results.map((r: LabResult) => {
  return `- **${r.testName}**: ${r.value} ${r.unit} — *${r.status}* (${r.referenceRange})`;
}).join('\n')}

${outOfRange.length > 0 
  ? `### Highlighted Deviations:
${lowList.length > 0 ? `* **Lower than Reference**: ${lowList.join(', ')} (indicated in report status).` : ''}
${highList.length > 0 ? `* **Higher than Reference**: ${highList.join(', ')} (indicated in report status).` : ''}`
  : `* **All checked values are within normal limits**.`
}

### Questions to discuss with your doctor:
1. ${outOfRange.length > 0 ? `Should we address the out-of-range level for ${outOfRange[0].testName}?` : `How often should I repeat this panel for preventive monitoring?`}
2. How do my diet and lifestyle factors impact these specific results?
3. Should I schedule a follow-up consultation to go over these in detail?`;
    }

    // Apply translation helper
    const translatedText = translateContent(explanationText, language);

    return { content: translatedText };
  } catch (error) {
    console.error('Error in AI interpretation:', error);
    return { error: 'Failed to generate AI interpretation' };
  }
}

// Helper Translation Dictionary
function translateContent(text: string, lang: string): string {
  if (lang === 'es') {
    return text
      .replace(/### Report Summary:/g, '### Resumen del Informe:')
      .replace(/Your report contains/g, 'Su informe contiene')
      .replace(/tested values/g, 'valores analizados')
      .replace(/Most of your results fall within the standard clinical parameters./g, 'La mayoría de sus resultados se encuentran dentro de los parámetros clínicos estándar.')
      .replace(/### Important Sections:/g, '### Secciones Importantes:')
      .replace(/Normal/g, 'Normal')
      .replace(/High/g, 'Alto')
      .replace(/Low/g, 'Bajo')
      .replace(/### Highlighted Deviations:/g, '### Desviaciones Destacadas:')
      .replace(/Lower than Reference/g, 'Menor que la Referencia')
      .replace(/Higher than Reference/g, 'Mayor que la Referencia')
      .replace(/indicated in report status/g, 'indicado en el estado del informe')
      .replace(/All checked values are within normal limits./g, 'Todos los valores verificados están dentro de los límites normales.')
      .replace(/### Questions to discuss with your doctor:/g, '### Preguntas para discutir con su médico:')
      .replace(/Should we address the out-of-range level for/g, '¿Deberíamos abordar el nivel fuera de rango de')
      .replace(/How often should I repeat this panel for preventive monitoring\?/g, '¿Con qué frecuencia debo repetir este panel para un control preventivo?')
      .replace(/How do my diet and lifestyle factors impact these specific results\?/g, '¿Cómo afectan mi dieta y factores de estilo de vida a estos resultados específicos?')
      .replace(/Should I schedule a follow-up consultation to go over these in detail\?/g, '¿Debo programar una consulta de seguimiento para revisar esto en detalle?')
      .replace(/Patient Query:/g, 'Consulta del Paciente:')
      .replace(/Based on these results/g, 'Basado en estos resultados')
      .replace(/Clinical Insight/g, 'Información Clínica')
      .replace(/Suggested Doctor Topics/g, 'Temas sugeridos para hablar con el médico')
      .replace(/CBC & Blood Count Analysis/g, 'Análisis de hemograma y recuento sanguíneo')
      .replace(/Response to/g, 'Respuesta a');
  }
  if (lang === 'ar') {
    return text
      .replace(/### Report Summary:/g, '### ملخص التقرير:')
      .replace(/Your report contains/g, 'يحتوي تقريرك على')
      .replace(/tested values/g, 'قيم تم اختبارها')
      .replace(/Most of your results fall within the standard clinical parameters./g, 'تقع معظم نتائجك ضمن المعايير السريرية القياسية.')
      .replace(/### Important Sections:/g, '### الأقسام الهامة:')
      .replace(/Normal/g, 'طبيعي')
      .replace(/High/g, 'مرتفع')
      .replace(/Low/g, 'منخفض')
      .replace(/### Highlighted Deviations:/g, '### الانحرافات البارزة:')
      .replace(/Lower than Reference/g, 'أقل من المعدل المرجعي')
      .replace(/Higher than Reference/g, 'أعلى من المعدل المرجعي')
      .replace(/indicated in report status/g, 'موضح في حالة التقرير')
      .replace(/All checked values are within normal limits./g, 'جميع القيم المفحوصة ضمن الحدود الطبيعية.')
      .replace(/### Questions to discuss with your doctor:/g, '### أسئلة لمناقشتها مع طبيبك:')
      .replace(/Should we address the out-of-range level for/g, 'هل يجب أن نعالج المستوى الخارج عن النطاق لـ')
      .replace(/How often should I repeat this panel for preventive monitoring\?/g, 'كم مرة يجب أن أكرر هذا الفحص للمتابعة الوقائية؟')
      .replace(/How do my diet and lifestyle factors impact these specific results\?/g, 'كيف تؤثر عاداتي الغذائية ونمط حياتي على هذه النتائج؟')
      .replace(/Should I schedule a follow-up consultation to go over these in detail\?/g, 'هل يجب أن أجدول موعداً للمتابعة لمراجعة هذه التفاصيل؟')
      .replace(/Patient Query:/g, 'استفسار المريض:')
      .replace(/Based on these results/g, 'بناءً على هذه النتائج')
      .replace(/Clinical Insight/g, 'رؤية سريرية')
      .replace(/Suggested Doctor Topics/g, 'مواضيع مقترحة للنقاش مع الطبيب')
      .replace(/CBC & Blood Count Analysis/g, 'تحليل صورة الدم الكاملة')
      .replace(/Response to/g, 'الرد على');
  }
  return text;
}

// Side-by-Side Report Comparison Action
export async function compareReportsAI(reportId1: string, reportId2: string) {
  try {
    const report1 = await db.report.findUnique({
      where: { id: reportId1 },
      include: { results: true }
    });

    const report2 = await db.report.findUnique({
      where: { id: reportId2 },
      include: { results: true }
    });

    if (!report1 || !report2) {
      return { error: 'One or both reports not found.' };
    }

    // Sort chronologically: rep1 as older, rep2 as newer
    const isRep1Older = new Date(report1.testDate).getTime() < new Date(report2.testDate).getTime();
    const olderRep = isRep1Older ? report1 : report2;
    const newerRep = isRep1Older ? report2 : report1;

    const olderResults = olderRep.results as LabResult[];
    const newerResults = newerRep.results as LabResult[];

    const comparisons: {
      parameter: string;
      olderValue: number;
      newerValue: number;
      unit: string;
      changePercent: string;
      direction: 'Improved' | 'Declined' | 'Stable';
    }[] = [];

    olderResults.forEach((oldRes: LabResult) => {
      const newRes = newerResults.find((r: LabResult) => r.testName.toLowerCase() === oldRes.testName.toLowerCase());
      if (newRes) {
        const diff = newRes.value - oldRes.value;
        const pct = oldRes.value !== 0 ? ((diff / oldRes.value) * 100).toFixed(1) + '%' : 'N/A';
        
        // Assess clinical direction based on parameter logic
        let direction: 'Improved' | 'Declined' | 'Stable' = 'Stable';
        const name = oldRes.testName.toLowerCase();
        
        if (name === 'cholesterol') {
          // Lower cholesterol is improved
          direction = diff < 0 ? 'Improved' : diff > 0 ? 'Declined' : 'Stable';
        } else if (name === 'vitamin d' || name === 'vitamin b12') {
          // Higher vitamin is improved (within normal limits, but generally true for low pre-seeds)
          direction = diff > 0 ? 'Improved' : diff < 0 ? 'Declined' : 'Stable';
        } else if (name === 'hemoglobin') {
          // Normal limit is stable, check deviations
          direction = Math.abs(diff) < 0.5 ? 'Stable' : newRes.status === 'Normal' ? 'Improved' : 'Declined';
        }

        comparisons.push({
          parameter: oldRes.testName,
          olderValue: oldRes.value,
          newerValue: newRes.value,
          unit: oldRes.unit,
          changePercent: diff >= 0 ? `+${pct}` : pct,
          direction
        });
      }
    });

    // Generate simulated comparison narrative
    let narrative = `### Clinical Report Comparison
Comparing **${olderRep.title}** (${new Date(olderRep.testDate).toLocaleDateString()}) vs **${newerRep.title}** (${new Date(newerRep.testDate).toLocaleDateString()}).

`;

    const improvements = comparisons.filter(c => c.direction === 'Improved');
    const declines = comparisons.filter(c => c.direction === 'Declined');

    if (improvements.length > 0) {
      narrative += `#### Improvements Logged:\n`;
      improvements.forEach(c => {
        narrative += `- **${c.parameter}**: Changed from ${c.olderValue} to ${c.newerValue} ${c.unit} (${c.changePercent}). Status represents positive clinical shift.\n`;
      });
    }

    if (declines.length > 0) {
      narrative += `\n#### Areas to Monitor:\n`;
      declines.forEach(c => {
        narrative += `- **${c.parameter}**: Moved from ${c.olderValue} to ${c.newerValue} ${c.unit} (${c.changePercent}). Discuss with your provider if interventions are necessary.\n`;
      });
    }

    if (improvements.length === 0 && declines.length === 0) {
      narrative += `*No significant biometric fluctuations detected. All parameters are clinically stable across both checkup checkpoints.*\n`;
    }

    return {
      olderTitle: olderRep.title,
      olderDate: olderRep.testDate,
      newerTitle: newerRep.title,
      newerDate: newerRep.testDate,
      comparisons,
      narrative
    };
  } catch (error) {
    console.error('Error comparing reports:', error);
    return { error: 'Failed to complete reports comparison analysis.' };
  }
}

// AI Doctor Visit Preparation Action
export async function generateDoctorPrepAI(patientId: string) {
  try {
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      include: {
        user: true,
        reports: {
          include: { results: true },
          orderBy: { testDate: 'desc' },
          take: 3
        }
      }
    });

    if (!patient) {
      return { error: 'Patient profile not found.' };
    }

    const reports = patient.reports as (Report & { results: LabResult[] })[];
    const reportsCount = reports.length;
    const allResults = reports.flatMap(r => r.results);
    const outOfRangeCount = allResults.filter(res => res.status !== 'Normal').length;

    // Collect recent deviations
    const deviations = allResults
      .filter(res => res.status !== 'Normal')
      .map(d => `- **${d.testName}**: Measured ${d.value} ${d.unit} (Category: ${d.status})`)
      .slice(0, 4);

    let summaryText = `### Patient Pre-Visit Brief: ${patient.user.name}
**Prepared on**: ${new Date().toLocaleDateString()}
**Recent Diagnostics Evaluated**: ${reportsCount} reports in database.

#### Biometric Summary:
- Total checked metrics: **${allResults.length}**
- Normal parameters: **${allResults.filter(res => res.status === 'Normal').length}**
- Parameters needing clinical adjustment: **${outOfRangeCount}**

`;

    if (deviations.length > 0) {
      summaryText += `#### Deviations Highlighted:\n${deviations.join('\n')}\n\n`;
    } else {
      summaryText += `*All analyzed parameters are currently within normal baseline limits.*\n\n`;
    }

    // Dynamic questions logic
    summaryText += `#### Recommended Consultation Questions:
1. **Clinical Follow-up**: "Based on my reports, should I make any adjustments to my diet or prescription list?"
2. **Micronutrient & Vital Targets**: "What target ranges should we set for my key metrics (like Cholesterol and Vitamin D) before my next annual review?"
3. **Re-Testing Schedule**: "When is the optimal timeline to schedule my next panel to track these updates?"`;

    return { content: summaryText };
  } catch (error) {
    console.error('Error generating doctor prep sheet:', error);
    return { error: 'Failed to generate appointment preparation planner.' };
  }
}

// Send Message action
export async function sendMessage(patientId: string, doctorId: string, senderRole: string, content: string) {
  if (!content.trim()) return { error: 'Message content cannot be empty' };

  try {
    const msg = await db.message.create({
      data: {
        patientId,
        doctorId,
        senderRole,
        content: content.trim(),
      },
    });

    // Notify recipient
    if (senderRole === 'PATIENT') {
      const doc = await db.doctor.findUnique({
        where: { id: doctorId },
      });
      if (doc) {
        await db.notification.create({
          data: {
            userId: doc.userId,
            message: 'New clinical query message from patient Sarah Ahmed.',
            status: 'UNREAD',
          },
        });
      }
    } else {
      const pat = await db.patient.findUnique({
        where: { id: patientId },
      });
      if (pat) {
        await db.notification.create({
          data: {
            userId: pat.userId,
            message: 'Dr. Robert Chen sent you a new secure medical recommendation.',
            status: 'UNREAD',
          },
        });
      }
    }

    revalidatePath('/patient/dashboard');
    revalidatePath('/doctor/dashboard');
    return { success: true, message: msg };
  } catch (error) {
    console.error('Error sending message:', error);
    return { error: 'Failed to dispatch message.' };
  }
}

// Upload Document action
export async function uploadDocument(patientId: string, title: string, category: string, fileSize: string) {
  if (!title.trim() || !category) return { error: 'Title and Category are required.' };

  try {
    const fileUrl = `/documents/${title.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    const doc = await db.document.create({
      data: {
        patientId,
        title: title.trim(),
        category,
        fileSize,
        fileUrl,
      },
    });

    // Also insert timeline event
    await db.timelineEvent.create({
      data: {
        patientId,
        title: `Uploaded document: ${title.trim()}`,
        eventType: 'Document',
        eventDate: new Date(),
        description: `New archive added to category "${category}". Size: ${fileSize}.`,
      },
    });

    // Audit log
    const session = await getSession();
    if (session) {
      await db.auditLog.create({
        data: {
          userId: session.id,
          action: `Uploaded health document "${title}" in category "${category}"`,
        },
      });
    }

    revalidatePath('/patient/dashboard');
    return { success: true, document: doc };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { error: 'Failed to register document.' };
  }
}

// Toggle Goal compliance check
export async function toggleGoal(goalId: string) {
  try {
    const goal = await db.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) return { error: 'Goal not found' };

    const updated = await db.goal.update({
      where: { id: goalId },
      data: { completed: !goal.completed },
    });

    revalidatePath('/patient/dashboard');
    return { success: true, completed: updated.completed };
  } catch (error) {
    console.error('Error toggling goal:', error);
    return { error: 'Failed to update goal compliance.' };
  }
}

// Sync Wearables vitals
export async function syncWearables(patientId: string) {
  try {
    const freshSteps = Math.floor(8000 + Math.random() * 3000);
    const freshHeart = Math.floor(68 + Math.random() * 15);
    const freshSleep = parseFloat((6.5 + Math.random() * 2).toFixed(1));

    const records = [
      { type: 'Steps', val: freshSteps },
      { type: 'HeartRate', val: freshHeart },
      { type: 'Sleep', val: freshSleep },
    ];

    for (const rec of records) {
      const existing = await db.wearableData.findFirst({
        where: { patientId, dataType: rec.type },
      });

      if (existing) {
        await db.wearableData.update({
          where: { id: existing.id },
          data: { value: rec.val, timestamp: new Date() },
        });
      } else {
        await db.wearableData.create({
          data: {
            patientId,
            dataType: rec.type,
            value: rec.val,
            timestamp: new Date(),
          },
        });
      }
    }

    // Audit Log
    const session = await getSession();
    if (session) {
      await db.auditLog.create({
        data: {
          userId: session.id,
          action: 'Synchronized wearable device diagnostics (Apple Watch / Fitbit)',
        },
      });
    }

    revalidatePath('/patient/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error syncing wearables:', error);
    return { error: 'Failed to sync wearable feeds.' };
  }
}

