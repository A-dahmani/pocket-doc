import { useEffect, useState } from "react";
import { Router, Route } from "wouter";
import { PocketDocProvider, usePocketDoc } from "@/contexts/PocketDocContext";
import PocketDocApp from "@/pages/PocketDocApp";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import "./index.css";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsAuthed(!!token);
    setIsChecking(false);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="boot-screen">
          <div className="brand-mark">✳</div>
          <span>Pocket Doc</span>
          <div className="loading-line" />
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}

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

  if (!ready)
    return (
      <div className="boot-screen">
        <div className="brand-mark">✳</div>
        <span>Pocket Doc</span>
        <div className="loading-line" />
      </div>
    );

  return (
    <Router>
      <Route path="/login" component={Login} />
      <Route path="/admin" >
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      </Route>
      <Route path="/" >
        <ProtectedRoute>
          <PocketDocApp 
            welcomeOpen={showWelcome} 
            onWelcomeClose={async () => {
              await updateSettings({ disclaimerAccepted: true });
              setShowWelcome(false);
            }} 
          />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Router>
  );
}

export default function App() {
  return (
    <PocketDocProvider>
      <AppContent />
    </PocketDocProvider>
  );
}
