import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUp, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, CloudOff, FileHeart, FileText, Heart, HeartPulse, House, Languages, ListFilter, LockKeyhole,
  Menu, Moon, MoreHorizontal, Plus, Search, Settings2, ShieldAlert, Siren, SlidersHorizontal, Sparkles,
  Stethoscope, Sun, Trash2, UserRound, X, ClipboardList, Pill, CircleHelp, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import EntityEditor, { EditorKind, EditorValues, Modal } from "@/components/EntityEditor";
import SymptomChecker from "@/pages/SymptomChecker";
import { usePocketDoc } from "@/contexts/PocketDocContext";
import { countryLabel, getEmergencyDetails } from "@/lib/emergency";
import { t, TranslationKey } from "@/lib/i18n";
import { Allergy, Appointment, AppSettings, Condition, DatabaseTable, HealthRecord, Medication, Symptom, SymptomCheck, User, makeId } from "@/lib/types";

type Section = "home" | "symptomChecker" | "medicalHistory" | "medications" | "appointments" | "healthRecords" | "settings";
type NavItem = { id: Section; key: TranslationKey; icon: LucideIcon };
const navItems: NavItem[] = [
  { id: "home", key: "home", icon: House }, { id: "symptomChecker", key: "symptomChecker", icon: Activity },
  { id: "medicalHistory", key: "medicalHistory", icon: HeartPulse }, { id: "medications", key: "medications", icon: Pill },
  { id: "appointments", key: "appointments", icon: CalendarDays }, { id: "healthRecords", key: "healthRecords", icon: FileText }, { id: "settings", key: "settings", icon: Settings2 },
];
type EditorState = { kind: EditorKind; id?: string } | null;
type DeleteState = { table: DatabaseTable; id: string } | null;

function formatDate(value: string | undefined, locale: "en" | "fr" | "ar", options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, options).format(date);
}
function formatDateTime(value: string, locale: "en" | "fr" | "ar") {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}
function translatedStatus(value: string, locale: "en" | "fr" | "ar"): string {
  const key = value as TranslationKey;
  try { return t(locale, key); } catch { return value; }
}
function nextDoseLabel(medication: Medication): string {
  const match = `${medication.frequency} ${medication.instructions}`.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}

