export interface TranscriptSegment {
  id: number;
  speaker: 'doctor' | 'patient';
  text: string;
  timestamp: string;
}

// ============================================================
// Expanded clinical keyword dictionary for Chilean APS context
// Covers a wide range of symptoms, diagnoses, drugs, and
// therapeutic agreements commonly encountered in primary care.
// ============================================================

const keywordCategories = {
  symptoms: [
    // Respiratory
    'tos seca', 'tos con flema', 'tos', 'dolor de garganta', 'odinofagia',
    'fiebre', 'congestión nasal', 'rinorrea', 'dificultad para respirar',
    'disnea', 'ahogo', 'sibilancias', 'expectoración', 'flema', 'estornudos',
    'dolor torácico', 'opresión en el pecho', 'taquicardia',
    // GI
    'dolor abdominal', 'náuseas', 'vómitos', 'diarrea', 'constipación',
    'estreñimiento', 'acidez', 'reflujo', 'pirosis', 'distensión abdominal',
    'pérdida de apetito', 'anorexia', 'dolor epigástrico',
    // Neuro / General
    'dolor de cabeza', 'cefalea', 'mareo', 'vértigo', 'cansancio', 'fatiga',
    'astenia', 'debilidad', 'insomnio', 'trastorno del sueño', 'ansiedad',
    'depresión', 'irritabilidad', 'hormigueo', 'parestesias',
    // Musculoskeletal
    'dolor lumbar', 'lumbago', 'dolor articular', 'artralgia', 'dolor muscular',
    'mialgia', 'rigidez matinal', 'dolor de espalda',
    // Dermatological
    'prurito', 'picazón', 'rash', 'erupción', 'lesión en la piel', 'enrojecimiento',
    'descamación', 'ampollas',
    // Urinary / Gynecological
    'disuria', 'ardor al orinar', 'poliuria', 'nicturia', 'incontinencia',
    'sangrado', 'metrorragia', 'flujo vaginal', 'dolor pélvico',
    // Cardiovascular
    'edema', 'hinchazón de piernas', 'palpitaciones', 'síncope',
    // Other
    'pérdida de peso', 'aumento de peso', 'calofríos', 'sudoración nocturna',
    'ruidos patológicos', 'sibilancia',
  ],

  diagnoses: [
    // Respiratory
    'faringitis aguda', 'faringitis', 'amigdalitis', 'bronquitis', 'bronquitis aguda',
    'neumonía', 'resfriado común', 'infección viral', 'influenza', 'asma',
    'rinosinusitis', 'sinusitis', 'otitis', 'otitis media', 'laringitis',
    'EPOC', 'enfermedad pulmonar obstructiva',
    // Cardiovascular
    'hipertensión', 'hipertensión arterial', 'hipotensión', 'insuficiencia cardíaca',
    'arritmia', 'fibrilación auricular',
    // Endocrine / Metabolic
    'diabetes', 'diabetes mellitus', 'diabetes tipo 2', 'hipotiroidismo',
    'hipertiroidismo', 'dislipidemia', 'colesterol alto', 'obesidad',
    'sobrepeso', 'gota', 'anemia',
    // GI
    'gastritis', 'úlcera péptica', 'reflujo gastroesofágico', 'ERGE',
    'gastroenteritis', 'colon irritable', 'síndrome de intestino irritable',
    'hemorroides', 'hepatitis',
    // Musculoskeletal
    'artrosis', 'osteoporosis', 'lumbago', 'ciática', 'tendinitis',
    'artritis', 'fibromialgia',
    // Neuro / Psych
    'cefalea tensional', 'migraña', 'trastorno de ansiedad', 'depresión',
    'epilepsia', 'trastorno del sueño',
    // Dermatological
    'dermatitis', 'eccema', 'psoriasis', 'micosis', 'tiña', 'acné',
    'celulitis', 'impétigo',
    // Infectious
    'infección urinaria', 'ITU', 'cistitis', 'pielonefritis',
    ' COVID', 'tuberculosis',
    // Other
    'cuadro respiratorio alto', 'infección bacteriana', 'sobreinfección',
  ],

  drugs: [
    // Analgesics / Antipyretics
    'paracetamol', 'acetaminofén', 'ibuprofeno', 'naproxeno', 'diclofenaco',
    'ketoprofeno', 'aspirina', 'ácido acetilsalicílico', 'metamizol',
    // Antibiotics
    'amoxicilina', 'amoxicilina-ácido clavulánico', 'azitromicina', 'cefalexina',
    'cefuroxima', 'claritromicina', 'ciprofloxacino', 'doxiciclina',
    'trimetoprim', 'sulfametoxazol', 'clindamicina', 'metronidazol',
    // Cardiovascular
    'losartán', 'enalapril', 'valsartán', 'captopril', 'ramipril',
    'amlodipino', 'nifedipino', 'atenolol', 'metoprolol', ' carvedilol',
    'hidroclorotiazida', 'furosemida', 'espironolactona', 'losartan',
    'simvastatina', 'atorvastatina', 'rosuvastatina', 'pravastatina',
    // Endocrine
    'metformina', 'glibenclamida', 'glipizida', 'insulina', 'empagliflozina',
    'sitagliptina', 'levotiroxina',
    // Respiratory
    'salbutamol', 'salbutamol', 'budesonida', 'beclometasona', 'fluticasona',
    'montelukast', 'teofilina', 'bromuro de ipratropio',
    // GI
    'omeprazol', 'esomeprazol', 'pantoprazol', 'ranitidina', 'famotidina',
    'aluminio', 'magaldrato', 'metoclopramida', 'ondansetrón', 'loperamida',
    // Neuro / Psych
    'diazepam', 'clonazepam', 'sertralina', 'fluoxetina', 'paroxetina',
    'escitalopram', 'venlafaxina', 'mirtazapina', 'sumatriptán',
    'ácido valproico', 'carbamazepina', 'gabapentina', 'pregabalina',
    // Other
    'hidroxicina', 'dimenhidrinato', 'loratadina', 'cetirizina',
    'difenhidramina', 'ketotifeno',
  ],

  agreements: [
    'reposo', 'abundantes líquidos', 'hidratación', 'control en una semana',
    'certificado médico', 'reposo en casa', 'reposo absoluto',
    'dieta blanda', 'dieta hiposódica', 'dieta baja en azúcar',
    'ejercicio regular', 'caminar 30 minutos', 'actividad física',
    'control de fiebre', 'regreso si empeora', 'control de presión arterial',
    'control de glicemia', 'suspender tabaco', 'dejar de fumar',
    'reducir consumo de alcohol', 'higiene del sueño',
    'control por especialista', 'interconsulta',
    'exámenes de laboratorio', 'exámenes de sangre',
    'ecografía', 'radiografía', 'electrocardiograma', 'ECG',
    'control en un mes', 'control en 3 meses', 'control en 6 meses',
    'vacunación', 'vacuna contra la influenza', 'vacuna neumocócica',
    'educación al paciente', 'medicación habitual',
  ],
};

