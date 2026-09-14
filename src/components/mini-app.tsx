"use client";
import { RentalSearch } from "./rental-search";
import { CarProfile } from "./car-profile";
import type { Car } from "./types";
import { AttendanceReportButton } from "./attendance-report-button";
import { DaysOff } from "./days-off";
import { uzLabel } from "@/lib/uzbek";
import { Modal } from "./ui";
import { Records } from "./records";
import { FleetStatus } from "./fleet-status";
import { RentCarBrand } from "./rentcar-brand";
import { LayoutDashboard, CarFront, Bell, FileText } from "lucide-react";
import { CarReports } from "./car-reports";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { AttendanceForm } from "./attendance-form";
import { RecordForm } from "./record-form";
import { api, Badge, clock, fullName, Loading, setMiniSession } from "./ui";
import type { DashboardData, Document, Lookups, User } from "./types";

type TelegramApp = {
  initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
  };
};
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramApp };
  }
}
export function MiniApp({ nonce }: { nonce?: string }) {
  const started = useRef(false);
  const viewportRef = useRef<HTMLElement>(null);
  const [activeCar, setActiveCar] = useState<string | null>(null);
  const [documentForm, setDocumentForm] = useState<Document | true | null>(
    null,
  );
  const [typeForm, setTypeForm] = useState(false);
  const [typeBusy, setTypeBusy] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const root = viewportRef.current;
      if (!root) return;
      root.style.setProperty(
        "--mini-viewport-height",
        `${viewport?.height || window.innerHeight}px`,
      );
      root.style.setProperty(
        "--mini-viewport-top",
        `${viewport?.offsetTop || 0}px`,
      );
      const typing = document.activeElement?.matches("input,textarea,select");
      root.dataset.keyboard =
        typing &&
        window.innerHeight - (viewport?.height || window.innerHeight) > 120
          ? "open"
          : "closed";
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  const [loginBusy, setLoginBusy] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [loginReady, setLoginReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Telegram yuklanmoqda…");
  const [modal, setModal] = useState<
    "in" | "out" | "report" | "service" | null
  >(null);
  const [tab, setTab] = useState<
    | "today"
    | "cars"
    | "notifications"
    | "reports"
    | "car-status"
    | "rentals"
    | "documents"
  >("today");
  const [reportCarId, setReportCarId] = useState("");
  const [search, setSearch] = useState("");
  const [noticeRevision, setNoticeRevision] = useState(0);
  const [message, setMessage] = useState("");
  const refresh = async () => {
    setNoticeRevision((v) => v + 1);
    try {
      const timezone = "Asia/Tashkent";
      setData(
        await api<DashboardData>(
          `dashboard?timezone=${encodeURIComponent(timezone)}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  async function start() {
    if (started.current) return;
    started.current = true;
    const telegram = window.Telegram?.WebApp;
    telegram?.ready();
    telegram?.expand();
    if (!telegram?.initData) {
      setStatus(
        "Mini Appni Telegram botidagi «RentCarni ochish» tugmasidan oching.",
      );
      return;
    }
    try {
      const result = await api<{ hasPin: boolean }>(
        "auth/telegram-pin-status",
        "POST",
        { initData: telegram.initData },
      );
      setPinMode(result.hasPin);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoginReady(true);
    setStatus("Hisobingizga kirish ma’lumotlarini kiriting.");
  }
  async function signIn(
    login: string,
    password: string,
    pin: string,
    newPin: string,
  ) {
    const telegram = window.Telegram?.WebApp;
    if (!telegram?.initData) {
      setError("Ilovani Telegram botidan oching.");
      return;
    }
    setLoginBusy(true);
    setError("");
    try {
      setStatus("Hisob tasdiqlanmoqda…");
      const session = await api<{ token: string }>(
        pinMode ? "auth/telegram-pin" : "auth/telegram",
        "POST",
        {
          initData: telegram.initData,
          ...(pinMode ? { pin } : { login, password, newPin }),
        },
      );
      setMiniSession(session.token);
      const [me, options] = await Promise.all([
        api<User>("me"),
        api<Lookups>("lookup"),
      ]);
      setUser(me);
      setLookups(options);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      setStatus(
        "Kirish amalga oshmadi. Ulanishni tekshirib, ilovani qayta oching.",
      );
    }
    setLoginBusy(false);
  }
  useEffect(() => {
    const back = () => {
      if (typeForm) {
        setTypeForm(false);
        return;
      }
      if (documentForm) {
        setDocumentForm(null);
        return;
      }
      if (modal) {
        setModal(null);
        return;
      }
      if (editingCar) {
        setEditingCar(null);
        return;
      }
      if (activeCar) {
        setActiveCar(null);
        return;
      }
      setTab("today");
    };
    const button = window.Telegram?.WebApp.BackButton;
    if (
      typeForm ||
      documentForm ||
      modal ||
      editingCar ||
      activeCar ||
      tab !== "today"
    )
      button?.show();
    else button?.hide();
    button?.onClick(back);
    return () => button?.offClick(back);
  }, [typeForm, documentForm, modal, editingCar, activeCar, tab, user]);
  const saved = () => {
    setMessage("Ma’lumot saqlandi");
    void refresh();
  };
  const can = (permission: string) =>
    permission === "*"
      ? user?.role.name === "SUPER_ADMIN"
      : user?.role.permissions.some((p) => p === "*" || p === permission);
  return (
    <main className="mini-app" ref={viewportRef}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => {
          void start();
        }}
        onError={() =>
          setError(
            "Telegram kutubxonasi yuklanmadi. Internetni tekshirib, Mini Appni qayta oching.",
          )
        }
      />
      <div className="mini-brandbar">
        <div className="brand">
          <RentCarBrand />
        </div>
        <span>XODIM KABINETI</span>
      </div>
      <header className="mini-header">
        <div>
          <small>ORIENTRENTCAR · XODIM KABINETI</small>
          <h1>{user ? fullName(user) : "OrientRentCar"}</h1>
        </div>
        {user && (
          <button
            className="secondary"
            onClick={async () => {
              try {
                await api("auth/logout", "POST");
                setMiniSession(null);
                setUser(null);
                setData(null);
                setStatus(
                  "Tizimdan chiqdingiz. Qayta kirish uchun Mini Appni yopib oching.",
                );
                window.Telegram?.WebApp.close();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Chiqish
          </button>
        )}
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!user ? (
        <section className="mini-card">
          <h2>Telegram orqali kirish</h2>
          <p>{status}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const values = new FormData(form);
              if (
                !pinMode &&
                values.get("newPin") !== values.get("confirmPin")
              ) {
                setError("PINlar bir xil emas");
                return;
              }
              void signIn(
                String(values.get("login") || ""),
                String(values.get("password") || ""),
                String(values.get("pin") || ""),
                String(values.get("newPin") || ""),
              ).then(() => form.reset());
            }}
          >
            {pinMode ? (
              <label className="field">
                4 xonali PIN
                <input
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  minLength={4}
                  maxLength={4}
                  autoComplete="off"
                  required
                />
              </label>
            ) : (
              <>
                <label className="field">
                  Login
                  <input
                    name="login"
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                    maxLength={60}
                  />
                </label>
                <label className="field">
                  Parol
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={72}
                  />
                </label>
                <label className="field">
                  4 xonali PIN o‘rnating
                  <input
                    name="newPin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    minLength={4}
                    maxLength={4}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="field">
                  PINni takrorlang
                  <input
                    name="confirmPin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    minLength={4}
                    maxLength={4}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            )}
            <button className="primary" disabled={!loginReady || loginBusy}>
              {loginBusy ? "Kirilmoqda…" : "Tizimga kirish"}
            </button>
          </form>
          {pinMode && (
            <button
              className="button secondary"
              onClick={() => {
                setPinMode(false);
                setError("");
              }}
            >
              PINni unutdim — login/parol bilan kirish
            </button>
          )}
          <p>
            Administrator bergan login va paroldan foydalaning. Telegram ID
            hisobingizga oldindan kiritilgan bo‘lishi kerak.
          </p>
          <a href="/login" target="_blank" rel="noopener noreferrer">
            Saytga kirish ↗
          </a>
        </section>
      ) : (
        <>
          <nav className="mini-tabs" aria-label="Mini App bo‘limlari">
            {(
              [
                ["today", "Bugun"],
                ["cars", "Avtomobillar"],
                ["car-status", "Holat"],
                ["notifications", "Xabarlar"],
                ["reports", "Hisobotlar"],
                ["rentals", "Ijara / jarima"],
                ["documents", "Hujjatlar"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={tab === key}
                onClick={() => {
                  setActiveCar(null);
                  setTab(key);
                  setMessage("");
                  window.scrollTo({ top: 0, behavior: "auto" });
                }}
              >
                {key === "today" ? (
                  <LayoutDashboard size={18} />
                ) : key === "cars" ? (
                  <CarFront size={18} />
                ) : key === "notifications" ? (
                  <Bell size={18} />
                ) : (
                  <FileText size={18} />
                )}{" "}
                <span>{label}</span>
              </button>
            ))}
          </nav>
          {tab !== "today" && (
            <button
              className="secondary"
              onClick={() => {
                if (activeCar) setActiveCar(null);
                else setTab("today");
              }}
            >
              ← Ortga
            </button>
          )}
          {message && <p role="status">✓ {message}</p>}
          {!data ? (
            <Loading />
          ) : (
            <>
              {tab === "today" && (
                <>
                  <section className="mini-card">
                    <h2>Bugungi davomat</h2>
                    <p>
                      {data.date} · {"Asia/Tashkent"}
                    </p>
                    <div className="mini-times">
                      <div>
                        <small>Keldim</small>
                        <strong>
                          {data.myAttendance
                            ? clock(
                                data.myAttendance.checkIn,
                                data.myAttendance.checkInTimezone,
                              )
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        <small>Ketdim</small>
                        <strong>
                          {data.myAttendance?.checkOut
                            ? clock(
                                data.myAttendance.checkOut,
                                data.myAttendance.checkOutTimezone ||
                                  data.myAttendance.checkInTimezone,
                              )
                            : "—"}
                        </strong>
                      </div>
                    </div>
                    {can("attendance.write") && (
                      <div className="mini-actions">
                        <button
                          className="primary"
                          onClick={() => setModal("in")}
                        >
                          Ishga keldim
                        </button>
                        <button
                          className="secondary"
                          onClick={() => setModal("out")}
                        >
                          Ishdan ketdim
                        </button>
                      </div>
                    )}
                    <p>
                      Vaqtni qo‘lda kiriting. 10:00 dan keyin kelganda sabab
                      yoziladi.
                    </p>
                  </section>
                  <div className="mini-actions">
                    {can("reports.write") && (
                      <button
                        className="primary"
                        onClick={() => setModal("report")}
                      >
                        ＋ Kunlik hisobot
                      </button>
                    )}
                    {can("services.write") && (
                      <button
                        className="secondary"
                        onClick={() => setModal("service")}
                      >
                        ＋ Servis ishi
                      </button>
                    )}
                  </div>
                  <section className="mini-card">
                    <h2>Bugungi hisobotlarim</h2>
                    {data.tasks
                      .filter((t) => t.employee.id === user.id)
                      .map((t) => (
                        <article key={t.id}>
                          <p>{t.description}</p>
                          <small>
                            Xarajat:{" "}
                            {Number(t.expenseAmount || 0).toLocaleString(
                              "uz-UZ",
                            )}{" "}
                            so‘m {t.expenseNotes ? `· ${t.expenseNotes}` : ""}
                          </small>
                          <small>{t.car?.plateNumber}</small>
                        </article>
                      ))}
                    {!data.tasks.some((t) => t.employee.id === user.id) && (
                      <p>Hali hisobot kiritilmagan.</p>
                    )}
                  </section>
                  <section className="mini-card">
                    <h2>Oxirgi servis ishlarim</h2>
                    {data.services
                      .filter((s) => s.employee.id === user.id)
                      .map((s) => (
                        <article key={s.id}>
                          <b>{uzLabel(s.serviceType.name)}</b>
                          <p>
                            {s.car.plateNumber} · {s.mileage} km
                          </p>
                          <small>{s.notes}</small>
                        </article>
                      ))}
                  </section>
                </>
              )}
              {tab === "car-status" && (
                <FleetStatus
                  telegramDelivery
                  canManage={["SUPER_ADMIN", "ADMIN"].includes(user.role.name)}
                  onSaved={refresh}
                />
              )}
              {tab === "today" && <AttendanceReportButton />}
              {tab === "today" && <DaysOff onSaved={refresh} />}
              {tab === "cars" && activeCar && lookups && (
                <>
                  <button
                    className="secondary"
                    onClick={() => setActiveCar(null)}
                  >
                    ← Avtomobillar ro‘yxati
                  </button>
                  <CarProfile
                    key={activeCar}
                    carId={activeCar}
                    can={(p) => Boolean(can(p))}
                    lookups={lookups}
                    refresh={refresh}
                    edit={setEditingCar}
                    revision={noticeRevision}
                  />
                </>
              )}
              {tab === "cars" && !activeCar && (
                <>
                  <label className="field">
                    Avtomobil qidirish
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Raqam yoki model"
                    />
                  </label>
                  {lookups?.cars
                    .filter((c) =>
                      `${c.plateNumber}${c.brand}${c.model}`
                        .replace(/\s/g, "")
                        .toLowerCase()
                        .includes(search.replace(/\s/g, "").toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        className="mini-card mini-car-link"
                        onClick={() => {
                          setActiveCar(c.id);
                          window.scrollTo({ top: 0, behavior: "auto" });
                        }}
                        aria-label={`${c.brand} ${c.model}, ${c.plateNumber} — ma’lumotlarni ochish`}
                      >
                        <strong>
                          {c.brand} {c.model}
                        </strong>
                        <span>{c.plateNumber}</span>
                        <small>Ma’lumotlarni ko‘rish →</small>
                      </button>
                    ))}
                </>
              )}
              {tab === "documents" &&
                lookups &&
                (can("documents.read") ? (
                  <>
                    <h2>Avtomobil hujjatlari</h2>
                    <div className="fleet-status-buttons">
                      {can("documents.write") && (
                        <button
                          className="button primary"
                          onClick={() => setDocumentForm(true)}
                        >
                          + Hujjat qo‘shish
                        </button>
                      )}
                      {can("types.write") && (
                        <button
                          className="button secondary"
                          onClick={() => setTypeForm(true)}
                        >
                          + Yangi hujjat turi
                        </button>
                      )}
                    </div>
                    <Records
                      section="documents"
                      revision={noticeRevision}
                      lookup={lookups}
                      can={(p) => Boolean(can(p))}
                      edit={(kind, record) => {
                        if (kind === "document")
                          setDocumentForm(record as Document);
                      }}
                      refresh={refresh}
                    />
                  </>
                ) : (
                  <p>Hujjatlarni ko‘rishga ruxsat yo‘q.</p>
                ))}
              {tab === "rentals" && can("rentals.read") && (
                <RentalSearch canManage={user.role.name === "SUPER_ADMIN"} />
              )}
              {tab === "reports" && (
                <>
                  <label className="field">
                    Avtomobil raqami
                    <select
                      value={reportCarId}
                      onChange={(e) => setReportCarId(e.target.value)}
                    >
                      <option value="">Avtomobilni tanlang</option>
                      {lookups?.cars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.plateNumber} · {c.brand} {c.model}
                        </option>
                      ))}
                    </select>
                  </label>
                  {reportCarId && <CarReports carId={reportCarId} />}
                </>
              )}
              {tab === "notifications" && lookups && (
                <Records
                  section="notifications"
                  revision={noticeRevision}
                  lookup={lookups}
                  can={(p) =>
                    p === "*"
                      ? user.role.name === "SUPER_ADMIN"
                      : Boolean(can(p))
                  }
                  edit={() => {}}
                  refresh={refresh}
                />
              )}
              <button
                className="secondary"
                onClick={() => {
                  setError("");
                  void refresh();
                }}
              >
                Yangilash
              </button>
            </>
          )}
        </>
      )}
      {documentForm && lookups && (
        <RecordForm
          kind="document"
          initial={documentForm === true ? undefined : documentForm}
          lookups={lookups}
          onClose={() => setDocumentForm(null)}
          onSaved={() => {
            setDocumentForm(null);
            saved();
          }}
        />
      )}
      {typeForm && (
        <Modal title="Yangi hujjat turi" onClose={() => setTypeForm(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setTypeBusy(true);
              setError("");
              try {
                await api(
                  "settings/document-types",
                  "POST",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                setLookups(await api<Lookups>("lookup"));
                setTypeForm(false);
                saved();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setTypeBusy(false);
              }
            }}
          >
            <label className="field">
              Tur nomi
              <input name="name" required minLength={2} maxLength={100} />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary" disabled={typeBusy}>
              Qo‘shish
            </button>
          </form>
        </Modal>
      )}
      {editingCar && lookups && (
        <RecordForm
          kind="car"
          initial={editingCar}
          lookups={lookups}
          onClose={() => setEditingCar(null)}
          onSaved={saved}
        />
      )}
      {(modal === "in" || modal === "out") && (
        <AttendanceForm
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {(modal === "report" || modal === "service") && lookups && (
        <RecordForm
          kind={modal}
          lookups={lookups}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </main>
  );
}
