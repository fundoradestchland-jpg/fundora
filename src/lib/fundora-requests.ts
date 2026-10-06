export type RequestKind = "Don" | "Prêt";
export type ReviewStatus = "En attente" | "Validée" | "Refusée";
export type DocumentStatus = "À vérifier" | "Validé" | "À corriger";
export type TaskStatus = "À faire" | "Envoyé" | "Validé" | "À corriger";

export type RequestDocument = {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  status: DocumentStatus;
  note: string;
};

export type PublishedTask = {
  id: string;
  title: string;
  instructions: string;
  fee: number;
  fileName: string;
  fileDataUrl: string;
  status: TaskStatus;
  reviewNote: string;
  responseFileName: string;
  responseDataUrl: string;
};

export type FundoraRequest = {
  id: string;
  kind: RequestKind;
  createdAt: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  subject: string;
  amountRequested: string;
  details: string;
  documents: RequestDocument[];
  status: ReviewStatus;
  reviewNote: string;
  approvedAmount: string;
  tasks: PublishedTask[];
};

const storageKey = "fundora_requests";
const maxFileSize = 400_000;

export function subscribeToRequestUpdates(callback: () => void) {
  window.addEventListener("fundora-requests-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("fundora-requests-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

export function getRequestSnapshot() {
  return window.localStorage.getItem(storageKey) ?? "[]";
}

export function getServerRequestSnapshot() {
  return "[]";
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readRequests(): FundoraRequest[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as FundoraRequest[]) : [];
  } catch {
    return [];
  }
}

export function writeRequests(requests: FundoraRequest[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(requests));
  window.dispatchEvent(new Event("fundora-requests-updated"));
}

export function upsertRequest(request: FundoraRequest) {
  const requests = readRequests();
  const index = requests.findIndex((item) => item.id === request.id);

  if (index === -1) requests.unshift(request);
  else requests[index] = request;

  writeRequests(requests);
}

export async function serializeFiles(files: FileList | File[]): Promise<RequestDocument[]> {
  return Promise.all(
    Array.from(files).map(async (file) => {
      if (file.size > maxFileSize) {
        throw new Error(`${file.name} dépasse la limite de 400 Ko.`);
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Impossible de lire ${file.name}.`));
        reader.readAsDataURL(file);
      });

      return {
        id: createId(),
        name: file.name,
        size: file.size,
        dataUrl,
        status: "À vérifier" as const,
        note: "",
      };
    })
  );
}