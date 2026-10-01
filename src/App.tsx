import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, type Consultation } from '@/lib/supabase';
import {
  extractKeywords,
  generateSOAP,
  type TranscriptSegment,
} from '@/lib/clinicalEngine';
import {
  getSpeechRecognitionConstructor,
  isSpeechRecognitionSupported,
  type SpeechRecognition,
  type SpeechRecognitionEvent,
  type SpeechRecognitionErrorEvent,
} from '@/lib/speechRecognition';
import {
  Mic, MicOff, Square, Loader2, Stethoscope, Shield, CheckCircle2,
  AlertTriangle, FileText, Sparkles, Save, Download, Clock,
  User, Hash, Calendar, Activity, Pill, ClipboardCheck, Lock,
  Volume2, ChevronRight, Edit3, X, AlertCircle, RotateCcw,
  History, Eye, ArrowLeft, StethoscopeIcon,
} from 'lucide-react';

type AppPhase = 'idle' | 'recording' | 'processing' | 'ready' | 'approved';
type Speaker = 'doctor' | 'patient';
type Tab = 'consulta' | 'historial';

interface PatientInfo {
  name: string;
  rut: string;
  age: string;
  gender: string;
  specialty: string;
  doctorName: string;
}

const emptyKeywords: { symptoms: string[]; diagnoses: string[]; drugs: string[]; agreements: string[] } = { symptoms: [], diagnoses: [], drugs: [], agreements: [] };

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('consulta');
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('doctor');
  const [fullTranscript, setFullTranscript] = useState('');
  const [keywords, setKeywords] = useState(emptyKeywords);
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savedConsultations, setSavedConsultations] = useState<Consultation[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [browserSupported] = useState(() => isSpeechRecognitionSupported());
  const [viewingConsultation, setViewingConsultation] = useState<Consultation | null>(null);

  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '', rut: '', age: '', gender: 'F', specialty: 'Medicina Familiar', doctorName: '',
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const currentSpeakerRef = useRef<Speaker>('doctor');
  const segmentIdRef = useRef(0);
  const accumulatedSegmentsRef = useRef<TranscriptSegment[]>([]);
  const shouldRestartRef = useRef(false);
  const recordingTimeRef = useRef(0);

  useEffect(() => { currentSpeakerRef.current = currentSpeaker; }, [currentSpeaker]);
  useEffect(() => { recordingTimeRef.current = recordingTime; }, [recordingTime]);
  useEffect(() => { loadConsultations(); }, []);

  async function loadConsultations() {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error('Error loading consultations:', error); return; }
    if (data) setSavedConsultations(data as Consultation[]);
  }

  useEffect(() => {
    if (transcriptEndRef.current) transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interimText]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (!browserSupported) return;
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return;

    setSpeechError(null);
    setSegments([]); setInterimText(''); setFullTranscript('');
    setKeywords(emptyKeywords);
    setSoap({ subjective: '', objective: '', assessment: '', plan: '' });
    setRecordingTime(0);
    segmentIdRef.current = 0;
    accumulatedSegmentsRef.current = [];
    setCurrentSpeaker('doctor'); currentSpeakerRef.current = 'doctor';
    setPhase('recording'); setIsRecording(true); shouldRestartRef.current = true;

    const recognition = new Ctor();
    recognition.lang = 'es-CL';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''; let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) finalText += transcript; else interim += transcript;
      }
      if (finalText.trim()) {
        const id = ++segmentIdRef.current;
        const newSegment: TranscriptSegment = { id, speaker: currentSpeakerRef.current, text: finalText.trim(), timestamp: formatTimeDisplay(recordingTimeRef.current) };
        accumulatedSegmentsRef.current = [...accumulatedSegmentsRef.current, newSegment];
        setSegments([...accumulatedSegmentsRef.current]);
        setInterimText('');
      } else { setInterimText(interim); }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechError('Permiso de micrófono denegado. Habilite el acceso al micrófono en su navegador.');
        stopRecording();
      } else if (event.error === 'network') {
        setSpeechError('Error de red en el servicio de reconocimiento de voz.');
      } else {
        setSpeechError(`Error de reconocimiento: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) { try { recognition.start(); } catch { /* ignore */ } }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); }
    catch (err) {
      console.error('Failed to start recognition:', err);
      setSpeechError('No se pudo iniciar el reconocimiento de voz.');
      setIsRecording(false); setPhase('idle');
    }
  }, [browserSupported]);

  const stopRecording = useCallback(() => {
    shouldRestartRef.current = false;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { /* ignore */ } recognitionRef.current = null; }
    setInterimText('');
    const finalSegments = accumulatedSegmentsRef.current;
    if (finalSegments.length === 0) { setPhase('idle'); return; }

    const transcriptText = segmentsToText(finalSegments);
    setFullTranscript(transcriptText);
    setPhase('processing');

    setTimeout(() => {
      const extractedKeywords = extractKeywords(transcriptText);
      const generatedSOAP = generateSOAP(transcriptText, patientInfo.name, Number(patientInfo.age) || null, patientInfo.gender);
      setKeywords(extractedKeywords);
      setSoap(generatedSOAP);
      setPhase('ready');
    }, 800);
  }, [patientInfo]);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch { /* ignore */ } }
    };
  }, []);

  function segmentsToText(segs: TranscriptSegment[]): string {
    return segs.map((s) => `${s.speaker === 'doctor' ? 'Médico' : 'Paciente'}: ${s.text}`).join('\n\n');
  }

  async function saveConsultation(approved: boolean) {
    setSaveStatus('saving');
    const insertData = {
      patient_name: patientInfo.name || 'Sin identificar',
      patient_rut: patientInfo.rut || null,
      patient_age: Number(patientInfo.age) || null,
      patient_gender: patientInfo.gender,
      specialty: patientInfo.specialty,
      consultation_date: new Date().toISOString(),
      transcript: fullTranscript,
      soap_subjective: soap.subjective,
      soap_objective: soap.objective,
      soap_assessment: soap.assessment,
      soap_plan: soap.plan,
      keywords: keywords,
      status: approved ? 'approved' : 'draft',
      doctor_name: patientInfo.doctorName || 'No especificado',
      approved_at: approved ? new Date().toISOString() : null,
      approved_by: approved ? patientInfo.doctorName : '',
    };

    const { data, error } = await supabase.from('consultations').insert(insertData).select().maybeSingle();
    if (error) { setSaveStatus('error'); console.error('Save error:', error); return; }
    if (data) {
      await supabase.from('consultation_audit_log').insert({
        consultation_id: data.id,
        action: approved ? 'approved' : 'saved_draft',
        actor: patientInfo.doctorName || 'No especificado',
        details: { timestamp: new Date().toISOString(), law_compliance: 'Ley N° 21.719' },
      });
    }
    setSaveStatus('saved');
    if (approved) setPhase('approved');
    loadConsultations();
    setTimeout(() => setSaveStatus('idle'), 3000);
  }

  function handleApprove() { setShowReviewModal(false); saveConsultation(true); }

  function handleExport() {
    const content = `NOTA CLÍNICA SOAP\n====================\nFecha: ${new Date().toLocaleString('es-CL')}\nMédico: ${patientInfo.doctorName || 'No especificado'}\nEspecialidad: ${patientInfo.specialty}\n\nDATOS DEL PACIENTE\n==================\nNombre: ${patientInfo.name || 'Sin identificar'}\nRUT: ${patientInfo.rut || 'N/A'}\nEdad: ${patientInfo.age || 'N/A'}\nGénero: ${patientInfo.gender === 'F' ? 'Femenino' : patientInfo.gender === 'M' ? 'Masculino' : 'Otro'}\n\nTRANSCRIPCIÓN DE LA CONSULTA\n=============================\n${fullTranscript}\n\nNOTA SOAP\n=========\nS (Subjetivo):\n${soap.subjective}\n\nO (Objetivo):\n${soap.objective}\n\nA (Assessment/Evaluación):\n${soap.assessment}\n\nP (Plan):\n${soap.plan}\n\nPALABRAS CLAVE EXTRAÍDAS\n========================\nSíntomas: ${keywords.symptoms.join(', ') || 'Ninguno'}\nDiagnósticos: ${keywords.diagnoses.join(', ') || 'Ninguno'}\nFármacos: ${keywords.drugs.join(', ') || 'Ninguno'}\nAcuerdos terapéuticos: ${keywords.agreements.join(', ') || 'Ninguno'}\n\nESTADO: Aprobado por ${patientInfo.doctorName || 'el médico tratante'}\nCumplimiento: Ley N° 21.719 - Protección de datos sensibles de salud\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nota_clinica_${patientInfo.rut || patientInfo.name || 'paciente'}_${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function loadSavedConsultation(c: Consultation) {
    setPatientInfo({ name: c.patient_name || '', rut: c.patient_rut || '', age: c.patient_age?.toString() || '', gender: c.patient_gender || 'F', specialty: c.specialty || 'Medicina Familiar', doctorName: c.doctor_name || '' });
    setFullTranscript(c.transcript || '');
    setKeywords(c.keywords || emptyKeywords);
    setSoap({ subjective: c.soap_subjective || '', objective: c.soap_objective || '', assessment: c.soap_assessment || '', plan: c.soap_plan || '' });
    setSegments(c.transcript ? c.transcript.split('\n\n').map((line, i) => {
      const match = line.match(/^(Médico|Paciente):\s*(.*)$/);
      return { id: i + 1, speaker: match?.[1] === 'Médico' ? 'doctor' : 'patient', text: match?.[2] || line, timestamp: '' };
    }) : []);
    setPhase(c.status === 'approved' ? 'approved' : 'ready');
    setRecordingTime(0);
    setActiveTab('consulta');
  }

  function resetAll() {
    setPhase('idle'); setSegments([]); setInterimText(''); setFullTranscript('');
    setKeywords(emptyKeywords); setSoap({ subjective: '', objective: '', assessment: '', plan: '' });
    setRecordingTime(0); setSpeechError(null);
    setPatientInfo({ name: '', rut: '', age: '', gender: 'F', specialty: 'Medicina Familiar', doctorName: '' });
  }

  const isProcessing = phase === 'processing';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-md">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">EcoClinical APS</h1>
              <p className="text-xs text-slate-500 leading-tight">Asistente de IA para Atención Primaria</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="font-medium">Ley N° 21.719</span>
            <span className="text-slate-400">|</span>
            <span>Datos sensibles protegidos</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex gap-1">
          <TabButton active={activeTab === 'consulta'} onClick={() => setActiveTab('consulta')} icon={<Mic className="w-4 h-4" />} label="Consulta Actual" />
          <TabButton active={activeTab === 'historial'} onClick={() => setActiveTab('historial')} icon={<History className="w-4 h-4" />} label="Historial de Consultas" badge={savedConsultations.length} />
        </div>
      </nav>

      {/* Compliance Banner */}
      {activeTab === 'consulta' && <ComplianceBanner />}

      {/* Browser Support Warning */}
      {!browserSupported && activeTab === 'consulta' && <BrowserUnsupportedBanner />}

      {/* Speech Error */}
      {speechError && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{speechError}</span>
            </div>
            <button onClick={() => setSpeechError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4">
        {activeTab === 'consulta' ? (
          <>
            <PatientInfoBar patientInfo={patientInfo} setPatientInfo={setPatientInfo} disabled={isRecording || isProcessing} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
              <div className="lg:col-span-5 flex flex-col gap-4">
                <RecordingPanel phase={phase} isRecording={isRecording} recordingTime={recordingTime} onStart={startRecording} onStop={stopRecording} onReset={resetAll} browserSupported={browserSupported} currentSpeaker={currentSpeaker} onToggleSpeaker={() => setCurrentSpeaker((s) => (s === 'doctor' ? 'patient' : 'doctor'))} />
                <TranscriptPanel segments={segments} interimText={interimText} currentSpeaker={currentSpeaker} phase={phase} transcriptEndRef={transcriptEndRef} />
              </div>
              <div className="lg:col-span-7 flex flex-col gap-4">
                <KeywordsPanel keywords={keywords} phase={phase} />
                <SOAPPanel soap={soap} setSoap={setSoap} phase={phase} editingSection={editingSection} setEditingSection={setEditingSection} onApprove={() => setShowReviewModal(true)} saveStatus={saveStatus} />
              </div>
            </div>
            {(phase === 'ready' || phase === 'approved') && (
              <ActionBar phase={phase} saveStatus={saveStatus} onReview={() => setShowReviewModal(true)} onExport={handleExport} onSaveDraft={() => saveConsultation(false)} />
            )}
          </>
        ) : (
          <HistorialTab consultations={savedConsultations} onView={setViewingConsultation} onLoad={loadSavedConsultation} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between text-xs text-slate-400">
          <span>EcoClinical APS · MVP · Chile 2026</span>
          <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" />Datos cifrados de extremo a extremo</span>
        </div>
      </footer>

      {showReviewModal && <ReviewModal patientInfo={patientInfo} soap={soap} keywords={keywords} onApprove={handleApprove} onCancel={() => setShowReviewModal(false)} />}
      {viewingConsultation && <ConsultationDetailModal consultation={viewingConsultation} onClose={() => setViewingConsultation(null)} onLoad={() => { loadSavedConsultation(viewingConsultation); setViewingConsultation(null); }} />}
    </div>
  );
}

/* ===================== Tab Button ===================== */
function TabButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
        active ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>{badge}</span>
      )}
    </button>
  );
}

/* ===================== Compliance Banner ===================== */
function ComplianceBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-teal-50 border-b border-teal-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-sm text-teal-800">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">Cumplimiento Ley N° 21.719:</span>
          <span className="hidden sm:inline text-teal-700">Los datos sensibles de salud se procesan con consentimiento informado del paciente. Toda nota requiere revisión y aprobación del médico antes de su almacenamiento.</span>
          <span className="sm:hidden text-teal-700">Revisión médica obligatoria antes de guardar.</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-teal-400 hover:text-teal-600 flex-shrink-0" aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* ===================== Browser Unsupported Banner ===================== */
function BrowserUnsupportedBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-0.5">Reconocimiento de voz no disponible en este navegador.</p>
          <p className="text-amber-700">Para usar la transcripción por voz, abra esta aplicación en <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong> de escritorio.</p>
        </div>
      </div>
    </div>
  );
}