function HomePage({ onNavigate, onEditor, onEmergency }: { onNavigate: (section: Section) => void; onEditor: (kind: EditorKind) => void; onEmergency: () => void }) {
  const { snapshot } = usePocketDoc();
  const { data, settings } = snapshot; const locale = settings.locale;
  const user = data.users[0];
  const upcoming = [...data.appointments].filter(item => item.date >= new Date().toISOString().slice(0, 10) && item.status !== "cancelled").sort((a, b) => a.date.localeCompare(b.date))[0];
  const latestRecord = [...data.health_records].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const latestSymptoms = [...data.symptom_checks].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
  const activeMeds = data.medications.filter(item => item.active);
  const dose = activeMeds.map(nextDoseLabel).find(Boolean);
  const greeting = user ? t(locale, "greeting", { name: user.first_name }) : t(locale, "greetingEmpty");
  return <div className="page-stack home-page">
    <section className="welcome-row"><div><span className="eyebrow date-eyebrow">{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><h1>{greeting}</h1><p>{t(locale, "todayPrompt")}</p></div><div className="welcome-stamp"><HeartPulse size={19} /><span>{t(locale, "localOnly")}</span></div></section>
    <div className="hero-grid">
      <section className="hero-card"><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/><div className="hero-content"><div className="hero-label"><span className="hero-spark"><Sparkles size={15} /></span>{t(locale, "startHere")}</div><h2>{t(locale, "todayPrompt")}</h2><p>{t(locale, "dashboardIntro")}</p><button className="button hero-button" onClick={() => onNavigate("symptomChecker")}><span className="hero-button-icon"><Activity size={17} /></span>{t(locale, "startCheck")}<ArrowRight size={16} /></button><small><LockKeyhole size={13} />{t(locale, "explore")}</small></div><div className="hero-art" aria-hidden="true"><div className="heart-ring ring-large"/><div className="heart-ring ring-small"/><div className="heart-core"><HeartPulse size={42} strokeWidth={1.45} /></div><div className="art-dot dot-a"/><div className="art-dot dot-b"/><div className="art-dot dot-c"/></div></section>
      <section className="side-prompt"><div className="side-prompt-top"><span className="side-icon"><ShieldAlert size={18} /></span><span className="eyebrow">{t(locale, "emergencyInfo")}</span></div><h3>{t(locale, "emergency")}</h3><p>{t(locale, "nearestER")}</p><button className="button button-emergency" onClick={onEmergency}><Siren size={17} />{t(locale, "emergency")}<ArrowRight size={15} /></button></section>
    </div>
    <div className="section-title-row"><div><span className="eyebrow">{t(locale, "helpfulShortcuts")}</span><h2>{t(locale, "home")}</h2></div><span className="fictional-badge"><span />{t(locale, "demo")}</span></div>
    <div className="summary-grid">
      <SummaryCard icon={Activity} tone="coral" title={t(locale, "recentSymptoms")} onClick={() => onNavigate("medicalHistory")}><div className="summary-content">{latestSymptoms.length ? latestSymptoms.map(check => <div className="summary-line" key={check.id}><span className="summary-bullet"/><span>{check.symptoms_json.symptoms[0] ?? t(locale, "symptomCheck")}</span><time>{formatDate(check.created_at, locale, { day: "numeric", month: "short" })}</time></div>) : <p className="empty-copy">{data.symptoms.length ? data.symptoms.slice(-3).reverse().map(item => item.name).join(" · ") : t(locale, "noRecentSymptoms")}</p>}</div><span className="card-arrow"><ArrowDownRight size={16}/></span></SummaryCard>
      <SummaryCard icon={Pill} tone="sage" title={t(locale, "activeMedications")} value={String(activeMeds.length)} meta={dose ? `${t(locale, "nextDose")} · ${dose}` : activeMeds.length ? t(locale, "noDose") : t(locale, "noMedication")} onClick={() => onNavigate("medications")} />
      <SummaryCard icon={CalendarDays} tone="blue" title={t(locale, "nextAppointment")} value={upcoming ? formatDate(upcoming.date, locale, { weekday: "short", day: "numeric", month: "short" }) : undefined} meta={upcoming ? `${upcoming.time || ""} ${upcoming.specialty ? `· ${upcoming.specialty}` : ""}` : t(locale, "noAppointment")} onClick={() => onNavigate("appointments")} />
      <SummaryCard icon={FileHeart} tone="lavender" title={t(locale, "recentRecord")} value={latestRecord?.title} meta={latestRecord ? `${t(locale, latestRecord.record_type)} · ${formatDate(latestRecord.date, locale)}` : t(locale, "noRecords")} onClick={() => onNavigate("healthRecords")} />
    </div>
    <section className="quick-actions"><div><span className="eyebrow">{t(locale, "explore")}</span><h3>{t(locale, "timeline")}</h3></div><div className="quick-action-buttons"><button onClick={() => onEditor("medication")}><Plus size={15}/>{t(locale, "addMedication")}</button><button onClick={() => onEditor("appointment")}><Plus size={15}/>{t(locale, "addAppointment")}</button><button onClick={() => onEditor("health_record")}><Plus size={15}/>{t(locale, "addRecord")}</button></div></section>
  </div>;
}
function SummaryCard({ icon: Icon, tone, title, value, meta, onClick, children }: { icon: LucideIcon; tone: string; title: string; value?: string; meta?: string; onClick: () => void; children?: React.ReactNode }) {
  return <button className="summary-card" onClick={onClick}><div className="summary-card-head"><span className={`summary-icon ${tone}`}><Icon size={18}/></span><span className="summary-label">{title}</span><span className="card-arrow"><ArrowDownRight size={16}/></span></div>{children ?? <><div className={`summary-value ${!value ? "summary-empty" : ""}`}>{value ?? title}</div><p className="summary-meta">{meta}</p></>}</button>;
}

function MedicationPage({ onEditor, onDelete }: { onEditor: (kind: EditorKind, id?: string) => void; onDelete: (table: DatabaseTable, id: string) => void }) {
  const { snapshot, upsert } = usePocketDoc(); const { data, settings } = snapshot; const locale = settings.locale;
  const rows = [...data.medications].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  async function toggle(item: Medication) { await upsert("medications", { ...item, active: !item.active }); toast.success(t(locale, "saved")); }
  return <div className="page-stack"><PageHeading kicker={t(locale, "medications")} title={t(locale, "medicationList")} detail={t(locale, "medicationHint")} action={<button className="button button-primary" onClick={() => onEditor("medication")}><Plus size={17}/>{t(locale, "addMedication")}</button>} />
    {rows.length === 0 ? <EmptyState icon={Pill} text={t(locale, "noMeds")} action={t(locale, "addMedication")} onClick={() => onEditor("medication")} /> : <div className="medication-grid">{rows.map(item => <article className={`med-card ${item.active ? "" : "med-card-inactive"}`} key={item.id}>
      <div className="med-card-top"><span className={`medication-icon ${item.active ? "sage" : "neutral"}`}><Pill size={18}/></span><span className={`status-pill ${item.active ? "status-active" : "status-muted"}`}><i />{t(locale, item.active ? "active" : "inactive")}</span><button className="icon-button small-icon" aria-label={t(locale,"edit")} onClick={() => onEditor("medication", item.id)}><MoreHorizontal size={18}/></button></div>
      <h3>{item.name}</h3><p className="med-dose">{item.dosage || t(locale,"unknown")} <span>·</span> {item.frequency || t(locale,"unknown")}</p>
      <div className="med-detail"><Clock3 size={15}/><span>{item.instructions || t(locale,"medicationHint")}</span></div>
      <div className="med-foot"><span>{item.start_date ? `${t(locale,"startDate")} · ${formatDate(item.start_date, locale)}` : t(locale,"startDate")}</span><div><button className="text-button" onClick={() => void toggle(item)}>{t(locale, item.active ? "inactive" : "active")}</button><button className="delete-icon" aria-label={t(locale,"delete")} onClick={() => onDelete("medications",item.id)}><Trash2 size={15}/></button></div></div>
    </article>)}</div>}
  </div>;
}

function AppointmentsPage({ onEditor, onDelete }: { onEditor: (kind: EditorKind, id?: string) => void; onDelete: (table: DatabaseTable, id: string) => void }) {
  const { snapshot } = usePocketDoc(); const { data, settings } = snapshot; const locale = settings.locale;
  const [mode, setMode] = useState<"list" | "calendar">("list"); const [month, setMonth] = useState(() => new Date());
  const all = [...data.appointments].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = all.filter(item => item.date >= today && item.status !== "cancelled"); const past = all.filter(item => item.date < today || item.status === "cancelled");
  const monthDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const calendarCells: Array<number | null> = [...Array.from({ length: offset }, () => null), ...Array.from({ length: monthDays }, (_, index) => index + 1)];
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + i)));
  const appointmentFor = (day: number) => all.filter(item => item.date === `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  return <div className="page-stack"><PageHeading kicker={t(locale, "appointments")} title={t(locale, "appointmentList")} detail={t(locale, "dashboardIntro")} action={<div className="heading-actions"><div className="segmented-control"><button className={mode === "list" ? "selected" : ""} onClick={() => setMode("list")}><ClipboardList size={15}/>{t(locale,"listView")}</button><button className={mode === "calendar" ? "selected" : ""} onClick={() => setMode("calendar")}><CalendarDays size={15}/>{t(locale,"calendarView")}</button></div><button className="button button-primary" onClick={() => onEditor("appointment")}><Plus size={17}/>{t(locale,"addAppointment")}</button></div>} />
    {mode === "calendar" ? <section className="calendar-card"><div className="calendar-head"><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label={t(locale,"past")}><ChevronLeft size={18}/></button><h3>{monthLabel}</h3><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label={t(locale,"upcoming")}><ChevronRight size={18}/></button></div><div className="calendar-grid">{weekdays.map((day, i) => <div className="calendar-weekday" key={i}>{day}</div>)}{calendarCells.map((day, i) => {
      const items = day ? appointmentFor(day) : []; const dateString = day ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
      return <div key={`${day ?? "blank"}-${i}`} className={`calendar-day ${dateString === today ? "is-today" : ""} ${!day ? "calendar-blank" : ""}`}><span>{day ?? ""}</span>{items.map(item => <button key={item.id} className={`calendar-event status-${item.status}`} onClick={() => onEditor("appointment",item.id)} title={`${item.time} ${item.specialty}`}>{item.time || t(locale,"appointments")} · {item.specialty || item.doctor_name}</button>)}</div>;
    })}</div></section> : <div className="appointment-lists">{upcoming.length > 0 && <section><div className="section-title-row compact"><h2>{t(locale,"upcoming")}</h2><span className="count-chip">{upcoming.length}</span></div><div className="appointment-stack">{upcoming.map(item => <AppointmentCard key={item.id} item={item} locale={locale} onEdit={() => onEditor("appointment",item.id)} onDelete={() => onDelete("appointments",item.id)} />)}</div></section>}
      {past.length > 0 && <section><div className="section-title-row compact"><h2>{t(locale,"past")}</h2><span className="count-chip">{past.length}</span></div><div className="appointment-stack">{past.map(item => <AppointmentCard key={item.id} item={item} locale={locale} onEdit={() => onEditor("appointment",item.id)} onDelete={() => onDelete("appointments",item.id)} />)}</div></section>}
      {all.length === 0 && <EmptyState icon={CalendarDays} text={t(locale,"noAppointments")} action={t(locale,"addAppointment")} onClick={() => onEditor("appointment")} />}</div>}
  </div>;
}
function AppointmentCard({ item, locale, onEdit, onDelete }: { item: Appointment; locale: "en" | "fr" | "ar"; onEdit: () => void; onDelete: () => void }) {
  return <article className="appointment-card"><div className="appointment-date-block"><span>{new Intl.DateTimeFormat(locale,{month:"short"}).format(new Date(`${item.date}T12:00:00`))}</span><strong>{new Intl.DateTimeFormat(locale,{day:"numeric"}).format(new Date(`${item.date}T12:00:00`))}</strong><small>{item.time || "—"}</small></div><div className="appointment-info"><div className="appointment-info-head"><h3>{item.specialty || t(locale,"appointments")}</h3><span className={`status-pill status-${item.status}`}>{t(locale,item.status)}</span></div><p>{item.doctor_name || t(locale,"unknown")}{item.location ? ` · ${item.location}` : ""}</p>{item.notes && <small>{item.notes}</small>}</div><div className="item-actions"><button className="icon-button small-icon" onClick={onEdit} aria-label={t(locale,"edit")}><MoreHorizontal size={18}/></button><button className="delete-icon" onClick={onDelete} aria-label={t(locale,"delete")}><Trash2 size={15}/></button></div></article>;
}

function RecordsPage({ onEditor, onDelete }: { onEditor: (kind: EditorKind, id?: string) => void; onDelete: (table: DatabaseTable, id: string) => void }) {
  const { snapshot } = usePocketDoc(); const { data, settings } = snapshot; const locale = settings.locale;
  const [query, setQuery] = useState(""); const [type, setType] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const rows = [...data.health_records].filter(item => (!query || `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())) && (type === "all" || item.record_type === type) && (!from || (item.date && item.date >= from)) && (!to || (item.date && item.date <= to))).sort((a,b) => (b.date || "").localeCompare(a.date || ""));
  const types = ["all", "blood_test", "report", "prescription", "imaging", "vaccination", "other"];
  return <div className="page-stack"><PageHeading kicker={t(locale,"healthRecords")} title={t(locale,"recordList")} detail={t(locale,"localExplanation")} action={<button className="button button-primary" onClick={() => onEditor("health_record")}><Plus size={17}/>{t(locale,"addRecord")}</button>} />
    <div className="record-filters"><label className="search-field"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t(locale,"search")} /></label><label className="select-filter"><ListFilter size={16}/><select aria-label={t(locale,"recordType")} value={type} onChange={event => setType(event.target.value)}>{types.map(value => <option key={value} value={value}>{value === "all" ? t(locale,"all") : t(locale,value as TranslationKey)}</option>)}</select></label><label className="date-filter"><span>{t(locale,"fromDate")}</span><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="date-filter"><span>{t(locale,"toDate")}</span><input type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div>
    {rows.length === 0 ? <EmptyState icon={FileHeart} text={data.health_records.length ? t(locale,"noRecordsFound") : t(locale,"noRecords")} action={t(locale,"addRecord")} onClick={() => onEditor("health_record")} /> : <div className="records-grid">{rows.map(item => <article key={item.id} className="record-card"><div className="record-card-top"><span className="record-type-icon"><FileHeart size={19}/></span><span className="type-pill">{t(locale,item.record_type)}</span><button className="icon-button small-icon" onClick={() => onEditor("health_record",item.id)} aria-label={t(locale,"edit")}><MoreHorizontal size={18}/></button></div><h3>{item.title}</h3><p>{item.description || t(locale,"nothingYet")}</p><div className="record-card-foot"><span><CalendarDays size={14}/>{formatDate(item.date,locale)}</span><div className="record-actions">{item.file_data && <a className="text-button" href={item.file_data} download={item.file_name || "health-record"}>{t(locale,"openFile")}</a>}<button className="delete-icon" onClick={() => onDelete("health_records",item.id)} aria-label={t(locale,"delete")}><Trash2 size={15}/></button></div></div></article>)}</div>}
  </div>;
}

