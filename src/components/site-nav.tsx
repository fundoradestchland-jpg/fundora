"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { LogoutButton } from "@/components/logout-button";

type SessionUser = {
  role: "admin" | "applicant";
  user: string;
};

export function SiteNav({ current }: { current?: "home" | "pret" | "dons" | "dashboard" | "admin" }) {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const refreshSession = useCallback(async () => {
    setCheckingSession(true);
    setSessionError("");
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) {
        setSession(null);
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "La vérification de session est indisponible.");
      setSession(result.user as SessionUser | null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "La vérification de session est indisponible.");
      setSession(null);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refreshSession());
    window.addEventListener("fundora-session-updated", refreshSession);
    window.addEventListener("storage", refreshSession);
    return () => {
      window.removeEventListener("fundora-session-updated", refreshSession);
      window.removeEventListener("storage", refreshSession);
    };
  }, [refreshSession]);

  const accountHref = session?.role === "admin" ? "/admin/dossiers" : session ? `/dashboard/${session.user}` : "/login";

  return (
    <nav className="topbar" aria-label="Navigation principale">
      <Link href="/" className="brand" aria-label="Fundora">
        <BrandGlyph />
      </Link>
      <div className="nav-links">
        <Link href="/" aria-current={current === "home" ? "page" : undefined}>Accueil</Link>
        <Link href="/pret" aria-current={current === "pret" ? "page" : undefined}>Prêts</Link>
        <Link href="/dons" aria-current={current === "dons" ? "page" : undefined}>Dons</Link>
        <Link href={accountHref} aria-current={current === "dashboard" || current === "admin" ? "page" : undefined}>
          {checkingSession ? "Compte" : session?.role === "applicant" ? "Dashboard" : session?.role === "admin" ? "Administration" : "Connexion"}
        </Link>
      </div>
      {session ? (
        <LogoutButton />
      ) : checkingSession ? (
        <span className="nav-button" aria-live="polite">Vérification…</span>
      ) : (
        <Link href="/login" className="nav-button">Créer un compte</Link>
      )}
      {sessionError ? <span className="form-error" role="status">{sessionError}</span> : null}
    </nav>
  );
}
