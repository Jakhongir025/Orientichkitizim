"use client";
import { useEffect, useState } from "react";
import { api, today } from "./ui";
export function AttendanceReportButton() {
  const [allowed, setAllowed] = useState(false),
    [day, setDay] = useState(today),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api<{ allowed: boolean }>("attendance/report-options")
      .then((r) => {
        if (active) setAllowed(r.allowed);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!allowed) return null;
  return (
    <section className="mini-card">
      <h3>Kunlik davomat PDF hisoboti</h3>
      <p>
        Barcha ofislar bo‘yicha hisobot shaxsiy Telegram chattingizga
        yuboriladi.
      </p>
      <form
        className="filters"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await api("attendance/send-report", "POST", {
              date: day,
              requestId: crypto.randomUUID(),
            });
            setMessage("PDF Telegramga yuborish navbatiga qo‘shildi");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Sana (Toshkent vaqti)
          <input
            type="date"
            value={day}
            max={today()}
            required
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? "Tayyorlanmoqda…" : "Davomat PDFini so‘rash"}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
