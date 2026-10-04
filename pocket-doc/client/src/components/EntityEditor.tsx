import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { t, TranslationKey } from "@/lib/i18n";
import { Locale } from "@/lib/types";

export type EditorKind = "profile" | "symptom" | "condition" | "allergy" | "medication" | "appointment" | "health_record";
export interface EditorValues { [key: string]: string | number | boolean; }
interface Props { kind: EditorKind; locale: Locale; initial?: Record<string, unknown>; onClose: () => void; onSave: (values: EditorValues) => void; }
type FieldSpec = { name: string; label: TranslationKey; type?: string; required?: boolean; options?: Array<[string, TranslationKey]>; placeholder?: string; };
const sexOptions: FieldSpec["options"] = [["M", "sexM"], ["F", "sexF"], ["Other", "sexOther"]];
const fieldSets: Record<EditorKind, FieldSpec[]> = {
  profile: [
    { name: "first_name", label: "firstName", required: true }, { name: "last_name", label: "lastName", required: true },
    { name: "date_of_birth", label: "birthDate", type: "date" }, { name: "sex", label: "sex", type: "select", options: sexOptions },
    { name: "blood_type", label: "bloodType" }, { name: "phone", label: "phone", type: "tel" },
    { name: "email", label: "email", type: "email" }, { name: "emergency_contact", label: "emergencyContact" },
  ],
  symptom: [
    { name: "name", label: "symptomChecker", required: true }, { name: "description", label: "description", type: "textarea" },
    { name: "severity", label: "severity", type: "number" }, { name: "duration", label: "duration" }, { name: "start_date", label: "startDate", type: "date" },
  ],
  condition: [
    { name: "condition", label: "condition", required: true }, { name: "description", label: "description", type: "textarea" },
    { name: "diagnosis_date", label: "date", type: "date" }, { name: "status", label: "status", type: "select", options: [["active", "activeCondition"], ["resolved", "resolved"], ["chronic", "chronic"]] },
  ],
  allergy: [
    { name: "allergen", label: "allergies", required: true }, { name: "reaction", label: "description", type: "textarea" },
    { name: "severity", label: "severity", type: "select", options: [["mild", "severityLow"], ["moderate", "severityMid"], ["severe", "severityHigh"]] },
  ],
  medication: [
    { name: "name", label: "medicationName", required: true }, { name: "dosage", label: "dosage" }, { name: "frequency", label: "frequency" },
    { name: "start_date", label: "startDate", type: "date" }, { name: "end_date", label: "endDate", type: "date" }, { name: "instructions", label: "instructions", type: "textarea" },
  ],
  appointment: [
    { name: "doctor_name", label: "doctor" }, { name: "specialty", label: "specialty" }, { name: "date", label: "date", type: "date", required: true },
    { name: "time", label: "time", type: "time" }, { name: "location", label: "location" }, { name: "status", label: "appointmentStatus", type: "select", options: [["planned", "planned"], ["confirmed", "confirmed"], ["cancelled", "cancelled"], ["done", "done"]] },
    { name: "notes", label: "notes", type: "textarea" },
  ],
  health_record: [
    { name: "title", label: "title", required: true }, { name: "record_type", label: "recordType", type: "select", options: [["blood_test", "blood_test"], ["report", "report"], ["prescription", "prescription"], ["imaging", "imaging"], ["vaccination", "vaccination"], ["other", "other"]] },
    { name: "date", label: "date", type: "date" }, { name: "description", label: "description", type: "textarea" },
  ],
};
const titles: Record<EditorKind, TranslationKey> = { profile: "profile", symptom: "addSymptom", condition: "addCondition", allergy: "addAllergy", medication: "addMedication", appointment: "addAppointment", health_record: "addRecord" };
const defaults: Partial<Record<EditorKind, EditorValues>> = {
  profile: { sex: "Other" }, symptom: { severity: 3, start_date: new Date().toISOString().slice(0, 10) },
  condition: { status: "active" }, allergy: { severity: "mild" }, medication: { active: true, start_date: new Date().toISOString().slice(0, 10) },
  appointment: { status: "planned" }, health_record: { record_type: "report", date: new Date().toISOString().slice(0, 10) },
};

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const locale: Locale = document.documentElement.lang === "ar" ? "ar" : document.documentElement.lang === "fr" ? "fr" : "en";
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`modal-panel ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-header"><div><span className="eyebrow">{t(locale,"appName")}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label={t(locale,"close")}><X size={18} /></button></div>
      {children}
    </section>
  </div>;
}

export default function EntityEditor({ kind, locale, initial, onClose, onSave }: Props) {
  const [values, setValues] = useState<EditorValues>(() => ({ ...defaults[kind], ...(initial as EditorValues | undefined) }));
  const [fileError, setFileError] = useState("");
  const fields = fieldSets[kind];
  const set = (name: string, value: string | boolean | number) => setValues(current => ({ ...current, [name]: value }));
  const title = t(locale, initial?.id ? "edit" : titles[kind]);
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setFileError(locale === "fr" ? "Le fichier doit faire moins de 10 Mo." : locale === "ar" ? "يجب أن يكون حجم الملف أقل من 10 ميغابايت." : "Choose a file smaller than 10 MB."); return; }
    const reader = new FileReader(); reader.onload = () => { set("file_name", file.name); set("file_data", String(reader.result ?? "")); setFileError(""); }; reader.onerror = () => setFileError(t(locale,"fileReadError")); reader.readAsDataURL(file);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    for (const field of fields) if (field.required && !String(values[field.name] ?? "").trim()) {
      const input = document.getElementById(`editor-${field.name}`) as HTMLInputElement | null; input?.focus(); return;
    }
    if (values.start_date && values.end_date && String(values.end_date) < String(values.start_date)) {
      setFileError(t(locale, "invalidDate")); return;
    }
    onSave(values);
  }
  const doubleField = (field: FieldSpec) => field.type === "textarea";
  return <Modal title={title} onClose={onClose} wide={kind === "profile" || kind === "health_record"}>
    <form className="entity-form" onSubmit={submit}>
      <div className="form-grid">
        {fields.map(field => <label className={`form-field ${doubleField(field) ? "form-span" : ""}`} key={field.name}>
          <span>{t(locale, field.label)}{field.required && <i> ·</i>}</span>
          {field.type === "textarea" ? <textarea id={`editor-${field.name}`} rows={3} value={String(values[field.name] ?? "")} onChange={event => set(field.name, event.target.value)} />
            : field.type === "select" ? <select id={`editor-${field.name}`} value={String(values[field.name] ?? field.options?.[0]?.[0] ?? "")} onChange={event => set(field.name, event.target.value)}>{field.options?.map(([value, key]) => <option value={value} key={value}>{t(locale, key)}</option>)}</select>
              : <input id={`editor-${field.name}`} type={field.type ?? "text"} min={field.type === "number" ? 1 : undefined} max={field.type === "number" ? 10 : undefined} value={String(values[field.name] ?? "")} onChange={event => set(field.name, field.type === "number" ? Number(event.target.value) : event.target.value)} required={field.required} />}
        </label>)}
        {kind === "medication" && <label className="form-toggle form-span"><input type="checkbox" checked={Boolean(values.active ?? true)} onChange={event => set("active", event.target.checked)} /><span><strong>{t(locale, "toggleActive")}</strong><small>{t(locale, "activeMedications")}</small></span></label>}
        {kind === "health_record" && <div className="file-field form-span"><label className="file-pick"><input type="file" onChange={handleFile} /><span className="file-pick-icon"><Upload size={17} /></span><span><strong>{t(locale, "attachFile")}</strong><small>{values.file_name ? `${t(locale, "attached")}: ${String(values.file_name)}` : t(locale, "uploadLocalOnly")}</small></span></label></div>}
      </div>
      {fileError && <p className="form-error">{fileError}</p>}
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>{t(locale, "cancel")}</button><button type="submit" className="button button-primary">{t(locale, "save")}</button></div>
    </form>
  </Modal>;
}