export function extractKeywords(transcript: string) {
  const lower = transcript.toLowerCase();
  const result = {
    symptoms: [] as string[],
    diagnoses: [] as string[],
    drugs: [] as string[],
    agreements: [] as string[],
  };

  for (const [category, terms] of Object.entries(keywordCategories)) {
    for (const term of terms) {
      const cleanTerm = term.trim().toLowerCase();
      if (cleanTerm && lower.includes(cleanTerm)) {
        // Avoid duplicates (e.g. "tos seca" and "tos" both match)
        const existing = result[category as keyof typeof result];
        const capTerm = cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1);
        if (!existing.some((e) => e.toLowerCase() === cleanTerm)) {
          existing.push(capTerm);
        }
      }
    }
  }

  return result;
}

// ============================================================
// Generic SOAP note generation
// Analyzes the full transcript and builds each SOAP section
// from the relevant patient and doctor statements.
// ============================================================

export function generateSOAP(
  transcript: string,
  patientName: string,
  patientAge: number | null,
  patientGender: string | null
) {
  const segments = parseSegments(transcript);
  const patientLines = segments.filter((s) => s.speaker === 'patient').map((s) => s.text);
  const doctorLines = segments.filter((s) => s.speaker === 'doctor').map((s) => s.text);
  const fullText = transcript.toLowerCase();
  const kw = extractKeywords(transcript);

  return {
    subjective: buildSubjective(patientLines, patientName, patientAge, patientGender, kw),
    objective: buildObjective(doctorLines, fullText),
    assessment: buildAssessment(fullText, kw),
    plan: buildPlan(fullText, doctorLines, kw),
  };
}

interface ParsedSegment {
  speaker: 'doctor' | 'patient';
  text: string;
}

