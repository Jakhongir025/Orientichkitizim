"use client";
import { uzLabel } from "@/lib/uzbek";
import { RecordActions } from "./record-actions";
import { useEffect, useState } from "react";
import type { Lookups, Sheet } from "./types";
import { api, Badge, Field, formatDate, Modal } from "./ui";
export function SettingsPanel({
  lookup,
  refresh,
}: {
  lookup: Lookups;
  refresh: () => void;
}) {
  const [sheets, setSheets] = useState<Sheet[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [sheetForm, setSheetForm] = useState<Sheet | true | null>(null),
    [busy, setBusy] = useState(false),
    [intervals, setIntervals] = useState("7,3,1,0"),
    [defaultSheetId, setDefaultSheetId] = useState("");
  const load = () => {
    api<Sheet[]>("google-sheets")
      .then(setSheets)
      .catch((e) => setError(e.message));
    api<{ intervals: number[]; defaultSheetId: string }>("settings")
      .then((v) => {
        setIntervals(v.intervals.join(","));
        setDefaultSheetId(v.defaultSheetId);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  async function perform(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage("Muvaffaqiyatli saqlandi");
      refresh();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const defaultMapping = {
    sourceId: 0,
    plate: 1,
    customerName: 2,
    phone: 3,
    passport: 4,
    passportDetails: 5,
    rentalStart: 6,
    rentalEnd: 7,
    contractNumber: 8,
    issuedBy: 9,
    acceptedBy: 10,
    notes: 11,
  };
  return (
    <>
      {error && <div className="error">{error}</div>}
      {message && (
        <div className="success" role="status">
          {message}
        </div>
      )}
      <div className="settings-grid">
        <section className="panel settings-card">
          <h2>Google Sheets</h2>
          <p>
            Ijara ma’lumotlarini bazaga sinxronlash. Maxfiy kalitlar server
            konfiguratsiyasida saqlanadi.
          </p>
          {sheets.map((s) => (
            <div className="sheet-row" key={s.id}>
              <h3>{s.name}</h3>
              <Badge value={s.syncStatus} />
              <p>{s.range}</p>
              <small>
                Oxirgi sinxronlash: {formatDate(s.lastSyncAt, true)} ·{" "}
                {s.importedCount} ta yozuv
              </small>
              {s.lastError && <p className="error">{s.lastError}</p>}
              <div className="inline-actions">
                <button className="secondary" onClick={() => setSheetForm(s)}>
                  Tahrirlash
                </button>
                <RecordActions
                  resource="google-sheets"
                  record={s}
                  deleteOnly
                  onSaved={refresh}
                />
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    perform(() =>
                      api("google-sheets/sync", "POST", { configId: s.id }),
                    )
                  }
                >
                  Hozir sinxronlash
                </button>
              </div>
            </div>
          ))}
          <button className="secondary" onClick={() => setSheetForm(true)}>
            + Ulanish qo‘shish
          </button>
        </section>
        <section className="panel settings-card">
          <h2>Bildirishnoma muddatlari</h2>
          <p>
            Hujjat muddati tugashidan necha kun oldin xabar yuborilsin? 0 —
            tugash kuni.
          </p>
          <form
            method="post"
            onSubmit={(e) => {
              e.preventDefault();
              perform(() =>
                api("settings/intervals", "POST", {
                  intervals: intervals.split(",").map((v) => Number(v.trim())),
                }),
              );
            }}
          >
            <label className="field">
              Kunlar (vergul bilan)
              <input
                value={intervals}
                onChange={(e) => setIntervals(e.target.value)}
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              Saqlash
            </button>
          </form>
          <h3 className="mt">Shaxsiy Telegram ulanishi</h3>
          <p>
            Avval Super Admin profilingizga Telegram foydalanuvchi ID raqami
            kiritsin. Ulanish kodi 10 daqiqa amal qiladi; uni aynan o‘sha
            Telegram hisobidan kompaniya botiga yuboring.
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              try {
                const result = await api<{ instruction: string }>(
                  "telegram/connect",
                  "POST",
                  {},
                );
                setMessage(result.instruction);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Telegramni ulash
          </button>
        </section>
        {[
          {
            title: "Servis turlari",
            key: "service-types",
            rows: lookup.serviceTypes,
          },
          {
            title: "Hujjat turlari",
            key: "document-types",
            rows: lookup.documentTypes,
          },
        ].map((group) => (
          <section className="panel settings-card" key={group.key}>
            <h2>{group.title}</h2>
            <div className="type-chips">
              {group.rows.map((t) => (
                <span key={t.id}>
                  {uzLabel(t.name)}
                  <RecordActions
                    resource={group.key}
                    record={t}
                    onSaved={refresh}
                  />
                </span>
              ))}
            </div>
            <form
              method="post"
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = Object.fromEntries(new FormData(form));
                perform(async () => {
                  await api(`settings/${group.key}`, "POST", data);
                  form.reset();
                });
              }}
            >
              <input
                name="name"
                aria-label="Yangi tur nomi"
                placeholder="Yangi tur nomi"
                required
                minLength={2}
              />
              <button className="primary" disabled={busy}>
                Qo‘shish
              </button>
            </form>
          </section>
        ))}
        <section className="panel settings-card">
          <h2>Yangi ofis qo‘shish</h2>
          <p>
            Xodimlarni shu ofisga Xodimlar bo‘limidan biriktiring. 10:10 da qayd
            qilmagan xodimlar haqida rahbarga xabar yuboriladi (Toshkent vaqti).
          </p>
          <form
            method="post"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = Object.fromEntries(new FormData(form));
              void perform(async () => {
                await api("settings/office", "POST", {
                  ...data,
                  telegramChatId: data.telegramChatId || null,
                });
                form.reset();
              });
            }}
          >
            <Field label="Yangi ofis nomi" name="name" required />
            <Field
              label="Rahbar Telegram chat ID raqami yoki guruh ID"
              name="telegramChatId"
            />
            <p>
              Bo‘sh bo‘lsa, umumiy rahbar chat IDsi ishlatiladi. Shaxsiy xabar
              uchun rahbar botga /start yuborgan bo‘lishi kerak.
            </p>
            <button className="primary" disabled={busy}>
              Ofis qo‘shish
            </button>
          </form>
        </section>
        {lookup.offices.map((o) => (
          <section className="panel settings-card" key={o.id}>
            <h2>{uzLabel(o.name)}</h2>
            <RecordActions
              resource="offices"
              record={o}
              deleteOnly
              onSaved={refresh}
            />
            <p>10:10 davomat va ish kuni yakuni ushbu chatga yuboriladi.</p>
            <form
              method="post"
              onSubmit={(e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.currentTarget));
                perform(() =>
                  api(`settings/office/${o.id}`, "PATCH", {
                    ...d,
                    telegramChatId: d.telegramChatId || null,
                  }),
                );
              }}
            >
              <Field
                label="Ofis nomi"
                name="name"
                value={uzLabel(o.name)}
                required
              />
              <Field
                label="Rahbar Telegram chat ID raqami yoki guruh ID"
                name="telegramChatId"
                value={o.telegramChatId || ""}
              />
              <button className="primary" disabled={busy}>
                Saqlash
              </button>
            </form>
          </section>
        ))}
      </div>
      {sheetForm && (
        <Modal
          title="Google Sheets ulanishi"
          onClose={() => setSheetForm(null)}
        >
          <form
            method="post"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              try {
                const data = {
                  name: form.get("name"),
                  sheetId: form.get("sheetId"),
                  range: form.get("range"),
                  mapping: JSON.parse(String(form.get("mapping"))),
                  enabled: form.get("enabled") === "on",
                };
                setBusy(true);
                await api(
                  `google-sheets${sheetForm !== true ? `/${sheetForm.id}` : ""}`,
                  sheetForm === true ? "POST" : "PATCH",
                  data,
                );
                setSheetForm(null);
                load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              label="Ulanish nomi"
              name="name"
              value={sheetForm === true ? "Ijara jadvali" : sheetForm.name}
              required
            />
            <Field
              label="Google jadvali ID raqami"
              name="sheetId"
              value={sheetForm === true ? defaultSheetId : sheetForm.sheetId}
              required
            />
            <Field
              label="Kataklar oralig‘i (sarlavhasiz, masalan Rentals!A2:L)"
              name="range"
              value={sheetForm === true ? "Rentals!A2:L" : sheetForm.range}
              required
            />
            <label className="field">
              Ustunlarni moslashtirish (0 dan boshlanadi)
              <textarea
                className="code-input"
                name="mapping"
                rows={12}
                defaultValue={JSON.stringify(
                  sheetForm === true ? defaultMapping : sheetForm.mapping,
                  null,
                  2,
                )}
                required
              />
            </label>
            <p className="modal-description">
              Sanalar timezone bilan ISO formatda bo‘lsin:
              2026-09-06T10:00:00+05:00. sourceId noyob va o‘zgarmas bo‘lishi
              kerak.
            </p>
            <label className="checkbox">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={sheetForm === true ? true : sheetForm.enabled}
              />{" "}
              Faol
            </label>
            {error && <div className="error">{error}</div>}
            <div className="form-actions">
              <button className="primary" disabled={busy}>
                Saqlash
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
