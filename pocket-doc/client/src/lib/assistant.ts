import { GuidanceResult, Locale, SymptomExtraction, UrgencyLevel, User, Database } from "./types";

export interface PatientContext { user: User | null; data: Database; locale: Locale; }
export interface EmergencySignal { kind: "medical" | "self_harm"; matched: string; }
export interface MedicalAssistantService {
  detectEmergencySigns(input: string): EmergencySignal | null;
  analyzeSymptoms(input: string, context: PatientContext): Promise<SymptomExtraction>;
  askFollowUpQuestion(extraction: SymptomExtraction, field: "duration" | "severity", locale: Locale): string;
  generateHealthGuidance(extraction: SymptomExtraction, locale: Locale): Promise<GuidanceResult>;
}

const patterns: Array<{ kind: EmergencySignal["kind"]; re: RegExp; name: string }> = [
  { kind: "self_harm", re: /\b(suicid(al|e)|thinking about suicide|suicidal thoughts|kill myself|end my life|self[- ]?harm|hurt myself|want to die|suicidio|me suicider|mettre fin à mes jours|pensées suicidaires|idées suicidaires|envie de mourir|me faire du mal|automutilation)\b/i, name: "self-harm intent" },
  { kind: "medical", re: /\b(severe|crushing|sudden|intense|terrible|very bad)?\s*(chest pain|pressure in (my )?chest|douleur thoracique intense|douleur à la poitrine|ألم شديد في الصدر)\b/i, name: "severe chest pain" },
  { kind: "medical", re: /\b(can't breathe|cannot breathe|difficulty breathing|shortness of breath|struggling to breathe|respiratory distress|difficulté à respirer|du mal à respirer|أجد صعوبة في التنفس|لا أستطيع التنفس)\b/i, name: "difficulty breathing" },
  { kind: "medical", re: /\b(unconscious|passed out|lost consciousness|not waking|loss of consciousness|évanoui|perte de conscience|فقدت الوعي|فاقد الوعي)\b/i, name: "loss of consciousness" },
  { kind: "medical", re: /\b(severe bleeding|bleeding won't stop|uncontrolled bleeding|massive bleeding|saignement abondant|hémorragie|نزيف شديد|نزيف لا يتوقف)\b/i, name: "severe bleeding" },
  { kind: "medical", re: /\b(one[- ]sided weakness|sudden weakness|face droop|facial drooping|can't move (my )?(arm|leg)|sudden paralysis|paralysie soudaine|faiblesse d'un côté|ضعف مفاجئ في جانب|شلل مفاجئ)\b/i, name: "sudden weakness or paralysis" },
  { kind: "medical", re: /\b(throat (is )?closing|tongue swelling|swelling of (my )?(throat|tongue)|severe allergic reaction|anaphylaxis|réaction allergique grave|langue qui gonfle|حساسية شديدة|تورم اللسان|انغلاق الحلق)\b/i, name: "severe allergic reaction" },
  { kind: "medical", re: /\b(sudden severe confusion|suddenly confused|can't recognize|cannot recognize anyone|confusion soudaine|confus soudainement|ارتباك شديد ومفاجئ|تشوش مفاجئ)\b/i, name: "sudden severe confusion" },
  { kind: "medical", re: /\b(severe abdominal pain|sudden severe stomach pain|unbearable abdominal pain|douleur abdominale intense|douleur abdominale sévère|ألم شديد في البطن)\b/i, name: "severe abdominal pain" },
];

function categoryFor(input: string): SymptomExtraction["category"] {
  const text = input.toLowerCase();
  if (/headache|migraine|head hurts|mal de tête|migraine|صداع/.test(text)) return "headache";
  if (/cough|cold|sore throat|congestion|runny nose|toux|rhume|mal de gorge|سعال|زكام/.test(text)) return "respiratory";
  if (/nausea|nauseous|stomach|digest|diarrh|constipat|nausée|ventre|digestion|غثيان|معدة/.test(text)) return "digestive";
  if (/rash|itch|skin|éruption|démangeaison|peau|طفح|حكة|جلد/.test(text)) return "skin";
  if (/sleep|insomnia|fatigue|tired|sommeil|insomnie|fatigué|نوم|أرق|إرهاق/.test(text)) return "sleep";
  return "general";
}
function categorySymptoms(category: SymptomExtraction["category"], locale: Locale): string[] {
  const terms: Record<Locale, Record<SymptomExtraction["category"], string[]>> = {
    en: { headache: ["headache"], respiratory: ["cough or cold-like symptoms"], digestive: ["digestive discomfort"], skin: ["skin irritation"], sleep: ["sleep or fatigue concerns"], general: ["the symptoms you described"] },
    fr: { headache: ["un mal de tête"], respiratory: ["des symptômes de type toux ou rhume"], digestive: ["un inconfort digestif"], skin: ["une irritation cutanée"], sleep: ["des troubles du sommeil ou de la fatigue"], general: ["les symptômes décrits"] },
    ar: { headache: ["صداع"], respiratory: ["أعراض تشبه السعال أو الزكام"], digestive: ["انزعاج هضمي"], skin: ["تهيج جلدي"], sleep: ["مشكلات في النوم أو الإرهاق"], general: ["الأعراض التي وصفتها"] },
  };
  return terms[locale][category];
}
function estimatedAge(user: User | null): number | null {
  if (!user?.date_of_birth) return null;
  const dob = new Date(user.date_of_birth); if (Number.isNaN(dob.getTime())) return null;
  const now = new Date(); let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Rule-based demo only: this service is not clinically validated and never diagnoses. */
export const mockMedicalAssistantService: MedicalAssistantService = {
  detectEmergencySigns(input) {
    if (/أريد أن أموت|أفكر في الانتحار|انتحار|إيذاء النفس|إيذاء نفسي|قتل نفسي/.test(input)) return { kind: "self_harm", matched: "self-harm intent" };
    if (/أجد صعوبة في التنفس|لا أستطيع التنفس|صعوبة في التنفس|ألم شديد في الصدر|نزيف شديد|نزيف لا يتوقف|ضعف مفاجئ في جانب|شلل مفاجئ|حساسية شديدة|تورم اللسان|انغلاق الحلق|ارتباك شديد ومفاجئ|تشوش مفاجئ|ألم شديد في البطن|فقدت الوعي|فاقد الوعي/.test(input)) return { kind: "medical", matched: "possible emergency sign" };
    const found = patterns.find(pattern => pattern.re.test(input));
    return found ? { kind: found.kind, matched: found.name } : null;
  },
  async analyzeSymptoms(input, context) {
    const category = categoryFor(input);
    const symptoms = categorySymptoms(category, context.locale);
    return {
      symptoms, category, duration: "", severity: null, age: estimatedAge(context.user), sex: context.user?.sex ?? null,
      relevant_history: context.data.conditions.filter(item => item.status !== "resolved").map(item => item.condition),
      medications: context.data.medications.filter(item => item.active).map(item => item.name),
      allergies: context.data.allergies.map(item => item.allergen),
    };
  },
  askFollowUpQuestion(_extraction, field, locale) {
    const prompts: Record<Locale, Record<"duration" | "severity", string>> = {
      en: { duration: "How long have you been experiencing this?", severity: "On a scale from 1 to 10, how severe does it feel right now?" },
      fr: { duration: "Depuis combien de temps ressentez-vous cela ?", severity: "Sur une échelle de 1 à 10, quelle est l’intensité ressentie ?" },
      ar: { duration: "منذ متى تشعر بهذه الأعراض؟", severity: "على مقياس من 1 إلى 10، ما شدة الأعراض الآن؟" },
    };
    return prompts[locale][field];
  },
  async generateHealthGuidance(extraction, locale) {
    const labels: Record<Locale, Record<string, string[]>> = {
      en: {
        headache: ["A headache can be associated with tension, dehydration, eye strain, or many other causes.", "Changes in sleep, stress, or a minor illness can also play a part."],
        respiratory: ["Cough or cold-like symptoms can be associated with common viral illnesses or irritation.", "Allergies or other causes may also contribute; this pattern alone cannot identify a cause."],
        digestive: ["Digestive discomfort can be associated with food, a short-lived stomach upset, stress, or other causes.", "Symptoms and timing vary, so this description cannot identify a cause."],
        skin: ["Skin irritation can be associated with contact irritants, dryness, or allergies, among other causes.", "A description alone cannot determine what is causing a skin change."],
        sleep: ["Sleep or fatigue changes can be associated with routine, stress, sleep quality, or many other factors.", "Persistent fatigue can have varied causes and may be worth discussing with a clinician."],
        general: ["The symptoms described can be associated with a range of common and less common causes.", "More context or an examination may be needed to understand them."],
      },
      fr: {
        headache: ["Un mal de tête peut être associé à la tension, à la déshydratation, à la fatigue visuelle ou à d'autres causes.", "Le sommeil, le stress ou une affection bénigne peuvent aussi jouer un rôle."],
        respiratory: ["Une toux ou des symptômes de rhume peuvent être associés à des infections virales courantes ou à une irritation.", "Les allergies et d'autres facteurs peuvent aussi intervenir ; ce seul tableau ne permet pas d'identifier une cause."],
        digestive: ["Un inconfort digestif peut être associé à l'alimentation, à un trouble passager, au stress ou à d'autres causes.", "La description seule ne permet pas d'en déterminer la cause."],
        skin: ["Une irritation cutanée peut être associée à un irritant, à la sécheresse ou à une allergie, entre autres causes.", "Une description seule ne permet pas d'identifier l'origine d'un changement cutané."],
        sleep: ["Les changements de sommeil ou la fatigue peuvent être associés aux habitudes, au stress, à la qualité du sommeil ou à d'autres facteurs.", "Une fatigue persistante peut avoir diverses causes et mérite parfois un avis médical."],
        general: ["Les symptômes décrits peuvent être associés à différentes causes, courantes ou moins fréquentes.", "Des précisions ou un examen peuvent être nécessaires pour mieux les comprendre."],
      },
      ar: {
        headache: ["قد يرتبط الصداع بالتوتر أو الجفاف أو إجهاد العين أو أسباب أخرى كثيرة.", "وقد تؤثر قلة النوم أو التوتر أو وعكة بسيطة أيضًا."],
        respiratory: ["قد يرتبط السعال أو ما يشبه الزكام بمرض فيروسي شائع أو تهيّج.", "وقد تسهم الحساسية أو أسباب أخرى؛ ولا يكفي هذا الوصف وحده لتحديد السبب."],
        digestive: ["قد يرتبط الانزعاج الهضمي بالطعام أو اضطراب عابر أو التوتر أو أسباب أخرى.", "ولا يكفي الوصف وحده لتحديد السبب."],
        skin: ["قد يرتبط تهيّج الجلد بمادة مهيّجة أو جفاف أو حساسية، إلى جانب أسباب أخرى.", "ولا يكفي الوصف وحده لمعرفة سبب التغيّر الجلدي."],
        sleep: ["قد ترتبط تغيّرات النوم أو الإرهاق بالروتين أو التوتر أو جودة النوم أو عوامل أخرى.", "وقد يستحق الإرهاق المستمر مناقشته مع مختص صحي."],
        general: ["قد ترتبط الأعراض الموصوفة بمجموعة من الأسباب الشائعة أو الأقل شيوعًا.", "وقد تكون هناك حاجة إلى مزيد من المعلومات أو فحص لفهمها."],
      },
    };
    const words: Record<Locale, { warnings: string[]; reason: Record<UrgencyLevel, string>; follow: string[] }> = {
      en: { warnings: ["Seek urgent help if symptoms become severe, worsen quickly, or feel alarming.", "Get emergency help for trouble breathing, severe chest pain, fainting, or sudden weakness."], reason: { emergency: "The emergency safety layer detected a warning sign.", urgent: "A high reported severity can benefit from prompt professional assessment.", consult: "A clinician can help if symptoms persist, recur, or concern you.", self_care: "The reported symptoms are currently mild; monitoring and simple comfort measures may be reasonable." }, follow: ["Would it help to note any changes or new symptoms?", "If this continues, consider sharing this summary with a healthcare professional."] },
      fr: { warnings: ["Demandez rapidement de l'aide si les symptômes deviennent intenses, s'aggravent vite ou vous inquiètent.", "Appelez les urgences en cas de difficulté à respirer, douleur thoracique intense, perte de connaissance ou faiblesse soudaine."], reason: { emergency: "La sécurité a détecté un signe d'alerte.", urgent: "Une intensité élevée peut justifier une évaluation professionnelle rapide.", consult: "Un professionnel peut vous aider si les symptômes persistent, reviennent ou vous inquiètent.", self_care: "Les symptômes signalés sont légers ; une surveillance et des mesures de confort simples peuvent convenir." }, follow: ["Souhaitez-vous noter tout changement ou nouveau symptôme ?", "Si cela persiste, vous pouvez partager ce résumé avec un professionnel de santé."] },
      ar: { warnings: ["اطلب المساعدة سريعًا إذا اشتدت الأعراض أو ساءت بسرعة أو أثارت قلقك.", "اطلب الطوارئ عند صعوبة التنفس أو ألم شديد في الصدر أو الإغماء أو ضعف مفاجئ."], reason: { emergency: "رصدت طبقة الأمان علامة تحذيرية.", urgent: "قد تستدعي شدة الأعراض المبلغ عنها تقييمًا مهنيًا سريعًا.", consult: "يمكن للمختص مساعدتك إذا استمرت الأعراض أو تكررت أو أقلقتك.", self_care: "الأعراض المبلغ عنها خفيفة حاليًا؛ وقد تكون المراقبة وإجراءات الراحة البسيطة مناسبة." }, follow: ["هل ترغب في تدوين أي تغيّر أو عرض جديد؟", "إذا استمر ذلك، يمكنك مشاركة هذا الملخص مع مختص صحي."] },
    };
    const urgency: UrgencyLevel = (extraction.severity ?? 5) >= 8 ? "urgent" : (extraction.severity ?? 5) >= 6 ? "consult" : "self_care";
    return {
      possible_explanations: labels[locale][extraction.category], warning_signs: words[locale].warnings,
      next_step: urgency, next_step_reason: words[locale].reason[urgency], follow_up_questions: words[locale].follow,
    };
  },
};

export function parseSeverity(value: string): number | null {
  const numeric = value.match(/(?:^|\D)(10|[1-9])(?:\D|$)/);
  if (numeric) return Math.max(1, Math.min(10, Number(numeric[1])));
  const text = value.toLowerCase();
  if (/mild|slight|faible|léger|légère|خفيف/.test(text)) return 2;
  if (/moderate|medium|modéré|moyen|متوسط/.test(text)) return 5;
  if (/severe|intense|strong|grave|fort|forte|شديد|قوي/.test(text)) return 8;
  return null;
}
