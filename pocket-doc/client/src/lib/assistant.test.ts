import { describe, expect, it } from "vitest";
import { mockMedicalAssistantService, parseSeverity } from "./assistant";
import { emptyDatabase } from "./types";

describe("MockMedicalAssistantService safety and contract", () => {
  it("detects emergency signs before symptom analysis", () => {
    expect(mockMedicalAssistantService.detectEmergencySigns("I have severe chest pain")).toMatchObject({ kind: "medical" });
    expect(mockMedicalAssistantService.detectEmergencySigns("I am struggling to breathe")).toMatchObject({ kind: "medical" });
    expect(mockMedicalAssistantService.detectEmergencySigns("I have sudden one-sided weakness")).toMatchObject({ kind: "medical" });
  });
  it("treats self-harm intent as a separate crisis signal in English, French, and Arabic", () => {
    expect(mockMedicalAssistantService.detectEmergencySigns("I want to end my life")).toMatchObject({ kind: "self_harm" });
    expect(mockMedicalAssistantService.detectEmergencySigns("J'ai des pensées suicidaires")).toMatchObject({ kind: "self_harm" });
    expect(mockMedicalAssistantService.detectEmergencySigns("أريد أن أموت")).toMatchObject({ kind: "self_harm" });
  });
  it("extracts structure without copying free text into the structured object", async () => {
    const extraction = await mockMedicalAssistantService.analyzeSymptoms("I have had a headache", { user: null, data: emptyDatabase(), locale: "en" });
    expect(extraction.category).toBe("headache");
    expect(extraction.symptoms.length).toBeGreaterThan(0);
    expect(extraction).not.toHaveProperty("original_text");
    expect(extraction).not.toHaveProperty("raw_input");
  });
  it("returns one targeted follow-up question in the active language", async () => {
    const extraction = await mockMedicalAssistantService.analyzeSymptoms("toux", { user: null, data: emptyDatabase(), locale: "fr" });
    expect(mockMedicalAssistantService.askFollowUpQuestion(extraction, "duration", "fr")).toContain("combien de temps");
    expect(mockMedicalAssistantService.askFollowUpQuestion(extraction, "severity", "ar")).toContain("1 إلى 10");
  });
  it("always supplies the four guidance sections without a diagnosis", async () => {
    const extraction = await mockMedicalAssistantService.analyzeSymptoms("mild headache", { user: null, data: emptyDatabase(), locale: "en" });
    extraction.severity = 3;
    const result = await mockMedicalAssistantService.generateHealthGuidance(extraction, "en");
    expect(result.possible_explanations.length).toBeGreaterThan(1);
    expect(result.warning_signs.length).toBeGreaterThan(0);
    expect(result.next_step).toBe("self_care");
    expect(result.next_step_reason).toBeTruthy();
    expect(Array.isArray(result.follow_up_questions)).toBe(true);
    expect(JSON.stringify(result).toLowerCase()).not.toContain("you have");
  });
});

describe("severity parsing", () => {
  it("accepts a 1–10 response or a severity label", () => {
    expect(parseSeverity("8")).toBe(8);
    expect(parseSeverity("10 out of 10")).toBe(10);
    expect(parseSeverity("moderate")).toBe(5);
    expect(parseSeverity("léger")).toBe(2);
    expect(parseSeverity("شديد")).toBe(8);
  });
  it("requests another answer if the response cannot be understood", () => {
    expect(parseSeverity("I am not sure")).toBeNull();
  });
});
