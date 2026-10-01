/*
# Clinical Consultations Schema for Environmental AI Assistant (APS Chile)

## Purpose
Stores medical consultation data for a primary care (APS) AI assistant that records,
transcribes, and structures clinical encounters into SOAP notes. Designed to support
the Law N° 21.719 (Chile) compliance workflow with explicit doctor review/approval
before any data is finalized.

## New Tables

### consultations
- `id` (uuid, PK)
- `patient_name` (text) — patient's full name
- `patient_rut` (text) — Chilean RUT identifier
- `patient_age` (int) — patient age
- `patient_gender` (text) — 'M', 'F', or 'Other'
- `specialty` (text) — medical specialty (e.g. 'Medicina Familiar')
- `consultation_date` (timestamptz) — date/time of consultation
- `transcript` (text) — full clean transcription text
- `soap_subjective` (text) — subjective section of SOAP note
- `soap_objective` (text) — objective section
- `soap_assessment` (text) — assessment section
- `soap_plan` (text) — plan section
- `keywords` (jsonb) — extracted clinical keywords {symptoms, diagnoses, drugs, agreements}
- `status` (text) — 'recording', 'transcribing', 'draft', 'approved', 'exported'
- `doctor_name` (text) — attending physician name
- `approved_at` (timestamptz) — when the doctor approved the note
- `approved_by` (text) — doctor who approved
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### consultation_audit_log
- `id` (uuid, PK)
- `consultation_id` (uuid, FK -> consultations)
- `action` (text) — e.g. 'created', 'transcription_started', 'keywords_extracted', 'approved', 'exported'
- `actor` (text) — who performed the action
- `details` (jsonb) — additional context
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- Single-tenant prototype (no auth screen): policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` since data is intentionally shared for the prototype.
- In production, these would be scoped to authenticated doctors via `auth.uid()`.

## Notes
1. This is a prototype/MVP — no auth is implemented yet.
2. All text fields support Chilean Spanish clinical terminology.
3. The audit log tracks the full lifecycle for Law N° 21.719 compliance traceability.
*/

CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text,
  patient_rut text,
  patient_age int,
  patient_gender text DEFAULT 'O',
  specialty text DEFAULT 'Medicina Familiar',
  consultation_date timestamptz DEFAULT now(),
  transcript text DEFAULT '',
  soap_subjective text DEFAULT '',
  soap_objective text DEFAULT '',
  soap_assessment text DEFAULT '',
  soap_plan text DEFAULT '',
  keywords jsonb DEFAULT '{"symptoms": [], "diagnoses": [], "drugs": [], "agreements": []}'::jsonb,
  status text DEFAULT 'recording',
  doctor_name text DEFAULT '',
  approved_at timestamptz,
  approved_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_consultations" ON consultations;
CREATE POLICY "anon_select_consultations" ON consultations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_consultations" ON consultations;
CREATE POLICY "anon_insert_consultations" ON consultations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_consultations" ON consultations;
CREATE POLICY "anon_update_consultations" ON consultations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_consultations" ON consultations;
CREATE POLICY "anon_delete_consultations" ON consultations FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS consultation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consultation_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit_log" ON consultation_audit_log;
CREATE POLICY "anon_select_audit_log" ON consultation_audit_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit_log" ON consultation_audit_log;
CREATE POLICY "anon_insert_audit_log" ON consultation_audit_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_audit_log" ON consultation_audit_log;
CREATE POLICY "anon_update_audit_log" ON consultation_audit_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit_log" ON consultation_audit_log;
CREATE POLICY "anon_delete_audit_log" ON consultation_audit_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_consultation_id ON consultation_audit_log(consultation_id);