type HistoryKind = "symptom" | "medication" | "allergy" | "condition";
interface HistoryEntry { id: string; kind: HistoryKind; title: string; detail: string; date: string; status?: string; editor?: EditorKind; removable?: boolean; check?: SymptomCheck; }
function HistoryPage({ onEditor, onDelete, onNavigate }: { onEditor: (kind: EditorKind, id?: string) => void; onDelete: (table: DatabaseTable, id: string) => void; onNavigate: (section: Section) => void }) {
  const { snapshot } = usePocketDoc(); const { data, settings } = snapshot; const locale = settings.locale;
  const [filter, setFilter] = useState<"all" | HistoryKind>("all"); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<SymptomCheck | null>(null);
  const entries: HistoryEntry[] = [
    ...data.symptom_checks.map(item => ({ id: item.id, kind: "symptom" as const, title: item.symptoms_json.symptoms[0] || t(locale,"symptomCheck"), detail: t(locale,"viewTranscript"), date: item.created_at, status: item.urgency_level, check: item })),
    ...data.symptoms.filter(item => item.source === "manual").map(item => ({ id: item.id, kind: "symptom" as const, title: item.name, detail: `${item.duration || ""}${item.severity ? ` · ${t(locale,"severity")} ${item.severity}/10` : ""}`, date: item.created_at, editor: "symptom" as const, removable: true })),
    ...data.medications.map(item => ({ id: item.id, kind: "medication" as const, title: item.name, detail: `${item.dosage || ""}${item.frequency ? ` · ${item.frequency}` : ""}`, date: item.start_date || "", status: item.active ? "active" : "inactive" })),
    ...data.allergies.map(item => ({ id: item.id, kind: "allergy" as const, title: item.allergen, detail: item.reaction, date: item.created_at, status: item.severity, editor: "allergy" as const, removable: true })),
    ...data.conditions.map(item => ({ id: item.id, kind: "condition" as const, title: item.condition, detail: item.description, date: item.diagnosis_date || item.created_at, status: item.status, editor: "condition" as const, removable: true })),
  ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const shown = entries.filter(entry => (filter === "all" || entry.kind === filter) && (!query || `${entry.title} ${entry.detail}`.toLowerCase().includes(query.toLowerCase())));
  const filterItems: Array<["all" | HistoryKind, TranslationKey]> = [["all","all"],["symptom","filterSymptoms"],["medication","filterMedications"],["allergy","filterAllergies"],["condition","filterConditions"]];
  const iconByKind: Record<HistoryKind, LucideIcon> = { symptom: Activity, medication: Pill, allergy: ShieldAlert, condition: HeartPulse };
  const titleByKind: Record<HistoryKind, TranslationKey> = { symptom: "filterSymptoms", medication: "filterMedications", allergy: "filterAllergies", condition: "filterConditions" };
  return <div className="page-stack"><PageHeading kicker={t(locale,"medicalHistory")} title={t(locale,"timeline")} detail={t(locale,"dashboardIntro")} action={<div className="heading-actions"><button className="button button-soft" onClick={() => onEditor("condition")}><Plus size={16}/>{t(locale,"addCondition")}</button><button className="button button-primary" onClick={() => onEditor("allergy")}><Plus size={16}/>{t(locale,"addAllergy")}</button></div>} />
    <div className="history-controls"><label className="search-field"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t(locale,"search")} /></label><div className="filter-pills">{filterItems.map(([key,label]) => <button key={key} className={filter === key ? "filter-active" : ""} onClick={() => setFilter(key)}>{t(locale,label)}</button>)}</div><button className="button button-quiet add-symptom" onClick={() => onEditor("symptom")}><Plus size={16}/>{t(locale,"addSymptom")}</button></div>
    {shown.length === 0 ? <EmptyState icon={HeartPulse} text={t(locale,"noTimeline")} action={t(locale,"addCondition")} onClick={() => onEditor("condition")} /> : <div className="timeline-list"><div className="timeline-rail"/>{shown.map((entry,index) => { const Icon=iconByKind[entry.kind]; return <article key={`${entry.kind}-${entry.id}`} className="timeline-item"><div className={`timeline-icon ti-${entry.kind}`}><Icon size={16}/></div><div className="timeline-entry"><div className="timeline-entry-main"><div className="timeline-entry-title"><span className="eyebrow">{t(locale,titleByKind[entry.kind])}</span><h3>{entry.title}</h3><p>{entry.detail}</p></div>{entry.status && <span className={`status-pill status-${entry.status}`}>{t(locale,entry.status as TranslationKey)}</span>}</div><div className="timeline-meta"><time>{formatDateTime(entry.date,locale)}</time><div className="item-actions">{entry.check && <button className="text-button" onClick={() => setSelected(entry.check!)}>{t(locale,"viewTranscript")}<ArrowRight size={14}/></button>}{entry.editor && <button className="icon-button small-icon" aria-label={t(locale,"edit")} onClick={() => onEditor(entry.editor!,entry.id)}><MoreHorizontal size={18}/></button>}{entry.removable && <button className="delete-icon" aria-label={t(locale,"delete")} onClick={() => onDelete(entry.kind === "symptom" ? "symptoms" : entry.kind === "condition" ? "conditions" : "allergies",entry.id)}><Trash2 size={15}/></button>}{entry.kind === "medication" && <button className="text-button" onClick={() => onNavigate("medications")}>{t(locale,"viewAll")}</button>}</div></div></div></article>; })}</div>}
    {selected && <Modal title={t(locale,"transcript")} onClose={() => setSelected(null)} wide><div className="transcript-panel">{selected.conversation_json.map(message => <div key={message.id} className={`transcript-message ${message.role}`}><span className="eyebrow">{message.role === "user" ? t(locale,"profile") : t(locale,"appName")}</span><p>{message.content}</p>{message.guidance && <div className="transcript-guidance"><h4>{t(locale,"possibleExplanations")}</h4><ul>{message.guidance.possible_explanations.map((line,i)=><li key={i}>{line}</li>)}</ul><h4>{t(locale,"warningSigns")}</h4><ul>{message.guidance.warning_signs.map((line,i)=><li key={i}>{line}</li>)}</ul><h4>{t(locale,"recommendedNext")}</h4><p>{t(locale,message.guidance.next_step)} · {message.guidance.next_step_reason}</p></div>}<time>{formatDateTime(message.created_at,locale)}</time></div>)}</div></Modal>}
  </div>;
}

