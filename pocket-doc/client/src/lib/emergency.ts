import { Locale } from "./types";

export interface EmergencyDetails { numbers: string[]; crisisNumber: string; }
const details: Record<string, EmergencyDetails> = {
  US: { numbers: ["911"], crisisNumber: "988" },
  CA: { numbers: ["911"], crisisNumber: "988" },
  FR: { numbers: ["112", "15"], crisisNumber: "3114" },
  GB: { numbers: ["999", "112"], crisisNumber: "116 123" },
  AU: { numbers: ["000"], crisisNumber: "13 11 14" },
  MA: { numbers: ["112", "15", "19"], crisisNumber: "" },
  IE: { numbers: ["112", "999"], crisisNumber: "116 123" },
  ES: { numbers: ["112"], crisisNumber: "024" },
};
export function getEmergencyDetails(country: string, _locale: Locale): EmergencyDetails {
  return details[country] ?? { numbers: [], crisisNumber: "" };
}
export function countryLabel(country: string): string {
  const labels: Record<string, string> = { US: "United States", CA: "Canada", FR: "France", GB: "United Kingdom", AU: "Australia", MA: "Morocco", IE: "Ireland", ES: "Spain" };
  return labels[country] ?? "";
}
