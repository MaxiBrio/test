import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Consultation {
  id: string;
  patient_name: string | null;
  patient_rut: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  specialty: string | null;
  consultation_date: string | null;
  transcript: string | null;
  soap_subjective: string | null;
  soap_objective: string | null;
  soap_assessment: string | null;
  soap_plan: string | null;
  keywords: {
    symptoms: string[];
    diagnoses: string[];
    drugs: string[];
    agreements: string[];
  } | null;
  status: string;
  doctor_name: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  consultation_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ConsultationInsert {
  patient_name?: string;
  patient_rut?: string;
  patient_age?: number;
  patient_gender?: string;
  specialty?: string;
  consultation_date?: string;
  transcript?: string;
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: string;
  soap_plan?: string;
  keywords?: Record<string, string[]>;
  status?: string;
  doctor_name?: string;
  approved_at?: string;
  approved_by?: string;
}

export type { ConsultationInsert as ConsultationUpdate };
