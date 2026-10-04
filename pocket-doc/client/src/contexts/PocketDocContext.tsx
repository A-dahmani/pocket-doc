import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { localStore } from "@/lib/localStore";
import { AppSettings, AppSnapshot, createSeedSnapshot, Database, DatabaseTable, emptySnapshot } from "@/lib/types";

type LocalSaveStatus = "idle" | "saving" | "saved" | "error";
interface PocketDocContextValue {
  snapshot: AppSnapshot; ready: boolean; saveStatus: LocalSaveStatus;
  upsert: <K extends DatabaseTable>(table: K, item: Database[K][number]) => Promise<void>;
  remove: <K extends DatabaseTable>(table: K, id: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  clearAllData: () => Promise<void>;
  exportData: () => string;
}
const PocketDocContext = createContext<PocketDocContextValue | null>(null);

export function PocketDocProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot());
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<LocalSaveStatus>("idle");
  const snapshotRef = useRef(snapshot);
  const saveSequenceRef = useRef(0);
  const commit = useCallback(async (next: AppSnapshot) => {
    const sequence = ++saveSequenceRef.current;
    setSaveStatus("saving");
    snapshotRef.current = next;
    setSnapshot(next);
    try {
      await localStore.save(next);
      if (saveSequenceRef.current === sequence) setSaveStatus("saved");
    } catch (error) {
      if (saveSequenceRef.current === sequence) setSaveStatus("error");
      throw error;
    }
  }, []);
  useEffect(() => {
    let live = true;
    void (async () => {
      const stored = await localStore.load();
      const initial = stored ?? createSeedSnapshot();
      if (!live) return;
      snapshotRef.current = initial; setSnapshot(initial); setReady(true);
      if (!stored) {
        const sequence = ++saveSequenceRef.current;
        setSaveStatus("saving");
        try {
          await localStore.save(initial);
          if (live && saveSequenceRef.current === sequence) setSaveStatus("saved");
        } catch {
          if (live && saveSequenceRef.current === sequence) setSaveStatus("error");
        }
      }
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timeout = window.setTimeout(() => setSaveStatus("idle"), 2800);
    return () => window.clearTimeout(timeout);
  }, [saveStatus]);
  const upsert = useCallback(async <K extends DatabaseTable>(table: K, item: Database[K][number]) => {
    const current = snapshotRef.current;
    const rows = current.data[table] as Array<{ id: string }>;
    const nextRows = rows.some(row => row.id === (item as { id: string }).id)
      ? rows.map(row => row.id === (item as { id: string }).id ? item as { id: string } : row)
      : [...rows, item as { id: string }];
    await commit({ ...current, data: { ...current.data, [table]: nextRows } as Database });
  }, [commit]);
  const remove = useCallback(async <K extends DatabaseTable>(table: K, id: string) => {
    const current = snapshotRef.current;
    const rows = current.data[table] as Array<{ id: string }>;
    await commit({ ...current, data: { ...current.data, [table]: rows.filter(row => row.id !== id) } as Database });
  }, [commit]);
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    await commit({ ...snapshotRef.current, settings: { ...snapshotRef.current.settings, ...patch } });
  }, [commit]);
  const clearAllData = useCallback(async () => { await commit(emptySnapshot()); }, [commit]);
  const exportData = useCallback(() => JSON.stringify({ exported_at: new Date().toISOString(), ...snapshotRef.current }, null, 2), []);
  return <PocketDocContext.Provider value={{ snapshot, ready, saveStatus, upsert, remove, updateSettings, clearAllData, exportData }}>{children}</PocketDocContext.Provider>;
}
export function usePocketDoc() {
  const value = useContext(PocketDocContext);
  if (!value) throw new Error("usePocketDoc must be used inside PocketDocProvider");
  return value;
}