/* ===================== Patient Info Bar ===================== */
function PatientInfoBar({ patientInfo, setPatientInfo, disabled }: { patientInfo: PatientInfo; setPatientInfo: (info: PatientInfo) => void; disabled: boolean }) {
  const genderOptions = [{ value: 'F', label: 'Femenino' }, { value: 'M', label: 'Masculino' }, { value: 'O', label: 'Otro' }];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3"><User className="w-4 h-4 text-teal-600" /><h2 className="text-sm font-semibold text-slate-700">Datos del Paciente y Médico</h2></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <InfoInput label="Nombre del paciente" icon={<User className="w-3.5 h-3.5" />} value={patientInfo.name} onChange={(v) => setPatientInfo({ ...patientInfo, name: v })} disabled={disabled} placeholder="María González" />
        <InfoInput label="RUT" icon={<Hash className="w-3.5 h-3.5" />} value={patientInfo.rut} onChange={(v) => setPatientInfo({ ...patientInfo, rut: v })} disabled={disabled} placeholder="12.345.678-9" />
        <InfoInput label="Edad" icon={<Calendar className="w-3.5 h-3.5" />} value={patientInfo.age} onChange={(v) => setPatientInfo({ ...patientInfo, age: v })} disabled={disabled} placeholder="45" type="number" />
        <InfoSelect label="Género" value={patientInfo.gender} onChange={(v) => setPatientInfo({ ...patientInfo, gender: v })} disabled={disabled} options={genderOptions} />
        <InfoInput label="Especialidad" icon={<Stethoscope className="w-3.5 h-3.5" />} value={patientInfo.specialty} onChange={(v) => setPatientInfo({ ...patientInfo, specialty: v })} disabled={disabled} placeholder="Medicina Familiar" />
        <InfoInput label="Médico tratante" icon={<ClipboardCheck className="w-3.5 h-3.5" />} value={patientInfo.doctorName} onChange={(v) => setPatientInfo({ ...patientInfo, doctorName: v })} disabled={disabled} placeholder="Dr. Pérez" />
      </div>
    </div>
  );
}