function parseSegments(transcript: string): ParsedSegment[] {
  return transcript
    .split('\n\n')
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(Médico|Paciente):\s*(.*)$/);
      if (match) {
        return {
          speaker: match[1] === 'Médico' ? 'doctor' : ('patient' as const),
          text: match[2].trim(),
        };
      }
      // If no speaker prefix, assume doctor
      return { speaker: 'doctor' as const, text: line.trim() };
    });
}

function buildSubjective(
  patientLines: string[],
  name: string,
  age: number | null,
  gender: string | null,
  kw: ReturnType<typeof extractKeywords>
): string {
  const parts: string[] = [];
  const genderLabel = gender === 'F' ? 'femenino' : gender === 'M' ? 'masculino' : '';
  const ageLabel = age ? `${age} años` : '';
  const idParts = [name || 'Paciente no identificado', ageLabel, `sexo ${genderLabel || 'no especificado'}`]
    .filter(Boolean)
    .join(', ');
  parts.push(`${idParts}.`);

  if (patientLines.length > 0) {
    // Summarize the patient's chief complaint from their first meaningful statement
    const complaint = patientLines.find((l) => l.length > 15) || patientLines[0];
    parts.push(`Motivo de consulta: ${complaint.trim()}.`);
  }

  // List extracted symptoms as reported
  if (kw.symptoms.length > 0) {
    parts.push(`Síntomas referidos: ${kw.symptoms.join(', ').toLowerCase()}.`);
  }

  // Check for medication the patient is already taking
  if (kw.drugs.length > 0) {
    const patientMeds = patientLines.some((l) =>
      kw.drugs.some((d) => l.toLowerCase().includes(d.toLowerCase()))
    );
    if (patientMeds) {
      parts.push(`Medicación habitual: ${kw.drugs.join(', ')}.`);
    }
  }

  // Check for chronic conditions mentioned by patient
  const chronicConditions = kw.diagnoses.filter((d) =>
    ['Hipertensión', 'Diabetes', 'Asma', 'Hipotiroidismo', 'EPOC'].some((c) =>
      d.toLowerCase().includes(c.toLowerCase())
    )
  );
  if (chronicConditions.length > 0) {
    parts.push(`Antecedentes mórbidos: ${chronicConditions.join(', ')}.`);
  }

  if (parts.length <= 1) {
    parts.push('Paciente refiere malestar general. Se requiere evaluación clínica.');
  }

  return parts.join(' ');
}

function buildObjective(doctorLines: string[], fullText: string): string {
  const parts: string[] = [];

  // Extract vital signs and physical exam findings from doctor's statements
  const examLine = doctorLines.find((l) =>
    /examin|examen|explo|abra la boca|auscult|palp|pres[ió]o|temperatura|pulm/i.test(l)
  );
  if (examLine) {
    // Clean up the exam statement, removing conversational filler
    let cleaned = examLine.replace(/^(bien\.?|voy a examinarla?\.?|abra la boca,? por favor\.?|voy a examinarlo\.?)\s*/i, '');
    if (cleaned.length > 10) {
      parts.push(cleaned.trim() + '.');
    }
  }

  // Extract blood pressure
  const bpMatch = fullText.match(/(\d{2,3}\s*\/\s*\d{2,3})/);
  if (bpMatch) {
    parts.push(`Presión arterial: ${bpMatch[1].replace(/\s/g, '')} mmHg.`);
  }

  // Extract temperature
  const tempMatch = fullText.match(/temperatura\s*(?:de\s*)?(\d{2}(?:[.,]\d)?)/);
  if (tempMatch) {
    parts.push(`Temperatura: ${tempMatch[1].replace(',', '.')}°C.`);
  } else if (fullText.includes('febril')) {
    parts.push('Temperatura: febril al examen.');
  }

  // Extract heart rate
  const hrMatch = fullText.match(/(?:frecuencia cardíaca|pulso)\s*(?:de\s*)?(\d{2,3})/);
  if (hrMatch) {
    parts.push(`Frecuencia cardíaca: ${hrMatch[1]} lpm.`);
  }

  // Extract oxygen saturation
  const satMatch = fullText.match(/(?:saturaci[oó]n|sat)\s*(?:de\s*)?(\d{2})/);
  if (satMatch) {
    parts.push(`Saturación O₂: ${satMatch[1]}%.`);
  }

  // Respiratory findings
  if (fullText.includes('pulm')) {
    if (fullText.includes('sin ruidos') || fullText.includes('suenan bien') || fullText.includes('murmullo')) {
      parts.push('Auscultación pulmonar: murmullo vesicular conservado, sin ruidos patológicos.');
    } else if (fullText.includes('sibilancia') || fullText.includes('sibil')) {
      parts.push('Auscultación pulmonar: sibilancias espiratorias.');
    } else if (fullText.includes('crepitos') || fullText.includes('crepita')) {
      parts.push('Auscultación pulmonar: crepitos en base pulmonar.');
    }
  }

  // Throat findings
  if (fullText.includes('garganta') || fullText.includes('faringe') || fullText.includes('amígdala')) {
    if (fullText.includes('enrojec') || fullText.includes('eritema')) {
      parts.push('Orofaringe: eritema faríngeo, sin exudado purulento visible.');
    } else if (fullText.includes('exudado') || fullText.includes('placas')) {
      parts.push('Orofaringe: exudado blanquecino en amígdalas.');
    }
  }

  // Edema
  if (fullText.includes('edema') || fullText.includes('hinchaz')) {
    parts.push('Extremidades inferiores: edema leve.');
  }

  // Abdominal exam
  if (fullText.includes('abdomen') || fullText.includes('abdominal')) {
    if (fullText.includes('blando') || fullText.includes('no doloroso')) {
      parts.push('Abdomen: blando, depresible, no doloroso a la palpación.');
    } else if (fullText.includes('dolor')) {
      parts.push('Abdomen: doloroso a la palpación en región epigástrica.');
    }
  }

  if (parts.length === 0) {
    // Use any doctor line that mentions exam-related keywords
    if (examLine) {
      parts.push('Examen físico: sin hallazgos patológicos significativos al examen.');
    } else {
      parts.push('Examen físico pendiente de registro detallado.');
    }
  }

  return parts.join(' ');
}

