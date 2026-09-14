"use client";
import { formatInTimeZone } from "date-fns-tz";
import { useState } from "react";
import { api, Modal } from "./ui";
export function AttendanceForm({
  mode,
  onClose,
  onSaved,
}: {
  mode: "in" | "out";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [timezone] = useState(() => "Asia/Tashkent");
  const [time, setTime] = useState(() =>
    formatInTimeZone(new Date(), timezone, "HH:mm"),
  );
  const [date, setDate] = useState(() =>
    formatInTimeZone(new Date(), timezone, "yyyy-MM-dd"),
  );
  const [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const early = mode === "out" && time < "22:00";
  const late = mode === "in" && time > "10:00";
  return (
    <Modal
      title={mode === "in" ? "Ishga kelish vaqti" : "Ishdan ketish vaqti"}
      onClose={onClose}
    >
      <form
        method="post"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(`attendance/check-${mode}`, "POST", {
              date,
              time,
              timezone,
              ...(late ? { lateReason: reason } : {}),
              ...(early ? { earlyLeaveReason: reason } : {}),
            });
            onSaved();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="modal-description">
          {mode === "in" ? "Haqiqiy kelgan" : "Haqiqiy ketgan"} vaqtingizni
          kiriting.
        </p>
        <div className="form-grid">
          <label className="field">
            Sana
            <input
              type="date"
              value={date}
              max={formatInTimeZone(new Date(), timezone, "yyyy-MM-dd")}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            {mode === "in" ? "Kelgan vaqtingiz" : "Ketgan vaqtingiz"}
            <input
              type="time"
              value={time}
              onInput={(e) => setTime(e.currentTarget.value)}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </label>
        </div>
        <p className="timezone-note">
          Toshkent vaqt zonasi: <strong>{timezone}</strong>
        </p>
        {(late || early) && (
          <label className="field">
            {early
              ? "Erta ketish sababi (majburiy)"
              : "Kechikish sababi (majburiy)"}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={3}
              maxLength={1000}
            />
          </label>
        )}
        {mode === "in" && !late && (
          <p className="success">
            10:00 yoki undan oldin — sabab talab qilinmaydi.
          </p>
        )}
        {mode === "out" && !early && (
          <p className="success">
            22:00 yoki undan keyin — sabab talab qilinmaydi.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saqlanmoqda…" : "Vaqtni saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
