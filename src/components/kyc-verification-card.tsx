"use client";

import { useMemo } from "react";
import { useFundoraRequests } from "@/lib/request-api";

export function KycVerificationCard() {
  const { requests, loading, error } = useFundoraRequests();

  const verification = useMemo(() => {
    const requestsWithDocuments = requests.filter((request) => request.documents.length > 0);
    if (requestsWithDocuments.length === 0) {
      return {
        progress: 20,
        status: "À compléter",
        description: requests.length === 0
          ? "Déposez une demande et transmettez vos documents."
          : "Transmettez les documents demandés pour poursuivre la vérification.",
      };
    }

    if (requests.some((request) => request.status === "Validée")) {
      return {
        progress: 100,
        status: "Compte vérifié",
        description: "Votre dossier et vos documents ont été validés par l’administration.",
      };
    }

    if (requestsWithDocuments.some((request) => request.documents.some((document) => document.status === "À corriger"))) {
      return {
        progress: 40,
        status: "Documents à corriger",
        description: "Consultez les remarques de l’administration et renvoyez les pièces corrigées.",
      };
    }

    if (requestsWithDocuments.some((request) => request.documents.every((document) => document.status === "Validé"))) {
      return {
        progress: 80,
        status: "Validation du dossier",
        description: "Vos documents sont validés. La demande attend la décision de l’administration.",
      };
    }

    return {
      progress: 60,
      status: "Vérification en cours",
      description: "Vos documents ont été transmis et attendent leur examen.",
    };
  }, [requests]);

  return (
    <section className="sidebar-card kyc-verification-card" aria-labelledby="kyc-verification-title">
      <span>Protection</span>
      <strong id="kyc-verification-title">Vérification KYC</strong>
      {loading ? (
        <small>Chargement de l’état de vérification…</small>
      ) : error ? (
        <small role="alert">État de vérification indisponible : {error}</small>
      ) : (
        <>
          <div
            className="kyc-progress-track"
            role="progressbar"
            aria-label="Progression de la vérification du compte"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={verification.progress}
          >
            <span style={{ width: `${verification.progress}%` }} />
          </div>
          <small>{verification.progress}% · {verification.status}</small>
          <p>{verification.description}</p>
        </>
      )}
    </section>
  );
}