function buildAssessment(fullText: string, kw: ReturnType<typeof extractKeywords>): string {
  const parts: string[] = [];

  // Primary diagnosis
  if (kw.diagnoses.length > 0) {
    const primary = kw.diagnoses[0];
    const isViral = fullText.includes('viral') || fullText.includes('virus');
    const isBacterial = fullText.includes('bacterian') || fullText.includes('bacteria');

    if (isViral) {
      parts.push(`${primary} de probable etiología viral.`);
    } else if (isBacterial) {
      parts.push(`${primary} de probable etiología bacteriana.`);
    } else {
      parts.push(`${primary}.`);
    }

    // Check for absence of concerning signs
    if (fullText.includes('sin signos de gravedad') || fullText.includes('sin ruidos patológicos')) {
      parts.push('Sin signos de gravedad al examen físico.');
    }
  } else {
    // Try to infer from symptoms
    if (kw.symptoms.some((s) => s.toLowerCase().includes('tos') || s.toLowerCase().includes('garganta'))) {
      parts.push('Cuadro respiratorio alto de probable origen viral.');
    } else if (kw.symptoms.some((s) => s.toLowerCase().includes('abdominal') || s.toLowerCase().includes('náusea') || s.toLowerCase().includes('diarrea'))) {
      parts.push('Cuadro gastrointestinal en estudio.');
    } else if (kw.symptoms.some((s) => s.toLowerCase().includes('cefalea') || s.toLowerCase().includes('dolor de cabeza'))) {
      parts.push('Cefalea en estudio, descartar causas secundarias.');
    } else if (kw.symptoms.length > 0) {
      parts.push(`Síndrome clínico caracterizado por ${kw.symptoms.slice(0, 3).join(', ').toLowerCase()}.`);
    } else {
      parts.push('Cuadro clínico en evaluación.');
    }
  }

  // Chronic conditions co-morbidity
  const chronic = kw.diagnoses.filter((d) =>
    ['Hipertensión', 'Diabetes', 'Asma', 'Hipotiroidismo', 'EPOC', 'Dislipidemia', 'Obesidad'].some((c) =>
      d.toLowerCase().includes(c.toLowerCase())
    )
  );
  if (chronic.length > 0) {
    parts.push(`${chronic.join(', ')} — sin descompensación aparente.`);
  }

  // Overall assessment
  parts.push('Paciente en buen estado general.');

  return parts.join(' ');
}

