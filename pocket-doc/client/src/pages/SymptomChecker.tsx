import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowUp, CheckCircle2, Clock3, HeartPulse, RotateCcw, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { mockMedicalAssistantService, parseSeverity, PatientContext } from "@/lib/assistant";
import { getEmergencyDetails } from "@/lib/emergency";
import { t } from "@/lib/i18n";
import { usePocketDoc } from "@/contexts/PocketDocContext";
import { ChatMessage, GuidanceResult, SymptomCheck, SymptomExtraction, UrgencyLevel, makeId } from "@/lib/types";

interface Props { onOpenSettings: () => void; }
type Stage = "initial" | "duration" | "severity" | "done" | "emergency";
const nowIso = () => new Date().toISOString();

function GuidanceCard({ result, locale }: { result: GuidanceResult; locale: "en" | "fr" | "ar" }) {
  const urgency = result.next_step;
  const color = urgency === "urgent" ? "orange" : urgency === "emergency" ? "red" : urgency === "consult" ? "amber" : "green";
  return <div className="guidance-result">
    <div className={`urgency-banner urgency-${color}`}><span className="urgency-dot" /><div><span className="eyebrow">{t(locale, "urgency")}</span><strong>{t(locale, urgency)}</strong><p>{result.next_step_reason}</p></div></div>
    <div className="guidance-grid">
      <section className="guidance-section"><div className="guidance-heading"><span className="guidance-icon mint"><Sparkles size={16} /></span><h4>{t(locale, "possibleExplanations")}</h4></div><ul>{result.possible_explanations.map((item, i) => <li key={i}>{item}</li>)}</ul></section>
      <section className="guidance-section"><div className="guidance-heading"><span className="guidance-icon coral"><AlertTriangle size={16} /></span><h4>{t(locale, "warningSigns")}</h4></div><ul>{result.warning_signs.map((item, i) => <li key={i}>{item}</li>)}</ul></section>
    </div>
    <section className="followup-box"><div className="guidance-heading"><span className="guidance-icon blue"><Stethoscope size={16} /></span><h4>{t(locale, "recommendedNext")}</h4></div><p>{result.next_step_reason}</p></section>
    <section className="followup-box soft"><div className="guidance-heading"><span className="guidance-icon lavender"><Clock3 size={16} /></span><h4>{t(locale, "followUpQuestions")}</h4></div>{result.follow_up_questions.length ? <ul>{result.follow_up_questions.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>{t(locale, "noFollowups")}</p>}</section>
    <p className="result-disclaimer"><ShieldAlert size={14} />{t(locale, "notDiagnosis")}</p>
  </div>;
}

function EmergencyPanel({ selfHarm, country, locale, onOpenSettings }: { selfHarm: boolean; country: string; locale: "en" | "fr" | "ar"; onOpenSettings: () => void }) {
  const details = getEmergencyDetails(country, locale);
  return <div className="emergency-inline" role="alert">
    <div className="emergency-inline-icon"><ShieldAlert size={22} /></div>
    <div className="emergency-inline-copy"><strong>{t(locale, "emergencyAlert")}</strong><p>{t(locale, "nearestER")}</p>
      <div className="emergency-inline-numbers"><span className="eyebrow">{t(locale, "emergencyNumbers")}</span>
        {details.numbers.length ? <div className="number-pills">{details.numbers.map(number => <a key={number} href={`tel:${number.replaceAll(" ", "")}`}>{number}</a>)}</div> : <button className="inline-text-button" onClick={onOpenSettings}>{t(locale, "chooseCountry")}</button>}
      </div>
      {selfHarm && <div className="crisis-inline"><strong>{t(locale, "crisisLine")}</strong>{details.crisisNumber ? <a className="crisis-phone" href={`tel:${details.crisisNumber.replaceAll(" ", "")}`}>{details.crisisNumber}</a> : <p>{t(locale, "crisisUnknown")}</p>}<p>{t(locale, "crisisSupport")}</p></div>}
    </div>
  </div>;
}

export default function SymptomChecker({ onOpenSettings }: Props) {
  const { snapshot, upsert } = usePocketDoc();
  const { settings, data } = snapshot;
  const locale = settings.locale;
  const user = data.users[0] ?? null;
  const [stage, setStage] = useState<Stage>("initial");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: makeId(), role: "assistant", content: t(locale, "chatWelcome"), created_at: nowIso() }]);
  const [draft, setDraft] = useState("");
  const [extraction, setExtraction] = useState<SymptomExtraction | null>(null);
  const [emergencyKind, setEmergencyKind] = useState<"medical" | "self_harm">("medical");
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);
  const context: PatientContext = { user, data, locale };

  function assistantMessage(content: string, guidance?: GuidanceResult): ChatMessage {
    return { id: makeId(), role: "assistant", content, created_at: nowIso(), ...(guidance ? { guidance } : {}) };
  }
  async function sendMessage() {
    const text = draft.trim();
    if (!text || loading || stage === "emergency" || stage === "done") return;
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text, created_at: nowIso() };
    const base = [...messages, userMessage];
    setMessages(base); setDraft("");

    // The deterministic emergency safety check runs on every raw user message before analysis or guidance.
    const signal = mockMedicalAssistantService.detectEmergencySigns(text);
    if (signal) {
      setEmergencyKind(signal.kind);
      setStage("emergency");
      setMessages([...base, assistantMessage(t(locale, "emergencyStop"))]);
      return;
    }

    setLoading(true);
    try {
      if (stage === "initial") {
        const nextExtraction = await mockMedicalAssistantService.analyzeSymptoms(text, context);
        setExtraction(nextExtraction);
        const question = mockMedicalAssistantService.askFollowUpQuestion(nextExtraction, "duration", locale);
        setMessages([...base, assistantMessage(question)]);
        setStage("duration");
      } else if (stage === "duration" && extraction) {
        const nextExtraction = { ...extraction, duration: text };
        setExtraction(nextExtraction);
        const question = mockMedicalAssistantService.askFollowUpQuestion(nextExtraction, "severity", locale);
        setMessages([...base, assistantMessage(question)]);
        setStage("severity");
      } else if (stage === "severity" && extraction) {
        const severityValue = parseSeverity(text);
        if (severityValue === null) {
          const question = mockMedicalAssistantService.askFollowUpQuestion(extraction, "severity", locale);
          const help = locale === "fr" ? "Vous pouvez répondre par un chiffre de 1 à 10, ou par léger, modéré ou intense." : locale === "ar" ? "يمكنك الإجابة برقم من 1 إلى 10، أو خفيف أو متوسط أو شديد." : "You can answer with a number from 1 to 10, or mild, moderate, or severe.";
          setMessages([...base, assistantMessage(`${help}\n${question}`)]);
        } else {
          const complete = { ...extraction, severity: severityValue };
          setExtraction(complete);
          const result = await mockMedicalAssistantService.generateHealthGuidance(complete, locale);
          const response = assistantMessage(t(locale, "orientationSummaryIntro"), result);
          const completedMessages = [...base, response];
          const created = nowIso();
          const check: SymptomCheck = { id: makeId(), symptoms_json: complete, conversation_json: completedMessages, result_json: result, urgency_level: result.next_step, created_at: created };
          await upsert("symptom_checks", check);
          const originalDescription = base.filter(message => message.role === "user").map(message => message.content).join(" · ");
          await upsert("symptoms", { id: makeId(), name: complete.symptoms[0] ?? text, description: originalDescription, severity: severityValue, duration: complete.duration, start_date: created.slice(0, 10), created_at: created, source: "check" });
          setMessages(completedMessages); setStage("done");
        }
      }
    } catch {
      const trouble = locale === "fr" ? "Une erreur locale est survenue. Vous pouvez réessayer." : locale === "ar" ? "حدث خطأ محلي. يمكنك المحاولة مجددًا." : "A local error occurred. Please try again.";
      setMessages(prev => [...prev, assistantMessage(trouble)]);
    } finally { setLoading(false); }
  }
  function handleSubmit(event: FormEvent) { event.preventDefault(); void sendMessage(); }
  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); }
  }
  function resetSession() {
    setStage("initial"); setExtraction(null); setEmergencyKind("medical"); setShowDisclaimer(true);
    setMessages([{ id: makeId(), role: "assistant", content: t(locale, "chatWelcome"), created_at: nowIso() }]);
    setTimeout(() => inputRef.current?.focus(), 30);
  }
  const levelLabel = extraction?.severity ? extraction.severity <= 3 ? t(locale, "severityLow") : extraction.severity <= 6 ? t(locale, "severityMid") : t(locale, "severityHigh") : "";
  return <div className="page-stack checker-page">
    <div className="page-heading checker-heading"><div><div className="eyebrow heading-kicker"><Activity size={14} />{t(locale, "symptomChecker")}</div><h1>{t(locale, "checkerTitle")}</h1><p>{t(locale, "checkerSubtitle")}</p></div>{stage !== "initial" && <button className="button button-quiet" onClick={resetSession}><RotateCcw size={16} />{t(locale, "newCheck")}</button>}</div>
    {showDisclaimer && <div className="notice-banner"><ShieldAlert size={17} /><p>{t(locale, "disclaimerBanner")} <span>{t(locale, "sessionNotice")}</span></p><button aria-label={t(locale, "dismiss")} onClick={() => setShowDisclaimer(false)}><span aria-hidden="true">×</span></button></div>}
    <section className="chat-card" aria-label={t(locale, "checkerTitle")}>
      <div className="chat-topline"><div className="assistant-avatar"><HeartPulse size={20} /></div><div><strong>{t(locale, "appName")}</strong><span>{t(locale, "localOnly")}</span></div><div className="local-chip"><span />{t(locale, "demo")}</div></div>
      <div className="chat-transcript" aria-live="polite">
        {messages.map(message => <div key={message.id} className={`chat-row ${message.role === "user" ? "chat-row-user" : "chat-row-assistant"}`}>
          {message.role === "assistant" && <div className="chat-avatar"><HeartPulse size={15} /></div>}
          <div className={`chat-bubble ${message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}>
            <p>{message.content}</p>
            {message.guidance && <GuidanceCard result={message.guidance} locale={locale} />}
            <time>{new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}</time>
          </div>
        </div>)}
        {loading && <div className="chat-row chat-row-assistant"><div className="chat-avatar"><HeartPulse size={15} /></div><div className="typing-bubble"><span /><span /><span /><small>{t(locale, "typing")}</small></div></div>}
        {stage === "emergency" && <EmergencyPanel selfHarm={emergencyKind === "self_harm"} country={settings.country} locale={locale} onOpenSettings={onOpenSettings} />}
        {stage === "done" && <div className="saved-confirmation"><CheckCircle2 size={17} />{t(locale, "resultSaved")}</div>}
        <div ref={messagesEnd} />
      </div>
      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea ref={inputRef} rows={1} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={handleKey} placeholder={t(locale, "typeSymptoms")} disabled={loading || stage === "done" || stage === "emergency"} aria-label={t(locale, "typeSymptoms")} />
        <button type="submit" className="send-button" disabled={!draft.trim() || loading || stage === "done" || stage === "emergency"} aria-label={t(locale, "send")}><ArrowUp size={19} /></button>
      </form>
      <div className="chat-footer"><span><ShieldAlert size={13} />{t(locale, "notDiagnosis")}</span>{extraction?.severity && <span className={`severity-chip sev-${extraction.severity <= 3 ? "low" : extraction.severity <= 6 ? "mid" : "high"}`}><span className="severity-dot" />{t(locale, "severity")}: {levelLabel} · {extraction.severity}/10</span>}</div>
    </section>
    <div className="checker-footnote"><ShieldAlert size={15} /><span>{t(locale, "disclaimer")}</span></div>
  </div>;
}
