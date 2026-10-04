export type Locale = "en" | "fr" | "ar";
export type Theme = "light" | "dark";
export type UrgencyLevel = "emergency" | "urgent" | "consult" | "self_care";
export type RecordType = "blood_test" | "report" | "prescription" | "imaging" | "vaccination" | "other";
export type AppointmentStatus = "planned" | "confirmed" | "cancelled" | "done";
export type ConditionStatus = "active" | "resolved" | "chronic";
export type AllergySeverity = "mild" | "moderate" | "severe";

export interface User {
  id: string; first_name: string; last_name: string; date_of_birth: string; sex: "M" | "F" | "Other";
  blood_type: string; phone: string; email: string; emergency_contact: string; locale: Locale; created_at: string;
}
export interface Symptom {
  id: string; name: string; description: string; severity: number; duration: string; start_date: string; created_at: string;
  source: "manual" | "check";
}
export interface Condition {
  id: string; condition: string; description: string; diagnosis_date: string; status: ConditionStatus; created_at: string;
}
export interface Medication {
  id: string; name: string; dosage: string; frequency: string; start_date: string; end_date: string;
  instructions: string; active: boolean;
}
export interface Allergy {
  id: string; allergen: string; reaction: string; severity: AllergySeverity; created_at: string;
}
export interface Appointment {
  id: string; doctor_name: string; specialty: string; date: string; time: string; location: string;
  notes: string; status: AppointmentStatus;
}
export interface HealthRecord {
  id: string; record_type: RecordType; title: string; description: string; date: string;
  file_name: string; file_data: string;
}
export interface SymptomExtraction {
  symptoms: string[]; category: "headache" | "respiratory" | "digestive" | "skin" | "sleep" | "general";
  duration: string; severity: number | null; age: number | null; sex: string | null;
  relevant_history: string[]; medications: string[]; allergies: string[];
}
export interface GuidanceResult {
  possible_explanations: string[]; warning_signs: string[]; next_step: UrgencyLevel;
  next_step_reason: string; follow_up_questions: string[];
}
export interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; created_at: string; guidance?: GuidanceResult;
}
export interface SymptomCheck {
  id: string; symptoms_json: SymptomExtraction; conversation_json: ChatMessage[];
  result_json: GuidanceResult; urgency_level: UrgencyLevel; created_at: string;
}
export interface Database {
  users: User[]; symptoms: Symptom[]; conditions: Condition[]; medications: Medication[];
  allergies: Allergy[]; appointments: Appointment[]; health_records: HealthRecord[]; symptom_checks: SymptomCheck[];
}
export interface AppSettings {
  locale: Locale; theme: Theme; country: string; emergencyContact: string;
  notificationsEnabled: boolean; disclaimerAccepted: boolean;
}
export interface AppSnapshot { id: "pocket-doc"; initialized: boolean; data: Database; settings: AppSettings; }
export type DatabaseTable = keyof Database;

export const defaultSettings: AppSettings = {
  locale: "en", theme: "light", country: "", emergencyContact: "", notificationsEnabled: false, disclaimerAccepted: false,
};
export function emptyDatabase(): Database {
  return { users: [], symptoms: [], conditions: [], medications: [], allergies: [], appointments: [], health_records: [], symptom_checks: [] };
}
export function emptySnapshot(): AppSnapshot {
  return { id: "pocket-doc", initialized: true, data: emptyDatabase(), settings: { ...defaultSettings } };
}
export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `pd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function dateOffset(days: number): string {
  const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10);
}
export function createSeedSnapshot(): AppSnapshot {
  const now = new Date().toISOString();
  const user: User = {
    id: makeId(), first_name: "Amina", last_name: "Test", date_of_birth: "1994-04-18", sex: "F",
    blood_type: "O+", phone: "", email: "", emergency_contact: "Sam Test · fictional contact", locale: "en", created_at: now,
  };
  const data: Database = {
    users: [user],
    symptoms: [
      { id: makeId(), name: "Mild afternoon headache", description: "A short, resolved headache after a busy day.", severity: 3, duration: "A few hours", start_date: dateOffset(-2), created_at: new Date(Date.now() - 2 * 86400000).toISOString(), source: "manual" },
    ],
    conditions: [
      { id: makeId(), condition: "Seasonal allergies", description: "Fictional demo entry · usually mild in spring.", diagnosis_date: "2023-04-14", status: "active", created_at: new Date(Date.now() - 130 * 86400000).toISOString() },
    ],
    medications: [
      { id: makeId(), name: "Vitamin D3", dosage: "1,000 IU", frequency: "Once daily", start_date: dateOffset(-45), end_date: "", instructions: "Take with breakfast · fictional demo", active: true },
      { id: makeId(), name: "Saline nasal spray", dosage: "1–2 sprays", frequency: "As needed", start_date: dateOffset(-12), end_date: "", instructions: "Fictional demo entry", active: true },
      { id: makeId(), name: "Example cough syrup", dosage: "5 ml", frequency: "Twice daily", start_date: dateOffset(-90), end_date: dateOffset(-82), instructions: "Completed course · fictional demo", active: false },
    ],
    allergies: [
      { id: makeId(), allergen: "Pollen", reaction: "Sneezing and itchy eyes · fictional demo", severity: "mild", created_at: new Date(Date.now() - 70 * 86400000).toISOString() },
    ],
    appointments: [
      { id: makeId(), doctor_name: "Dr. Example", specialty: "Primary care", date: dateOffset(5), time: "10:30", location: "Demo Health Centre", notes: "Fictional appointment for exploring the prototype.", status: "confirmed" },
    ],
    health_records: [
      { id: makeId(), record_type: "blood_test", title: "Example annual panel", description: "Fictional sample record · no real health information.", date: dateOffset(-16), file_name: "", file_data: "" },
    ],
    symptom_checks: [],
  };
  return { id: "pocket-doc", initialized: true, data, settings: { ...defaultSettings, emergencyContact: user.emergency_contact } };
}