function PageHeading({ kicker, title, detail, action }: { kicker: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <header className="page-heading"><div><span className="eyebrow heading-kicker">{kicker}</span><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action && <div className="page-heading-action">{action}</div>}</header>;
}
function EmptyState({ icon: Icon, text, action, onClick }: { icon: LucideIcon; text: string; action: string; onClick: () => void }) {
  return <section className="empty-state"><span className="empty-icon"><Icon size={22}/></span><p>{text}</p><button className="button button-soft" onClick={onClick}><Plus size={16}/>{action}</button></section>;
}

function SettingsPage({ onEditor, onDeleteAll }: { onEditor: (kind: EditorKind, id?: string) => void; onDeleteAll: () => void }) {
  const { snapshot, updateSettings, exportData } = usePocketDoc(); const { data, settings } = snapshot; const locale = settings.locale;
  const user = data.users[0];
  async function exportLocalData() {
    const blob = new Blob([exportData()], { type: "application/json" }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `pocket-doc-export-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url); toast.success(t(locale,"dataExported"));
  }
  async function toggleNotifications() {
    if (settings.notificationsEnabled) { await updateSettings({ notificationsEnabled: false }); return; }
    if (!("Notification" in window)) { toast.error(t(locale,"notificationsUnavailable")); return; }
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") { toast.error(t(locale,"notificationsUnavailable")); return; }
    await updateSettings({ notificationsEnabled: true });
  }
  const countries: Array<[string, TranslationKey]> = [["US","countryUS"],["CA","countryCA"],["FR","countryFR"],["GB","countryGB"],["AU","countryAU"],["MA","countryMA"],["IE","countryIE"],["ES","countryES"],["other","countryOther"]];
  const emergency = getEmergencyDetails(settings.country, locale);
  return <div className="page-stack"><PageHeading kicker={t(locale,"settings")} title={t(locale,"settings")} detail={t(locale,"localOnly")} />
    <div className="settings-layout"><div className="settings-main">
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon sage"><UserRound size={18}/></span><div><h2>{t(locale,"profile")}</h2><p>{t(locale,"firstName")} · {t(locale,"birthDate")} · {t(locale,"bloodType")}</p></div><button className="button button-quiet" onClick={() => onEditor("profile",user?.id)}>{t(locale,"editProfile")}<ArrowRight size={15}/></button></div>
        {user ? <div className="profile-summary"><div className="profile-avatar">{user.first_name.slice(0,1)}{user.last_name.slice(0,1)}</div><div><strong>{user.first_name} {user.last_name}</strong><span>{user.date_of_birth ? formatDate(user.date_of_birth,locale,{day:"numeric",month:"long",year:"numeric"}) : t(locale,"birthDate")}{user.blood_type ? ` · ${user.blood_type}` : ""}</span></div><span className="fictional-badge"><span />{t(locale,"demo")}</span></div> : <div className="profile-summary profile-empty"><div className="profile-avatar"><UserRound size={18}/></div><div><strong>{t(locale,"nothingYet")}</strong><span>{t(locale,"emptyFirst")}</span></div><button className="text-button" onClick={() => onEditor("profile")}>{t(locale,"add")}</button></div>}
      </section>
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon lavender"><SlidersHorizontal size={18}/></span><div><h2>{t(locale,"preferences")}</h2><p>{t(locale,"language")} · {t(locale,"darkMode")}</p></div></div>
        <div className="setting-row"><div className="setting-row-icon"><Languages size={17}/></div><div className="setting-row-copy"><strong>{t(locale,"language")}</strong><span>English · Français · العربية</span></div><select className="setting-select" value={settings.locale} onChange={event => void updateSettings({ locale: event.target.value as AppSettings["locale"] })} aria-label={t(locale,"language")}><option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option></select></div>
        <div className="setting-row"><div className="setting-row-icon">{settings.theme === "dark" ? <Moon size={17}/> : <Sun size={17}/>}</div><div className="setting-row-copy"><strong>{t(locale,"darkMode")}</strong><span>{settings.theme === "dark" ? "Dark" : "Light"}</span></div><button className={`switch ${settings.theme === "dark" ? "switch-on" : ""}`} role="switch" aria-checked={settings.theme === "dark"} onClick={() => void updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}><i/></button></div>
        <div className="setting-row"><div className="setting-row-icon"><Bell size={17}/></div><div className="setting-row-copy"><strong>{t(locale,"notifications")}</strong><span>{t(locale,"medicationHint")}</span></div><button className={`switch ${settings.notificationsEnabled ? "switch-on" : ""}`} role="switch" aria-checked={settings.notificationsEnabled} onClick={() => void toggleNotifications()}><i/></button></div>
      </section>
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon coral"><Siren size={18}/></span><div><h2>{t(locale,"emergencyInfo")}</h2><p>{t(locale,"emergencyNumbers")}</p></div></div>
        <div className="setting-row"><div className="setting-row-icon"><Languages size={17}/></div><div className="setting-row-copy"><strong>{t(locale,"country")}</strong><span>{settings.country ? countryLabel(settings.country) : t(locale,"chooseCountry")}</span></div><select className="setting-select" value={settings.country} onChange={event => void updateSettings({ country: event.target.value })} aria-label={t(locale,"country")}><option value="">{t(locale,"countryNone")}</option>{countries.map(([value,key])=><option key={value} value={value}>{t(locale,key)}</option>)}</select></div>
        <div className="setting-row"><div className="setting-row-icon"><Heart size={17}/></div><div className="setting-row-copy"><strong>{t(locale,"emergencyContact")}</strong><span>{t(locale,"localOnly")}</span></div><input className="setting-text-input" value={settings.emergencyContact} onChange={event => void updateSettings({ emergencyContact: event.target.value })} placeholder={t(locale,"emergencyContact")} /></div>
        {emergency.numbers.length > 0 && <div className="emergency-numbers-preview"><span className="eyebrow">{t(locale,"emergencyNumbers")}</span><div className="number-pills">{emergency.numbers.map(number=><a key={number} href={`tel:${number.replaceAll(" ","")}`}>{number}</a>)}</div></div>}
      </section>
      <section className="settings-card privacy-card"><div className="settings-card-heading"><span className="settings-icon sage"><LockKeyhole size={18}/></span><div><h2>{t(locale,"privacy")}</h2><p>{t(locale,"localBadge")}</p></div><span className="local-chip"><span/>{t(locale,"localOnly")}</span></div><p className="privacy-copy">{t(locale,"localExplanation")}</p>
        <div className="privacy-actions"><button className="button button-soft" onClick={() => void exportLocalData()}><ArrowDownRight size={16}/>{t(locale,"exportData")}</button><button className="button button-danger-quiet" onClick={onDeleteAll}><Trash2 size={16}/>{t(locale,"deleteAll")}</button></div>
      </section>
      <section className="settings-card about-card"><div className="settings-card-heading"><span className="settings-icon blue"><CircleHelp size={18}/></span><div><h2>{t(locale,"about")}</h2><p>{t(locale,"appVersion")}</p></div></div><p>{t(locale,"aboutCopy")}</p><div className="disclaimer-full"><span className="eyebrow">{t(locale,"disclaimerTitle")}</span><p>{t(locale,"disclaimer")}</p></div></section>
    </div><aside className="settings-aside"><div className="privacy-stamp"><div className="privacy-stamp-icon"><LockKeyhole size={20}/></div><span className="eyebrow">{t(locale,"localBadge")}</span><h3>{t(locale,"localOnly")}</h3><p>{t(locale,"localExplanation")}</p><div className="privacy-check"><Check size={15}/>{t(locale,"demo")}</div></div><div className="aside-note"><ShieldAlert size={17}/><p>{t(locale,"disclaimer")}</p></div></aside></div>
  </div>;
}

export default function PocketDocApp({ welcomeOpen, onWelcomeClose }: { welcomeOpen: boolean; onWelcomeClose: () => void }) {
  const { snapshot, saveStatus, upsert, remove, updateSettings, clearAllData } = usePocketDoc();
  const { data, settings } = snapshot; const locale = settings.locale;
  const [section, setSection] = useState<Section>("home");
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleting, setDeleting] = useState<DeleteState>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const firedReminders = useRef(new Set<string>());
  const user = data.users[0] ?? null;

  useEffect(() => {
    if (!settings.notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const timer = window.setInterval(() => {
      const now = new Date(); const current = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      for (const medication of data.medications) {
        if (!medication.active || !nextDoseLabel(medication)) continue;
        const key = `${now.toISOString().slice(0,10)}:${medication.id}:${current}`;
        if (nextDoseLabel(medication) === current && !firedReminders.current.has(key)) {
          firedReminders.current.add(key);
          new Notification(`${t(locale,"appName")} · ${t(locale,"nextDose")}`, { body: medication.name, tag: key });
        }
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [settings.notificationsEnabled, settings.locale, data.medications]);

  function openEditor(kind: EditorKind, id?: string) { setEditor({ kind, id }); }
  function selectedRecord(): Record<string, unknown> | undefined {
    if (!editor?.id) return undefined;
    const table: Record<EditorKind, DatabaseTable> = { profile:"users", symptom:"symptoms", condition:"conditions", allergy:"allergies", medication:"medications", appointment:"appointments", health_record:"health_records" };
    return (data[table[editor.kind]] as unknown as Array<Record<string, unknown>>).find(item => item.id === editor.id);
  }
  async function saveEntity(values: EditorValues) {
    if (!editor) return;
    const current = selectedRecord(); const id = String(current?.id ?? makeId()); const now = new Date().toISOString();
    const text = (key: string, fallback = "") => String(values[key] ?? fallback);
    try {
      switch (editor.kind) {
        case "profile": {
          const item: User = { id, first_name: text("first_name"), last_name: text("last_name"), date_of_birth: text("date_of_birth"), sex: (text("sex","Other") as User["sex"]), blood_type: text("blood_type"), phone: text("phone"), email: text("email"), emergency_contact: text("emergency_contact"), locale, created_at: String(current?.created_at ?? now) };
          await upsert("users", item); await updateSettings({ emergencyContact: item.emergency_contact }); toast.success(t(locale,"profileSaved")); break;
        }
        case "symptom": {
          const item: Symptom = { id, name: text("name"), description: text("description"), severity: Number(values.severity ?? 1), duration: text("duration"), start_date: text("start_date"), created_at: String(current?.created_at ?? now), source: "manual" };
          await upsert("symptoms", item); toast.success(t(locale,"saved")); break;
        }
        case "condition": {
          const item: Condition = { id, condition: text("condition"), description: text("description"), diagnosis_date: text("diagnosis_date"), status: (text("status","active") as Condition["status"]), created_at: String(current?.created_at ?? now) };
          await upsert("conditions", item); toast.success(t(locale,"saved")); break;
        }
        case "allergy": {
          const item: Allergy = { id, allergen: text("allergen"), reaction: text("reaction"), severity: (text("severity","mild") as Allergy["severity"]), created_at: String(current?.created_at ?? now) };
          await upsert("allergies", item); toast.success(t(locale,"saved")); break;
        }
        case "medication": {
          const item: Medication = { id, name: text("name"), dosage: text("dosage"), frequency: text("frequency"), start_date: text("start_date"), end_date: text("end_date"), instructions: text("instructions"), active: Boolean(values.active ?? true) };
          await upsert("medications", item); toast.success(t(locale,"saved")); break;
        }
        case "appointment": {
          const item: Appointment = { id, doctor_name: text("doctor_name"), specialty: text("specialty"), date: text("date"), time: text("time"), location: text("location"), notes: text("notes"), status: (text("status","planned") as Appointment["status"]) };
          await upsert("appointments", item); toast.success(t(locale,"saved")); break;
        }
        case "health_record": {
          const item: HealthRecord = { id, record_type: (text("record_type","report") as HealthRecord["record_type"]), title: text("title"), description: text("description"), date: text("date"), file_name: text("file_name"), file_data: text("file_data") };
          await upsert("health_records", item); toast.success(t(locale,"saved")); break;
        }
      }
      setEditor(null);
    } catch { toast.error(locale === "fr" ? "Impossible d’enregistrer localement. Vérifiez l’espace de stockage." : locale === "ar" ? "تعذّر الحفظ محليًا. تحقق من مساحة التخزين." : "Could not save locally. Check available browser storage."); }
  }
  async function confirmItemDelete() {
    if (!deleting) return;
    await remove(deleting.table, deleting.id); setDeleting(null); toast.success(t(locale,"saved"));
  }
  async function confirmDeleteEverything() {
    if (deletePhrase !== "DELETE") return;
    await clearAllData(); setDeleteAllOpen(false); setDeletePhrase(""); setSection("home"); toast.success(t(locale,"dataDeleted"));
  }
  const sectionTitle = navItems.find(item => item.id === section)?.key ?? "home";
  const saveLabel = t(locale, saveStatus === "saving" ? "savingLocally" : saveStatus === "saved" ? "savedLocally" : saveStatus === "error" ? "localSaveError" : "localBadge");
  return <div className={`app-shell ${settings.theme === "dark" ? "theme-dark" : ""}`}>
    <aside className="sidebar">
      <div className="brand-lockup"><span className="brand-mark"><HeartPulse size={20}/></span><div><strong>{t(locale,"appName")}</strong><span>{t(locale,"tagline")}</span></div></div>
      <div className="nav-section-label">{t(locale,"helpfulShortcuts")}</div>
      <nav className="side-nav" aria-label={t(locale,"home")}>{navItems.map(item => { const Icon=item.icon; return <button key={item.id} className={`nav-link ${section===item.id?"nav-active":""}`} onClick={() => setSection(item.id)}><Icon size={18}/><span>{t(locale,item.key)}</span>{section===item.id && <i/>}</button>; })}</nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-privacy"><span className="privacy-lock"><LockKeyhole size={15}/></span><div><strong>{t(locale,"localBadge")}</strong><small>{t(locale,"localOnly")}</small></div></div>
      <button className="sidebar-emergency" onClick={() => setEmergencyOpen(true)}><span><Siren size={17}/></span><div><strong>{t(locale,"emergency")}</strong><small>{t(locale,"emergencyInfo")}</small></div><ArrowRight size={15}/></button>
      <button className="sidebar-user" onClick={() => setSection("settings")}><span className="user-avatar">{user ? `${user.first_name.slice(0,1)}${user.last_name.slice(0,1)}` : <UserRound size={16}/>}</span><span><strong>{user ? `${user.first_name} ${user.last_name}` : t(locale,"greetingEmpty")}</strong><small>{t(locale,"profile")}</small></span><ChevronDown size={15}/></button>
    </aside>
    <div className="app-main">
      <header className="topbar"><div className="topbar-mobile-brand"><span className="brand-mark"><HeartPulse size={18}/></span><strong>{t(locale,"appName")}</strong></div><div className="breadcrumbs"><span>{t(locale,"appName")}</span><ChevronRight size={14}/><strong>{t(locale,sectionTitle)}</strong></div><div className="topbar-actions"><span className="topbar-date">{new Intl.DateTimeFormat(locale,{weekday:"short",day:"numeric",month:"short"}).format(new Date())}</span><span className={`save-indicator save-indicator-${saveStatus}`} role="status" aria-live="polite" aria-atomic="true" aria-label={saveLabel} title={saveLabel}>{saveStatus === "saving" ? <span className="save-indicator-spinner" aria-hidden="true"/> : saveStatus === "error" ? <CloudOff size={14}/> : saveStatus === "saved" ? <Check size={14}/> : <LockKeyhole size={14}/>}<span className="save-indicator-label">{saveLabel}</span></span><button className="button button-danger" onClick={() => setEmergencyOpen(true)}><Siren size={16}/><span>{t(locale,"emergency")}</span></button><button className="topbar-avatar" onClick={() => setSection("settings")} aria-label={t(locale,"settings")}>{user ? `${user.first_name.slice(0,1)}${user.last_name.slice(0,1)}` : <UserRound size={16}/>}</button></div></header>
      <main className="content-area" key={section}>
        {section === "home" && <HomePage onNavigate={setSection} onEditor={openEditor} onEmergency={() => setEmergencyOpen(true)} />}
        {section === "symptomChecker" && <SymptomChecker onOpenSettings={() => setSection("settings")} />}
        {section === "medicalHistory" && <HistoryPage onEditor={openEditor} onDelete={(table,id) => setDeleting({table,id})} onNavigate={setSection} />}
        {section === "medications" && <MedicationPage onEditor={openEditor} onDelete={(table,id) => setDeleting({table,id})} />}
        {section === "appointments" && <AppointmentsPage onEditor={openEditor} onDelete={(table,id) => setDeleting({table,id})} />}
        {section === "healthRecords" && <RecordsPage onEditor={openEditor} onDelete={(table,id) => setDeleting({table,id})} />}
        {section === "settings" && <SettingsPage onEditor={openEditor} onDeleteAll={() => setDeleteAllOpen(true)} />}
      </main>
      <nav className="mobile-nav" aria-label={t(locale,"home")}>{navItems.map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>setSection(item.id)} className={section===item.id?"mobile-nav-active":""} aria-current={section===item.id?"page":undefined}><Icon size={18}/><span>{t(locale,item.key)}</span></button>;})}</nav>
    </div>
    {welcomeOpen && <Modal title={t(locale,"firstLaunch")} onClose={onWelcomeClose}><div className="welcome-modal-copy"><span className="welcome-modal-icon"><HeartPulse size={24}/></span><p>{t(locale,"firstLaunchCopy")}</p><div className="disclaimer-full"><span className="eyebrow">{t(locale,"disclaimerTitle")}</span><p>{t(locale,"disclaimer")}</p></div><button className="button button-primary button-full" onClick={onWelcomeClose}>{t(locale,"acceptDisclaimer")}<ArrowRight size={16}/></button></div></Modal>}
    {editor && <EntityEditor key={`${editor.kind}-${editor.id ?? "new"}`} kind={editor.kind} locale={locale} initial={selectedRecord()} onClose={() => setEditor(null)} onSave={values => void saveEntity(values)} />}
    {deleting && <Modal title={t(locale,"delete")} onClose={() => setDeleting(null)}><div className="confirm-copy"><div className="confirm-icon"><Trash2 size={20}/></div><p>{t(locale,"confirmDelete")}</p><div className="modal-actions"><button className="button button-quiet" onClick={() => setDeleting(null)}>{t(locale,"cancel")}</button><button className="button button-danger" onClick={() => void confirmItemDelete()}>{t(locale,"yesDelete")}</button></div></div></Modal>}
    {deleteAllOpen && <Modal title={t(locale,"deleteAll")} onClose={() => { setDeleteAllOpen(false); setDeletePhrase(""); }}><div className="confirm-copy"><div className="confirm-icon danger"><Trash2 size={20}/></div><p>{t(locale,"deleteWarning")}</p><label className="form-field"><span>{t(locale,"typeDelete")}</span><input value={deletePhrase} onChange={event=>setDeletePhrase(event.target.value)} placeholder={t(locale,"deletePlaceholder")} autoComplete="off" /></label><div className="modal-actions"><button className="button button-quiet" onClick={() => {setDeleteAllOpen(false);setDeletePhrase("");}}>{t(locale,"cancel")}</button><button className="button button-danger" disabled={deletePhrase !== "DELETE"} onClick={() => void confirmDeleteEverything()}>{t(locale,"deleteConfirm")}</button></div></div></Modal>}
    {emergencyOpen && <EmergencyDialog locale={locale} country={settings.country} onClose={() => setEmergencyOpen(false)} onSettings={() => { setEmergencyOpen(false); setSection("settings"); }} />}
  </div>;
}

function EmergencyDialog({ locale, country, onClose, onSettings }: { locale: "en" | "fr" | "ar"; country: string; onClose: () => void; onSettings: () => void }) {
  const info = getEmergencyDetails(country, locale);
  return <Modal title={t(locale,"emergencyInfo")} onClose={onClose} wide><div className="emergency-dialog-content"><div className="emergency-dialog-alert"><span><Siren size={22}/></span><strong>{t(locale,"emergencyAlert")}</strong></div><p>{t(locale,"nearestER")}</p><div className="emergency-number-area"><span className="eyebrow">{t(locale,"emergencyNumbers")}</span>{info.numbers.length ? <div className="number-pills large">{info.numbers.map(number=><a key={number} href={`tel:${number.replaceAll(" ","")}`}>{number}<ArrowUp size={13}/></a>)}</div> : <><p>{t(locale,"countryUnknown")}</p><button className="button button-soft" onClick={onSettings}>{t(locale,"chooseCountry")}<ArrowRight size={15}/></button></>}</div><div className="emergency-reminder"><ShieldAlert size={17}/><span>{t(locale,"disclaimer")}</span></div><div className="modal-actions"><button className="button button-quiet" onClick={onClose}>{t(locale,"close")}</button></div></div></Modal>;
}