function InfoInput({ label, value, onChange, disabled, placeholder, icon, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; placeholder: string; icon?: React.ReactNode; type?: string }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-500 mb-1 block">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={`w-full text-sm border border-slate-200 rounded-lg py-2 ${icon ? 'pl-8' : 'pl-3'} pr-3 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all disabled:bg-slate-50 disabled:text-slate-400`} />
      </div>
    </div>
  );
}

function InfoSelect({ label, value, onChange, disabled, options }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-500 mb-1 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full text-sm border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all disabled:bg-slate-50 disabled:text-slate-400 bg-white">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ===================== Recording Panel ===================== */
function RecordingPanel({ phase, isRecording, recordingTime, onStart, onStop, onReset, browserSupported, currentSpeaker, onToggleSpeaker }: {
  phase: AppPhase; isRecording: boolean; recordingTime: number; onStart: () => void; onStop: () => void; onReset: () => void; browserSupported: boolean; currentSpeaker: Speaker; onToggleSpeaker: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Volume2 className="w-5 h-5 text-teal-600" /><h2 className="text-sm font-semibold text-slate-700">Grabación de Audio</h2></div>
        {(phase === 'ready' || phase === 'approved') && <button onClick={onReset} className="text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Nueva consulta</button>}
      </div>
      {isRecording && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Hablando ahora:</span>
          <button onClick={onToggleSpeaker} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${currentSpeaker === 'doctor' ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-300' : 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'}`}>
            {currentSpeaker === 'doctor' ? <Stethoscope className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            {currentSpeaker === 'doctor' ? 'Médico' : 'Paciente'}
            <span className="text-[10px] opacity-60 ml-0.5">(cambiar)</span>
          </button>
        </div>
      )}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative">
          {isRecording && (<><div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" /><div className="absolute inset-0 rounded-full bg-red-400/20 animate-pulse" /></>)}
          <button onClick={isRecording ? onStop : onStart} disabled={phase === 'processing' || !browserSupported} className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 scale-105' : phase === 'processing' || !browserSupported ? 'bg-slate-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 hover:scale-105'}`}>
            {isRecording ? <Square className="w-8 h-8 text-white" fill="white" /> : phase === 'processing' ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Mic className="w-8 h-8 text-white" />}
          </button>
        </div>
        <div className="mt-4 text-center">
          {phase === 'idle' && (<><p className="text-sm text-slate-500">Pulse para iniciar la grabación de la consulta</p><p className="text-xs text-slate-400 mt-1">Se transcribirá su voz en tiempo real (español de Chile)</p></>)}
          {isRecording && (<><div className="flex items-center justify-center gap-2 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-sm font-semibold">Grabando...</span></div><p className="text-2xl font-mono font-bold text-slate-800 mt-1">{formatTimeDisplay(recordingTime)}</p><p className="text-xs text-slate-400 mt-1">Hable al micrófono. La transcripción aparece en tiempo real.</p></>)}
          {phase === 'processing' && <div className="flex items-center justify-center gap-2 text-teal-600"><Sparkles className="w-4 h-4 animate-pulse" /><span className="text-sm font-semibold">Extrayendo palabras clave y nota SOAP...</span></div>}
          {phase === 'ready' && <div className="flex items-center justify-center gap-2 text-teal-600"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-semibold">Transcripción completada</span></div>}
          {phase === 'approved' && <div className="flex items-center justify-center gap-2 text-green-600"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-semibold">Nota aprobada y guardada</span></div>}
        </div>
      </div>
    </div>
  );
}

function formatTimeDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60); const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ===================== Transcript Panel ===================== */
function TranscriptPanel({ segments, interimText, currentSpeaker, phase, transcriptEndRef }: {
  segments: TranscriptSegment[]; interimText: string; currentSpeaker: Speaker; phase: AppPhase; transcriptEndRef: React.RefObject<HTMLDivElement>;
}) {
  const isEmpty = segments.length === 0 && !interimText;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[300px] max-h-[500px]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /><h2 className="text-sm font-semibold text-slate-700">Transcripción en Tiempo Real</h2></div>
        {phase === 'recording' && <span className="text-xs text-red-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />En vivo</span>}
        {(phase === 'ready' || phase === 'approved') && <span className="text-xs text-teal-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {segments.length} segmentos</span>}
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isEmpty && phase === 'idle' && <div className="flex flex-col items-center justify-center h-full text-center py-12"><MicOff className="w-10 h-10 text-slate-300 mb-2" /><p className="text-sm text-slate-400">La transcripción aparecerá aquí cuando comience la grabación</p></div>}
        {isEmpty && phase === 'processing' && <div className="flex flex-col items-center justify-center h-full text-center py-12"><Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-2" /><p className="text-sm text-slate-500">Procesando transcripción...</p></div>}
        {segments.map((seg) => (
          <div key={seg.id} className="flex gap-3 transition-all duration-300">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${seg.speaker === 'doctor' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>{seg.speaker === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <User className="w-4 h-4" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold ${seg.speaker === 'doctor' ? 'text-teal-700' : 'text-amber-700'}`}>{seg.speaker === 'doctor' ? 'Médico' : 'Paciente'}</span>
                {seg.timestamp && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {seg.timestamp}</span>}
              </div>
              <p className={`text-sm rounded-xl px-3 py-2 ${seg.speaker === 'doctor' ? 'bg-teal-50 text-slate-700' : 'bg-amber-50 text-slate-700'}`}>{seg.text}</p>
            </div>
          </div>
        ))}
        {interimText && (
          <div className="flex gap-3 transition-all duration-300 opacity-60">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${currentSpeaker === 'doctor' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>{currentSpeaker === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <User className="w-4 h-4" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5"><span className={`text-xs font-semibold ${currentSpeaker === 'doctor' ? 'text-teal-700' : 'text-amber-700'}`}>{currentSpeaker === 'doctor' ? 'Médico' : 'Paciente'}</span><span className="text-[10px] text-slate-400 italic">escribiendo...</span></div>
              <p className={`text-sm rounded-xl px-3 py-2 italic ${currentSpeaker === 'doctor' ? 'bg-teal-50 text-slate-500' : 'bg-amber-50 text-slate-500'}`}>{interimText}</p>
            </div>
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
}

/* ===================== Keywords Panel ===================== */
function KeywordsPanel({ keywords, phase }: { keywords: { symptoms: string[]; diagnoses: string[]; drugs: string[]; agreements: string[] }; phase: AppPhase }) {
  const groups = [
    { key: 'symptoms', label: 'Síntomas', icon: <Activity className="w-3.5 h-3.5" />, color: 'orange' },
    { key: 'diagnoses', label: 'Diagnósticos', icon: <ClipboardCheck className="w-3.5 h-3.5" />, color: 'red' },
    { key: 'drugs', label: 'Fármacos', icon: <Pill className="w-3.5 h-3.5" />, color: 'teal' },
    { key: 'agreements', label: 'Acuerdos', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'blue' },
  ] as const;

  const colorClasses: Record<string, { bg: string; text: string; border: string; chipBg: string; chipText: string }> = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', chipBg: 'bg-orange-100', chipText: 'text-orange-800' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', chipBg: 'bg-red-100', chipText: 'text-red-800' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', chipBg: 'bg-teal-100', chipText: 'text-teal-800' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', chipBg: 'bg-blue-100', chipText: 'text-blue-800' },
  };

  const hasContent = keywords.symptoms.length > 0 || keywords.diagnoses.length > 0 || keywords.drugs.length > 0 || keywords.agreements.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-teal-600" /><h2 className="text-sm font-semibold text-slate-700">Palabras Clave Clínicas Extraídas</h2>{phase === 'processing' && <Loader2 className="w-3.5 h-3.5 text-teal-500 animate-spin ml-1" />}</div>
      {!hasContent && phase !== 'processing' && <p className="text-sm text-slate-400 text-center py-6">Las palabras clave se extraerán automáticamente al finalizar la grabación.</p>}
      {phase === 'processing' && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}</div>}
      {hasContent && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {groups.map((group) => {
            const items = keywords[group.key]; const colors = colorClasses[group.color];
            return (
              <div key={group.key} className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
                <div className={`flex items-center gap-1.5 mb-2 ${colors.text}`}>{group.icon}<span className="text-xs font-semibold">{group.label}</span><span className="text-[10px] opacity-60">({items.length})</span></div>
                <div className="flex flex-wrap gap-1.5">
                  {items.length === 0 ? <span className="text-[11px] text-slate-400 italic">Sin hallazgos</span> : items.map((item, i) => <span key={i} className={`text-[11px] px-2 py-0.5 rounded-md ${colors.chipBg} ${colors.chipText} font-medium`}>{item}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== SOAP Panel with Approve Button ===================== */
function SOAPPanel({ soap, setSoap, phase, editingSection, setEditingSection, onApprove, saveStatus }: {
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  setSoap: (s: { subjective: string; objective: string; assessment: string; plan: string }) => void;
  phase: AppPhase; editingSection: string | null; setEditingSection: (s: string | null) => void; onApprove: () => void; saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}) {
  const sections = [
    { key: 'subjective', label: 'S — Subjetivo', color: 'amber', icon: <User className="w-4 h-4" /> },
    { key: 'objective', label: 'O — Objetivo', color: 'teal', icon: <Activity className="w-4 h-4" /> },
    { key: 'assessment', label: 'A — Evaluación', color: 'red', icon: <ClipboardCheck className="w-4 h-4" /> },
    { key: 'plan', label: 'P — Plan', color: 'blue', icon: <Pill className="w-4 h-4" /> },
  ] as const;

  const sectionColors: Record<string, { border: string; header: string; bg: string }> = {
    amber: { border: 'border-amber-200', header: 'text-amber-700', bg: 'bg-amber-50/50' },
    teal: { border: 'border-teal-200', header: 'text-teal-700', bg: 'bg-teal-50/50' },
    red: { border: 'border-red-200', header: 'text-red-700', bg: 'bg-red-50/50' },
    blue: { border: 'border-blue-200', header: 'text-blue-700', bg: 'bg-blue-50/50' },
  };

  const canEdit = phase === 'ready';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /><h2 className="text-sm font-semibold text-slate-700">Nota Clínica Estructurada (SOAP)</h2></div>
        {phase === 'processing' && <span className="text-xs text-teal-600 flex items-center gap-1"><Sparkles className="w-3 h-3 animate-pulse" /> Generando...</span>}
        {phase === 'approved' && <span className="text-xs text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobada</span>}
      </div>
      <div className="space-y-3">
        {sections.map((section) => {
          const colors = sectionColors[section.color];
          const isEditing = editingSection === section.key;
          const content = soap[section.key as keyof typeof soap];
          return (
            <div key={section.key} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className={`flex items-center gap-1.5 ${colors.header}`}>{section.icon}<span className="text-xs font-semibold">{section.label}</span></div>
                {canEdit && !isEditing && <button onClick={() => setEditingSection(section.key)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"><Edit3 className="w-3 h-3" /> Editar</button>}
              </div>
              <div className="px-4 pb-3">
                {isEditing ? (
                  <div>
                    <textarea value={content} onChange={(e) => setSoap({ ...soap, [section.key]: e.target.value })} className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-2.5 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-y bg-white" />
                    <div className="flex justify-end mt-1.5"><button onClick={() => setEditingSection(null)} className="text-xs bg-teal-600 text-white px-3 py-1 rounded-md hover:bg-teal-700 transition-colors">Hecho</button></div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content || (phase === 'processing' ? <span className="text-slate-300 italic">Generando contenido...</span> : <span className="text-slate-400 italic">Pendiente</span>)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Approve & Save button directly below SOAP */}
      {phase === 'ready' && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button onClick={onApprove} disabled={saveStatus === 'saving'} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all shadow-md shadow-green-600/20 disabled:opacity-50">
            {saveStatus === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Aprobar y Guardar en Historial
          </button>
          <p className="text-xs text-slate-400 text-center mt-2">Al aprobar, la consulta se almacena en el Historial de Consultas con cumplimiento Ley N° 21.719</p>
        </div>
      )}
      {phase === 'approved' && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 rounded-xl py-3 px-4">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Nota aprobada y guardada en historial</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Action Bar ===================== */
function ActionBar({ phase, saveStatus, onReview, onExport, onSaveDraft }: {
  phase: AppPhase; saveStatus: 'idle' | 'saving' | 'saved' | 'error'; onReview: () => void; onExport: () => void; onSaveDraft: () => void;
}) {
  return (
    <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {phase === 'approved' ? (<><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="font-medium text-green-700">Nota clínica aprobada y almacenada</span></>) : (<><AlertTriangle className="w-5 h-5 text-amber-500" /><span className="font-medium text-amber-700">Revisión médica pendiente</span><span className="text-slate-400 hidden sm:inline">— La nota no puede exportarse sin aprobación</span></>)}
      </div>
      <div className="flex items-center gap-2.5 flex-wrap justify-center">
        {phase !== 'approved' && <button onClick={onSaveDraft} disabled={saveStatus === 'saving'} className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all font-medium flex items-center gap-1.5 disabled:opacity-50">{saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar borrador</button>}
        {phase !== 'approved' && <button onClick={onReview} className="text-sm px-5 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-all font-semibold flex items-center gap-1.5 shadow-md shadow-teal-600/20"><ClipboardCheck className="w-4 h-4" />Revisión y Aprobación del Médico</button>}
        {phase === 'approved' && <button onClick={onExport} className="text-sm px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20"><Download className="w-4 h-4" />Exportar nota clínica</button>}
      </div>
      {saveStatus === 'saved' && <div className="text-xs text-green-600 flex items-center gap-1 animate-fade-in"><CheckCircle2 className="w-3.5 h-3.5" /> Guardado correctamente</div>}
      {saveStatus === 'error' && <div className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Error al guardar. Intente nuevamente.</div>}
    </div>
  );
}

/* ===================== Historial Tab ===================== */
function HistorialTab({ consultations, onView, onLoad }: { consultations: Consultation[]; onView: (c: Consultation) => void; onLoad: (c: Consultation) => void }) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'draft'>('all');

  const filtered = consultations.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-800">Historial de Consultas</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{filtered.length} registros</span>
          </div>
          <div className="flex items-center gap-1.5">
            {(['all', 'approved', 'draft'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filter === f ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {f === 'all' ? 'Todas' : f === 'approved' ? 'Aprobadas' : 'Borradores'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Consultation cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No hay consultas guardadas en el historial.</p>
          <p className="text-xs text-slate-400 mt-1">Las consultas aprobadas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-teal-300 transition-all">
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center"><User className="w-5 h-5 text-teal-600" /></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.patient_name || 'Sin identificar'}</p>
                    <p className="text-[11px] text-slate-400">{c.patient_rut || 'RUT no registrado'} · {c.patient_age ? `${c.patient_age} años` : 'Edad N/A'}</p>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              {/* Card body */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><Stethoscope className="w-3.5 h-3.5 text-slate-400" /> Médico: {c.doctor_name || 'No especificado'}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(c.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500"><Activity className="w-3.5 h-3.5 text-slate-400" /> {c.specialty || 'Medicina Familiar'}</div>
              </div>

              {/* Keywords preview */}
              {c.keywords && (c.keywords.symptoms.length > 0 || c.keywords.diagnoses.length > 0) && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {[...c.keywords.symptoms.slice(0, 3), ...c.keywords.diagnoses.slice(0, 2)].map((kw, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{kw}</span>
                  ))}
                  {(c.keywords.symptoms.length + c.keywords.diagnoses.length > 5) && <span className="text-[10px] text-slate-400">+{c.keywords.symptoms.length + c.keywords.diagnoses.length - 5} más</span>}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => onView(c)} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg py-2 font-medium transition-all">
                  <Eye className="w-3.5 h-3.5" /> Ver detalle
                </button>
                <button onClick={() => onLoad(c)} className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg py-2 font-medium transition-all">
                  <FileText className="w-3.5 h-3.5" /> Cargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { approved: 'bg-green-100 text-green-700', draft: 'bg-amber-100 text-amber-700', recording: 'bg-red-100 text-red-700', transcribing: 'bg-blue-100 text-blue-700', exported: 'bg-teal-100 text-teal-700' };
  const labels: Record<string, string> = { approved: 'Aprobada', draft: 'Borrador', recording: 'Grabando', transcribing: 'Transcribiendo', exported: 'Exportada' };
  return <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{labels[status] || status}</span>;
}

/* ===================== Consultation Detail Modal ===================== */
function ConsultationDetailModal({ consultation, onClose, onLoad }: { consultation: Consultation; onClose: () => void; onLoad: () => void }) {
  const kw = consultation.keywords || emptyKeywords;
  const soapSections = [
    { key: 'soap_subjective', label: 'S — Subjetivo', color: 'amber' },
    { key: 'soap_objective', label: 'O — Objetivo', color: 'teal' },
    { key: 'soap_assessment', label: 'A — Evaluación', color: 'red' },
    { key: 'soap_plan', label: 'P — Plan', color: 'blue' },
  ] as const;

  const sectionColors: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50/50 text-amber-700',
    teal: 'border-teal-200 bg-teal-50/50 text-teal-700',
    red: 'border-red-200 bg-red-50/50 text-red-700',
    blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
  };

  const transcriptSegments = consultation.transcript ? consultation.transcript.split('\n\n').map((line, i) => {
    const match = line.match(/^(Médico|Paciente):\s*(.*)$/);
    return { id: i, speaker: match?.[1] || '', text: match?.[2] || line };
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Detalle de Consulta</h3>
              <p className="text-xs text-slate-500">{new Date(consultation.created_at).toLocaleString('es-CL')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Patient & Doctor info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Datos del Paciente</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-slate-400">Nombre:</span> <span className="font-medium text-slate-700">{consultation.patient_name || 'Sin identificar'}</span></div>
                <div><span className="text-slate-400">RUT:</span> <span className="font-medium text-slate-700">{consultation.patient_rut || 'N/A'}</span></div>
                <div><span className="text-slate-400">Edad:</span> <span className="font-medium text-slate-700">{consultation.patient_age || 'N/A'}</span></div>
                <div><span className="text-slate-400">Género:</span> <span className="font-medium text-slate-700">{consultation.patient_gender === 'F' ? 'Femenino' : consultation.patient_gender === 'M' ? 'Masculino' : 'Otro'}</span></div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Datos del Médico</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-slate-400">Médico:</span> <span className="font-medium text-slate-700">{consultation.doctor_name || 'No especificado'}</span></div>
                <div><span className="text-slate-400">Especialidad:</span> <span className="font-medium text-slate-700">{consultation.specialty || 'Medicina Familiar'}</span></div>
                <div><span className="text-slate-400">Estado:</span> <StatusBadge status={consultation.status} /></div>
                {consultation.approved_at && <div><span className="text-slate-400">Aprobada:</span> <span className="font-medium text-slate-700">{new Date(consultation.approved_at).toLocaleString('es-CL')}</span></div>}
              </div>
            </div>
          </div>

          {/* Transcript */}
          {consultation.transcript && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal-600" /> Transcripción Completa</h4>
              <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
                {transcriptSegments.map((seg) => (
                  <div key={seg.id} className="text-sm">
                    <span className={`text-xs font-semibold ${seg.speaker === 'Médico' ? 'text-teal-700' : 'text-amber-700'}`}>{seg.speaker}:</span>{' '}
                    <span className="text-slate-700">{seg.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-teal-600" /> Palabras Clave ({kw.symptoms.length + kw.diagnoses.length + kw.drugs.length + kw.agreements.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                { label: 'Síntomas', items: kw.symptoms, color: 'orange' },
                { label: 'Diagnósticos', items: kw.diagnoses, color: 'red' },
                { label: 'Fármacos', items: kw.drugs, color: 'teal' },
                { label: 'Acuerdos', items: kw.agreements, color: 'blue' },
              ]).map((group) => {
                const colors: Record<string, string> = { orange: 'border-orange-200 bg-orange-50', red: 'border-red-200 bg-red-50', teal: 'border-teal-200 bg-teal-50', blue: 'border-blue-200 bg-blue-50' };
                return (
                  <div key={group.label} className={`rounded-xl border ${colors[group.color]} p-3`}>
                    <p className="text-xs font-semibold text-slate-600 mb-1.5">{group.label} ({group.items.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {group.items.length === 0 ? <span className="text-[11px] text-slate-400 italic">Sin hallazgos</span> : group.items.map((item, i) => <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-white text-slate-600 font-medium border border-slate-200">{item}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SOAP Note */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4 text-teal-600" /> Nota SOAP Estructurada</h4>
            <div className="space-y-2">
              {soapSections.map((section) => {
                const content = consultation[section.key as keyof Consultation] as string;
                return (
                  <div key={section.key} className={`rounded-xl border p-3 ${sectionColors[section.color]}`}>
                    <p className="text-xs font-semibold mb-1">{section.label}</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content || 'Sin contenido registrado.'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all font-medium flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Volver</button>
          <button onClick={onLoad} className="text-sm px-5 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-all font-semibold flex items-center gap-1.5"><FileText className="w-4 h-4" /> Cargar en Consulta Actual</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Review Modal ===================== */
function ReviewModal({ patientInfo, soap, keywords, onApprove, onCancel }: {
  patientInfo: PatientInfo; soap: { subjective: string; objective: string; assessment: string; plan: string }; keywords: { symptoms: string[]; diagnoses: string[]; drugs: string[]; agreements: string[] }; onApprove: () => void; onCancel: () => void;
}) {
  const [checked, setChecked] = useState({ subjective: false, objective: false, assessment: false, plan: false, consent: false });
  const allChecked = Object.values(checked).every(Boolean);
  const sections = [{ key: 'subjective', label: 'Subjetivo (S)' }, { key: 'objective', label: 'Objetivo (O)' }, { key: 'assessment', label: 'Evaluación (A)' }, { key: 'plan', label: 'Plan (P)' }] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center"><ClipboardCheck className="w-5 h-5 text-white" /></div>
            <div><h3 className="text-base font-bold text-slate-800">Revisión y Aprobación del Médico</h3><p className="text-xs text-slate-500">Ley N° 21.719 — Protección de datos sensibles</p></div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Resumen del Paciente</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-400">Nombre:</span> <span className="font-medium text-slate-700">{patientInfo.name || 'Sin identificar'}</span></div>
              <div><span className="text-slate-400">RUT:</span> <span className="font-medium text-slate-700">{patientInfo.rut || 'N/A'}</span></div>
              <div><span className="text-slate-400">Edad:</span> <span className="font-medium text-slate-700">{patientInfo.age || 'N/A'}</span></div>
              <div><span className="text-slate-400">Médico:</span> <span className="font-medium text-slate-700">{patientInfo.doctorName || 'N/A'}</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Confirme que ha revisado cada sección:</h4>
            <div className="space-y-2">
              {sections.map((section) => (
                <label key={section.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked[section.key] ? 'border-teal-300 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={checked[section.key]} onChange={(e) => setChecked({ ...checked, [section.key]: e.target.checked })} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500/30" />
                  <span className="text-sm font-medium text-slate-700 flex-1">{section.label}</span>
                  <span className="text-xs text-slate-400 max-w-[300px] truncate">{soap[section.key]?.slice(0, 60)}...</span>
                </label>
              ))}
            </div>
          </div>
          <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${checked.consent ? 'border-teal-300 bg-teal-50' : 'border-amber-200 bg-amber-50/50 hover:border-amber-300'}`}>
            <input type="checkbox" checked={checked.consent} onChange={(e) => setChecked({ ...checked, consent: e.target.checked })} className="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500/30" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-teal-600" /><span className="text-sm font-semibold text-slate-700">Consentimiento informado del paciente (Ley N° 21.719)</span></div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Confirmo que el paciente ha sido informado sobre el procesamiento de sus datos sensibles de salud y ha otorgado su consentimiento. La nota clínica se almacenará de forma cifrada y solo será accesible por el equipo de salud autorizado.</p>
            </div>
          </label>
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Palabras Clave ({keywords.symptoms.length + keywords.diagnoses.length + keywords.drugs.length + keywords.agreements.length})</h4>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(keywords).map(([cat, items]) => items.map((item, i) => <span key={`${cat}-${i}`} className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">{item}</span>))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onCancel} className="text-sm px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all font-medium">Cancelar</button>
          <button onClick={onApprove} disabled={!allChecked} className={`text-sm px-5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${allChecked ? 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-600/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><CheckCircle2 className="w-4 h-4" />Aprobar y Almacenar Nota</button>
        </div>
      </div>
    </div>
  );
}