function buildPlan(
  fullText: string,
  doctorLines: string[],
  kw: ReturnType<typeof extractKeywords>
): string {
  const parts: string[] = [];

  // Medication indications
  if (kw.drugs.length > 0) {
    for (const drug of kw.drugs) {
      const drugLower = drug.toLowerCase();
      // Look for dosage info near the drug name in doctor's lines
      const dosageLine = doctorLines.find((l) => l.toLowerCase().includes(drugLower));
      if (dosageLine) {
        // Try to extract dose and frequency
        const doseMatch = dosageLine.match(new RegExp(`${escapeRegex(drugLower)}[^.]*?(\\d+\\s*(?:mg|ml|mcg|g|gotas|comprimidos?)?(?:\\s*/\\s*\\d+\\s*(?:mg|ml)?)?)`, 'i'));
        const freqMatch = dosageLine.match(/c\/\s*(\d+\s*(?:h|horas?))|cada\s+(\d+\s*(?:h|horas?|días?))|(\d+\s*veces\s*(?:al|por)\s*d[íi]a)/i);

        if (doseMatch || freqMatch) {
          const dose = doseMatch ? doseMatch[1].trim() : '';
          const freq = freqMatch ? (freqMatch[1] || freqMatch[2] || freqMatch[3]).trim() : '';
          const parts2 = [drug, dose, freq].filter(Boolean).join(' ');
          parts.push(`${parts2}.`);
        } else {
          parts.push(`${drug}: según indicación médica.`);
        }
      } else {
        parts.push(`Continuar ${drug}.`);
      }
    }
  }

  // Non-pharmacological measures
  if (kw.agreements.includes('Reposo')) parts.push('Reposo en casa.');
  if (kw.agreements.includes('Abundantes líquidos') || kw.agreements.includes('Hidratación')) {
    parts.push('Hidratación abundante.');
  }
  if (kw.agreements.includes('Dieta blanda')) parts.push('Dieta blanda.');
  if (kw.agreements.includes('Dieta hiposódica')) parts.push('Dieta hiposódica.');
  if (kw.agreements.includes('Dieta baja en azúcar')) parts.push('Dieta baja en azúcares.');
  if (kw.agreements.includes('Suspender tabaco') || kw.agreements.includes('Dejar de fumar')) {
    parts.push('Suspender hábito tabáquico.');
  }
  if (kw.agreements.includes('Ejercicio regular') || kw.agreements.includes('Caminar 30 minutos')) {
    parts.push('Fomentar actividad física regular.');
  }

  // Certificates
  if (kw.agreements.includes('Certificado médico')) {
    parts.push('Emitir certificado médico por los días de reposo indicados.');
  }

  // Referrals and exams
  if (kw.agreements.includes('Exámenes de laboratorio') || kw.agreements.includes('Exámenes de sangre')) {
    parts.push('Solicitar exámenes de laboratorio.');
  }
  if (kw.agreements.includes('Radiografía')) parts.push('Solicitar radiografía.');
  if (kw.agreements.includes('Ecografía')) parts.push('Solicitar ecografía.');
  if (kw.agreements.includes('Electrocardiograma') || kw.agreements.includes('ECG')) {
    parts.push('Solicitar electrocardiograma.');
  }
  if (kw.agreements.includes('Interconsulta') || kw.agreements.includes('Control por especialista')) {
    parts.push('Derivar a especialista mediante interconsulta.');
  }

  // Follow-up
  if (kw.agreements.includes('Control en una semana')) {
    parts.push('Control en consultorio en 1 semana.');
  } else if (kw.agreements.includes('Control en un mes')) {
    parts.push('Control en 1 mes.');
  } else if (kw.agreements.includes('Control en 3 meses')) {
    parts.push('Control en 3 meses.');
  } else if (kw.agreements.includes('Control en 6 meses')) {
    parts.push('Control en 6 meses.');
  } else if (kw.agreements.includes('Control de presión arterial')) {
    parts.push('Automonitoreo de presión arterial en domicilio.');
  } else if (kw.agreements.includes('Control de glicemia')) {
    parts.push('Automonitoreo de glicemia capilar.');
  }

  // Vaccination
  if (kw.agreements.includes('Vacunación') || kw.agreements.includes('Vacuna contra la influenza')) {
    parts.push('Administrar vacuna contra la influenza.');
  }
  if (kw.agreements.includes('Vacuna neumocócica')) {
    parts.push('Administrar vacuna neumocócica.');
  }

  // General patient education
  parts.push('Educación al paciente: consultar de inmediato si los síntomas empeoran o aparecen signos de alarma.');

  return parts.join(' ');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
