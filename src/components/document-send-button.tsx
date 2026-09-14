"use client";
import { useState } from "react";
import { api, Modal } from "./ui";
import type { ReportAudience } from "@/modules/documents/audience";
const labels: Record<ReportAudience, string> = {
  SELF: "Faqat o‘zimga",
  SELF_EMPLOYEES: "O‘zimga va xodimlarga",
  ALL: "Hammaga",
};
export function DocumentSendButton({ documentId }: { documentId?: string }) {
  const [options, setOptions] = useState<ReportAudience[] | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function open() {
    setBusy(true);
    setMessage("");
    try {
      setOptions(await api<ReportAudience[]>("documents/send-options"));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(audience: ReportAudience) {
    setBusy(true);
    setMessage("");
    try {
      const r = await api<{ queued: number }>(
        `documents/${documentId ? "send-reminders" : "send-summary"}`,
        "POST",
        {
          ...(documentId ? { documentId } : {}),
          audience,
          requestId: crypto.randomUUID(),
        },
      );
      setMessage(
        r.queued
          ? `${r.queued} foydalanuvchiga yuborish navbatiga qo‘shildi`
          : "Mos hujjat yoki ulangan Telegram hisobi topilmadi",
      );
      setOptions(null);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={documentId ? "text-button" : "button primary"}
        disabled={busy}
        onClick={() => void open()}
      >
        {documentId
          ? "Telegramga matn va PDF yuborish"
          : "Muddati tugayotganlarni umumiy yuborish"}
      </button>
      {message && <p role="status">{message}</p>}
      {options && (
        <Modal
          title="Hisobot kimga yuborilsin?"
          onClose={() => {
            if (!busy) setOptions(null);
          }}
        >
          <p>Faqat Telegram hisobi ulangan faol foydalanuvchilar oladi.</p>
          <div className="fleet-status-buttons">
            {options.map((o) => (
              <button
                key={o}
                className="button secondary"
                disabled={busy}
                onClick={() => void send(o)}
              >
                {labels[o]}
              </button>
            ))}
          </div>
          {!options.length && <p>Yuborishga ruxsat yo‘q.</p>}
        </Modal>
      )}
    </>
  );
}
