"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type ChatContact = {
  id: string;
  name: string;
  email: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "admin" | "applicant";
  message: string;
  created_at: string;
};

type ChatResponse = {
  contacts: ChatContact[];
  messages: ChatMessage[];
};

export function SupportChat({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScrolledMessageRef = useRef("");

  const loadConversation = useCallback(async () => {
    const query = isAdmin && selectedContactId
      ? `?applicantId=${encodeURIComponent(selectedContactId)}`
      : "";
    const response = await fetch(`/api/support-chat${query}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Chargement de la messagerie impossible.");
    const data = result as ChatResponse;
    if (isAdmin) setContacts(data.contacts);
    setMessages(data.messages);
    setError("");
  }, [isAdmin, selectedContactId]);

  useEffect(() => {
    if (!isOpen && !isAdmin) return;
    let active = true;
    if (!isOpen) {
      const loadContacts = async () => {
        try {
          const response = await fetch("/api/support-chat", { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? "Chargement des conversations impossible.");
          if (active) setContacts((result as ChatResponse).contacts);
        } catch (reason) {
          if (active) setError(reason instanceof Error ? reason.message : "Chargement des conversations impossible.");
        }
      };
      void loadContacts();
      const interval = window.setInterval(() => void loadContacts(), 20_000);
      return () => {
        active = false;
        window.clearInterval(interval);
      };
    }

    const load = async () => {
      try {
        await loadConversation();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Chargement de la messagerie impossible.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => {
      void loadConversation().catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Actualisation de la messagerie impossible.");
      });
    }, 8_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isOpen, isAdmin, loadConversation]);

  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?.id ?? "";
    if (isOpen && lastMessageId && lastScrolledMessageRef.current !== lastMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      lastScrolledMessageRef.current = lastMessageId;
    }
  }, [messages, isOpen]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending || (isAdmin && !selectedContactId)) return;

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/support-chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, ...(isAdmin ? { applicantId: selectedContactId } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Envoi du message impossible.");
      setMessages((current) => [...current, result.message as ChatMessage]);
      setDraft("");
      await loadConversation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Envoi du message impossible.");
    } finally {
      setSending(false);
    }
  };

  const unreadCount = contacts.reduce((count, contact) => count + Number(contact.unread_count), 0);
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId);

  return (
    <div className="support-chat">
      {isOpen && (
        <section className="support-chat-window" aria-label="Messagerie Fundora">
          <header className="support-chat-header">
            <div>
              <strong>{isAdmin ? "Messagerie équipe" : "Contacter l’équipe Fundora"}</strong>
              <span>{isAdmin ? "Répondez aux demandeurs ou écrivez-leur." : "Échangez avec notre équipe au sujet de votre demande."}</span>
            </div>
            <button type="button" className="support-chat-close" onClick={() => setIsOpen(false)} aria-label="Fermer la messagerie">×</button>
          </header>

          {isAdmin && (
            <label className="support-chat-contact">
              <span>Demandeur</span>
              <select value={selectedContactId} onChange={(event) => setSelectedContactId(event.target.value)}>
                <option value="">Choisir un demandeur</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} · {contact.email}{Number(contact.unread_count) ? ` · ${contact.unread_count} nouveau(x)` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isAdmin && selectedContact && (
            <div className="support-chat-selected-contact">{selectedContact.name} · {selectedContact.email}</div>
          )}

          <div className="support-chat-messages" aria-live="polite">
            {loading ? (
              <p className="support-chat-empty">Chargement des messages…</p>
            ) : isAdmin && !selectedContactId ? (
              <p className="support-chat-empty">
                {contacts.length ? "Choisissez un demandeur pour lire la conversation ou lui écrire." : "Aucun compte demandeur n’est disponible."}
              </p>
            ) : messages.length === 0 ? (
              <p className="support-chat-empty">
                {isAdmin ? "Aucun message pour l’instant. Vous pouvez écrire au demandeur." : "Vous pouvez écrire votre premier message à l’équipe."}
              </p>
            ) : messages.map((item) => {
              const mine = item.sender_role === (isAdmin ? "admin" : "applicant");
              return (
                <article className={`support-chat-message ${mine ? "mine" : "theirs"}`} key={item.id}>
                  <span>{mine ? (isAdmin ? "Équipe Fundora" : "Vous") : (isAdmin ? item.sender_name : "Équipe Fundora")}</span>
                  <p>{item.message}</p>
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</time>
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {error && <p className="support-chat-error" role="alert">{error}</p>}

          <form className="support-chat-compose" onSubmit={sendMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              rows={2}
              placeholder={isAdmin ? "Écrire en tant que l’équipe…" : "Décrivez votre question ou votre souci…"}
              aria-label="Votre message"
              disabled={isAdmin && !selectedContactId}
            />
            <div>
              <small>{draft.length}/2000</small>
              <button type="submit" disabled={sending || !draft.trim() || (isAdmin && !selectedContactId)}>
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        className="support-chat-toggle"
        type="button"
        onClick={() => {
          if (!isOpen) setLoading(true);
          setIsOpen((open) => !open);
        }}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fermer la messagerie" : "Ouvrir la messagerie"}
      >
        <span aria-hidden="true">✉</span>
        <span>{isOpen ? "Fermer" : "Chat"}</span>
        {isAdmin && unreadCount > 0 && <strong className="support-chat-unread">{unreadCount > 9 ? "9+" : unreadCount}</strong>}
      </button>
    </div>
  );
}
