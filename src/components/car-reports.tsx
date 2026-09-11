"use client";
import { useEffect, useState } from "react";
import { api, today } from "./ui";
import type { CarReport } from "@/modules/car-reports/service";
export function CarReports({ carId }: { carId: string }) {
  const [period, setPeriod] = useState("MONTH"),
    [day, setDay] = useState(today()),
    [format, setFormat] = useState("TEXT");
  const [report, setReport] = useState<CarReport | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ format: string }>("car-reports/preferences")
      .then((v) => setFormat(v.format))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    setReport(null);
    setMessage("");
  }, [carId, period, day]);
  const input = { carId, date: day, period, format };
  async function run(action: "view" | "download" | "send" | "preferences") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const query = new URLSearchParams({ carId, date: day, period });
      if (action === "view")
        setReport(await api<CarReport>(`car-reports?${query}`));
      if (action === "send") {
        await api("car-reports/send", "POST", {
          ...input,
          requestId: crypto.randomUUID(),
        });
        setMessage("Telegramga yuborish navbatiga qo‘shildi");
      }
      if (action === "preferences") {
        await api("car-reports/preferences", "PATCH", { format });
        setMessage("Oylik avtomatik hisobot formati saqlandi");
      }
      if (action === "download") {
        const file = await api<{ pdf: string; filename: string }>(
          `car-reports?${query}&format=PDF`,
        );
        const blob = new Blob(
          [Uint8Array.from(atob(file.pdf), (c) => c.charCodeAt(0))],
          { type: "application/pdf" },
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card">
      <h2>Avtomobil hisoboti</h2>
      <p>
        Kun, hafta yoki oyni tanlang. Oylik avtomatik hisobot keyingi oyning
        1-kuni soat 08:00 dan keyin, Toshkent vaqti bilan yuboriladi.
      </p>
      <div className="form-grid">
        <label className="field">
          Davr
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="DAY">Kunlik</option>
            <option value="WEEK">Haftalik (dushanba-yakshanba)</option>
            <option value="MONTH">Oylik</option>
          </select>
        </label>
        <label className="field">
          Davr ichidagi sana
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Telegram formati
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="TEXT">Matn</option>
            <option value="PDF">PDF fayl</option>
          </select>
        </label>
      </div>
      <div className="inline-actions">
        <button
          className="primary"
          disabled={busy || !day || !carId}
          onClick={() => run("view")}
        >
          Tezkor hisobotni ko‘rish
        </button>
        <button
          className="secondary"
          disabled={busy || !day || !carId}
          onClick={() => run("send")}
        >
          Telegramga yuborish
        </button>
        <button
          className="secondary"
          disabled={busy || !day || !carId}
          onClick={() => run("download")}
        >
          PDF yuklash
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => run("preferences")}
        >
          Oylik formatni saqlash
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {report && (
        <article>
          <h3>
            {report.title} · {report.plate}
          </h3>
          <p>{report.period}</p>
          <div
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              lineHeight: 1.8,
            }}
          >
            {report.lines.join("\n")}
          </div>
        </article>
      )}
    </section>
  );
}
