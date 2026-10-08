"use client";

import { useCallback, useEffect, useState } from "react";
import type { FundoraRequest } from "@/lib/fundora-requests";

export async function createApplication(input: {
  kind: "Don" | "Prêt";
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  subject: string;
  amountRequested: string;
  details: string;
  documents: Array<{ id: string; name: string; size: number; dataUrl: string; documentType?: string }>;
}) {
  const response = await fetch("/api/applications", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Enregistrement impossible.");
  return result as { id: string };
}

export function useFundoraRequests() {
  const [requests, setRequests] = useState<FundoraRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/applications", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Lecture des demandes impossible.");
    setRequests(result as FundoraRequest[]);
    setError("");
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/applications", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Lecture des demandes impossible.");
        if (active) {
          setRequests(result as FundoraRequest[]);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Lecture des demandes impossible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const mutate = async (id: string, operation: string, values: Record<string, unknown>) => {
    const response = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, ...values }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error ?? `Mise à jour impossible (erreur ${response.status}).`);
    try {
      await refresh();
    } catch {
      throw new Error("La mise à jour a été enregistrée, mais la liste n’a pas pu être actualisée. Rechargez la page avant de réessayer.");
    }
  };

  return { requests, loading, error, refresh, mutate };
}