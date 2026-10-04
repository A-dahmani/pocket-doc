import { useEffect, useState } from "react";
import { PocketDocProvider, usePocketDoc } from "@/contexts/PocketDocContext";
import PocketDocApp from "@/pages/PocketDocApp";
import "./index.css";

function AppContent() {
  const { snapshot, ready, updateSettings } = usePocketDoc();
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (ready) setShowWelcome(!snapshot.settings.disclaimerAccepted);
  }, [ready, snapshot.settings.disclaimerAccepted]);
  useEffect(() => {
    document.documentElement.lang = snapshot.settings.locale;
    document.documentElement.dir = snapshot.settings.locale === "ar" ? "rtl" : "ltr";
  }, [snapshot.settings.locale]);
  if (!ready) return <div className="boot-screen"><div className="brand-mark">✳</div><span>Pocket Doc</span><div className="loading-line" /></div>;
  return <PocketDocApp welcomeOpen={showWelcome} onWelcomeClose={async () => { await updateSettings({ disclaimerAccepted: true }); setShowWelcome(false); }} />;
}
export default function App() {
  return <PocketDocProvider><AppContent /></PocketDocProvider>;
}
