"use client";
import { DaysOff } from "./days-off";
import { uzLabel } from "@/lib/uzbek";
import { RecordActions } from "./record-actions";
import { AttendanceEdit } from "./attendance-edit";
import {
  ArrowUpRight,
  Bell,
  CarFront,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  Attendance,
  Audit,
  Car,
  Document,
  Lookups,
  Notice,
  Report,
  Service,
  User,
} from "./types";
import {
  api,
  Badge,
  carName,
  clock,
  Empty,
  formatDate,
  fullName,
  Loading,
  Modal,
  Table,
  today,
} from "./ui";
export function Records({
  section: requestedSection,
  revision,
  lookup,
  can,
  edit,
  refresh,
}: {
  section: string;
  revision: number;
  lookup: Lookups;
  can: (p: string) => boolean;
  edit: (
    kind: "car" | "employee" | "document",
    initial: Car | User | Document,
  ) => void;
  refresh: () => void;
}) {
  const [attendanceTab, setAttendanceTab] = useState("attendance");
  const [noticeDate, setNoticeDate] = useState(today());
  const [followToday, setFollowToday] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      if (followToday) setNoticeDate(today());
    }, 15000);
    return () => clearInterval(timer);
  }, [followToday]);
  const [category, setCategory] = useState("ATTENDANCE");
  const section =
    requestedSection === "attendance" ? attendanceTab : requestedSection;
  const [rows, setRows] = useState<unknown[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [dateFilter, setDateFilter] = useState(""),
    [employee, setEmployee] = useState(""),
    [car, setCar] = useState(""),
    [grid, setGrid] = useState(true),
    [confirm, setConfirm] = useState<Car | User | null>(null);
  const [page, setPage] = useState(1);
  useEffect(
    () => setPage(1),
    [section, query, status, dateFilter, employee, car, category, noticeDate],
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (query) params.set("q", query);
      if (section === "notifications") {
        params.set("category", category);
        params.set("date", noticeDate);
      }
      if (section === "cars" && status) params.set("status", status);
      if (["attendance", "daily-reports"].includes(section)) {
        if (dateFilter) params.set("date", dateFilter);
        if (employee) params.set("employeeId", employee);
      }
      if (car) params.set("carId", car);
      api<unknown[]>(`${section}?${params}`)
        .then((v) => {
          if (active) {
            setRows(v);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    section,
    revision,
    query,
    status,
    dateFilter,
    employee,
    car,
    page,
    category,
    noticeDate,
  ]);
  async function exportNotices(send = false) {
    setPdfBusy(true);
    setError("");
    setPdfMessage("");
    try {
      const input = { date: noticeDate, category, q: query };
      if (send) {
        await api("notifications/send-report", "POST", {
          ...input,
          requestId: crypto.randomUUID(),
        });
        setPdfMessage("PDF Telegramga yuborish navbatiga qo‘shildi");
      } else {
        const file = await api<{ pdf: string; filename: string }>(
          `notifications/pdf?${new URLSearchParams(input)}`,
        );
        const url = URL.createObjectURL(
          new Blob([Uint8Array.from(atob(file.pdf), (c) => c.charCodeAt(0))], {
            type: "application/pdf",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  }
  const [attendanceEdit, setAttendanceEdit] = useState<Attendance | null>(null);
  const cars = rows as Car[],
    employees = rows as User[],
    documents = rows as Document[];
  return (
    <section className={section === "cars" && grid ? "" : "panel"}>
      {requestedSection === "attendance" && (
        <DaysOff revision={revision} onSaved={refresh} />
      )}
      {requestedSection === "attendance" && (
        <nav className="tabs" aria-label="Davomat bo‘limlari">
          {[
            ["attendance", "Ishga kelish / ketish"],
            ["services", "Xodimlarning servis ishlari"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={attendanceTab === key ? "active" : ""}
              aria-pressed={attendanceTab === key}
              onClick={() => setAttendanceTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {section === "notifications" && (
        <nav className="tabs" aria-label="Bildirishnoma bo‘limlari">
          {[
            ["ALL", "Barcha bo‘limlar"],
            ["ATTENDANCE", "Ishga kelish / ketish"],
            ["SERVICE", "Servis ishlari"],
            ["DOCUMENTS", "Hujjatlar"],
            ["REPORTS", "Hisobotlar"],
            ["OTHER", "Boshqa"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={category === key ? "active" : ""}
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {section === "notifications" && (
        <p className="notification-help">
          Kerakli bo‘limni tanlang. Xabarlar eng yangisidan boshlab saralangan.
          Xodim, avtomobil yoki matn bo‘yicha qidirishingiz mumkin.
        </p>
      )}
      {section === "notifications" && (
        <div className="filters">
          <label className="field">
            Sana (Toshkent vaqti)
            <input
              type="date"
              required
              value={noticeDate}
              onChange={(e) => {
                if (e.target.value) {
                  setNoticeDate(e.target.value);
                  setFollowToday(false);
                  setPdfMessage("");
                }
              }}
            />
          </label>
          <button
            className="secondary"
            onClick={() => {
              setNoticeDate(today());
              setFollowToday(true);
            }}
          >
            Bugun
          </button>
          <button
            className="secondary"
            disabled={pdfBusy}
            onClick={() => void exportNotices()}
          >
            PDF yuklab olish
          </button>
          <button
            className="secondary"
            disabled={pdfBusy}
            onClick={() => void exportNotices(true)}
          >
            PDFni Telegramga yuborish
          </button>
          {pdfMessage && <p role="status">{pdfMessage}</p>}
        </div>
      )}
      <div className="filters">
        <div className="filter-search">
          <Search size={17} />
          <input
            aria-label="Qidirish"
            placeholder="Qidirish…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {section === "cars" && (
          <select
            aria-label="Avtomobil holati"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Barcha holatlar</option>
            {[
              "AVAILABLE",
              "RENTED",
              "SERVICE",
              "RESERVED",
              "UNAVAILABLE",
              "WITH_OWNER",
              "CAR_WASH",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        {["attendance", "daily-reports"].includes(section) && (
          <>
            <input
              aria-label="Sana"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {can("employees.read") && (
              <select
                aria-label="Xodim"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
              >
                <option value="">Barcha xodimlar</option>
                {lookup.employees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {fullName(u)}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        {["services", "daily-reports"].includes(section) && (
          <select
            aria-label="Avtomobil"
            value={car}
            onChange={(e) => setCar(e.target.value)}
          >
            <option value="">Barcha avtomobillar</option>
            {lookup.cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.plateNumber}
              </option>
            ))}
          </select>
        )}
        <span className="result-count">{rows.length} ta yozuv</span>
        {section === "cars" && (
          <div className="view-switch">
            <button
              aria-label="Kartalar"
              aria-pressed={grid}
              className={grid ? "selected" : ""}
              onClick={() => setGrid(true)}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              aria-label="Jadval"
              aria-pressed={!grid}
              className={!grid ? "selected" : ""}
              onClick={() => setGrid(false)}
            >
              <List size={17} />
            </button>
          </div>
        )}
        <button
          className="icon-button"
          onClick={refresh}
          aria-label="Yangilash"
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <Empty />
      ) : (
        <>
          {section === "cars" &&
            (grid ? (
              <div className="car-grid">
                {cars.map((c) => (
                  <div className="car-card" key={c.id}>
                    <Link href={`/cars/${c.id}`}>
                      <div className="car-card-top">
                        <span className="car-brand">{c.brand}</span>
                        <Badge value={c.status} />
                      </div>
                      <div className="car-symbol">
                        {c.imageData ? (
                          <img
                            src={c.imageData}
                            alt={`${c.brand} ${c.model}`}
                            style={{
                              width: "100%",
                              height: 150,
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <CarFront size={76} strokeWidth={1} />
                        )}
                      </div>
                      <h2>{carName(c)}</h2>
                      <span className="plate">{c.plateNumber}</span>
                      <div className="car-card-meta">
                        <span>{c.year} yil</span>
                        <span>{c.mileage.toLocaleString()} km</span>
                        <span>{c.color}</span>
                      </div>
                      <div className="car-card-footer">
                        <span>{c.location}</span>
                        <ArrowUpRight size={19} />
                      </div>
                    </Link>
                    {can("*") && (
                      <div className="inline-actions">
                        <button
                          className="text-button"
                          onClick={() => edit("car", c)}
                        >
                          Tahrirlash
                        </button>
                        <button
                          className="text-button danger-text"
                          onClick={() => setConfirm(c)}
                        >
                          O‘chirish
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Table
                heads={[
                  "AVTOMOBIL",
                  "DAVLAT RAQAMI",
                  "YIL",
                  "MASOFA",
                  "HOLAT",
                  "JOYLASHUV",
                  ...(can("*") ? ["AMALLAR"] : []),
                ]}
              >
                {cars.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/cars/${c.id}`}>
                        <b>{carName(c)}</b>
                      </Link>
                    </td>
                    <td>
                      <span className="plate">{c.plateNumber}</span>
                    </td>
                    <td>{c.year}</td>
                    <td>{c.mileage.toLocaleString()} km</td>
                    <td>
                      <Badge value={c.status} />
                    </td>
                    <td>{c.location}</td>
                    {can("*") && (
                      <td>
                        <div className="inline-actions">
                          <button
                            className="text-button"
                            onClick={() => edit("car", c)}
                          >
                            Tahrirlash
                          </button>
                          <button
                            className="text-button danger-text"
                            onClick={() => setConfirm(c)}
                          >
                            O‘chirish
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </Table>
            ))}
          {section === "employees" && (
            <Table
              heads={[
                "XODIM",
                "LAVOZIM",
                "LOGIN / ROL",
                "TELEGRAM",
                "STATUS",
                "AMALLAR",
              ]}
            >
              {employees
                .filter((u) =>
                  `${fullName(u)} ${u.login}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((u) => (
                  <tr key={u.id}>
                    <td>
                      <b>{fullName(u)}</b>
                      <small>{u.profile?.phone}</small>
                    </td>
                    <td>{u.profile?.position}</td>
                    <td>
                      {u.login}
                      <small>{uzLabel(u.role.name)}</small>
                    </td>
                    <td>
                      {u.profile?.telegramUsername ||
                        u.profile?.telegramChatId ||
                        "Bog‘lanmagan"}
                      <small>
                        {u.profile?.telegramVerified ? "Tasdiqlangan" : ""}
                      </small>
                    </td>
                    <td>
                      <span className={u.active ? "text-green" : "text-orange"}>
                        {u.active ? "Faol" : "Nofaol"}
                      </span>
                    </td>
                    <td>
                      {can("*") && (
                        <div className="inline-actions">
                          <button onClick={() => edit("employee", u)}>
                            Tahrirlash
                          </button>
                          {u.active && (
                            <button
                              className="danger-text"
                              onClick={() => setConfirm(u)}
                            >
                              O‘chirish
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </Table>
          )}
          {section === "attendance" && (
            <Table
              heads={[
                "XODIM",
                "SANA",
                "KELISH",
                "KETISH",
                "HOLAT",
                "SABAB",
                ...(can("*") ? ["AMAL"] : []),
              ]}
            >
              {(rows as Attendance[])
                .filter((a) =>
                  (a.user ? fullName(a.user) : "Tizim (avtomatik)")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((a) => (
                  <tr key={a.id}>
                    <td>
                      <b>{a.user ? fullName(a.user) : "Tizim (avtomatik)"}</b>
                    </td>
                    <td>{formatDate(a.date)}</td>
                    <td>
                      {clock(a.checkIn, a.checkInTimezone)}
                      <small>{a.checkInTimezone}</small>
                    </td>
                    <td>
                      {clock(
                        a.checkOut,
                        a.checkOutTimezone || a.checkInTimezone,
                      )}
                      <small>{a.checkOutTimezone}</small>
                    </td>
                    <td>
                      <Badge value={a.status} />
                    </td>
                    <td>
                      {a.lateReason && <p>Kelish: {a.lateReason}</p>}
                      {a.earlyLeaveReason && (
                        <p>Ketish: {a.earlyLeaveReason}</p>
                      )}
                      {!a.lateReason && !a.earlyLeaveReason && "—"}
                    </td>
                    {can("*") && (
                      <td>
                        <button
                          className="secondary"
                          onClick={() => setAttendanceEdit(a)}
                        >
                          Tahrirlash
                        </button>
                        <RecordActions
                          resource="attendance"
                          record={a}
                          deleteOnly
                          onSaved={refresh}
                        />
                      </td>
                    )}
                  </tr>
                ))}
            </Table>
          )}
          {section === "daily-reports" && (
            <Table
              heads={[
                "XODIM",
                "SANA",
                "BAJARILGAN ISH",
                "XARAJAT",
                "AVTOMOBIL",
                ...(can("*") ? ["AMALLAR"] : []),
              ]}
            >
              {(rows as Report[]).map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{fullName(r.employee)}</b>
                  </td>
                  <td>{formatDate(r.date)}</td>
                  <td className="wrap-cell">{r.description}</td>
                  <td>
                    {Number(r.expenseAmount || 0).toLocaleString("uz-UZ")} so‘m
                    <small>{r.expenseNotes}</small>
                  </td>
                  <td>
                    {r.car ? (
                      <Link href={`/cars/${r.car.id}`}>
                        {r.car.plateNumber}
                        <small>{carName(r.car)}</small>
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  {can("*") && (
                    <td>
                      <RecordActions
                        resource="daily-reports"
                        record={r}
                        lookup={lookup}
                        onSaved={refresh}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          )}
          {section === "services" && (
            <Table
              heads={[
                "AVTOMOBIL",
                "SERVIS TURI",
                "SANA",
                "MASOFA",
                "XODIM",
                "IZOH",
                ...(can("*") ? ["AMALLAR"] : []),
              ]}
            >
              {(rows as Service[])
                .filter((s) =>
                  `${carName(s.car)} ${uzLabel(s.serviceType.name)} ${s.notes}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/cars/${s.car.id}`}>
                        <b>{carName(s.car)}</b>
                        <small>{s.car.plateNumber}</small>
                      </Link>
                    </td>
                    <td>{uzLabel(s.serviceType.name)}</td>
                    <td>{formatDate(s.date)}</td>
                    <td>{s.mileage.toLocaleString()} km</td>
                    <td>{fullName(s.employee)}</td>
                    <td className="wrap-cell">{s.notes || "—"}</td>
                    {can("*") && (
                      <td>
                        <RecordActions
                          resource="services"
                          record={s}
                          lookup={lookup}
                          onSaved={refresh}
                        />
                      </td>
                    )}
                  </tr>
                ))}
            </Table>
          )}
          {section === "documents" && (
            <Table
              heads={[
                "AVTOMOBIL",
                "HUJJAT",
                "RAQAM",
                "TUGASH SANASI",
                "MAS’UL",
                "AMALLAR",
              ]}
            >
              {documents
                .filter((d) =>
                  `${carName(d.car)} ${d.car.plateNumber} ${uzLabel(d.documentType.name)}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/cars/${d.car.id}`}>
                        <b>{carName(d.car)}</b>
                        <small>{d.car.plateNumber}</small>
                      </Link>
                    </td>
                    <td>{uzLabel(d.documentType.name)}</td>
                    <td>{d.number}</td>
                    <td>
                      <span
                        className={
                          d.expiryDate.slice(0, 10) < today()
                            ? "danger-text"
                            : ""
                        }
                      >
                        {formatDate(d.expiryDate)}
                      </span>
                    </td>
                    <td>{fullName(d.responsible)}</td>
                    <td>
                      {can("*") && (
                        <button
                          className="text-button"
                          onClick={() => edit("document", d)}
                        >
                          Yangilash
                        </button>
                      )}
                      {can("*") && (
                        <RecordActions
                          resource="documents"
                          record={d}
                          deleteOnly
                          onSaved={refresh}
                        />
                      )}
                      {d.fileUrl && (
                        <a href={d.fileUrl} target="_blank" rel="noreferrer">
                          {" "}
                          Fayl ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
            </Table>
          )}
          {section === "notifications" && (
            <div className="notification-list">
              {(rows as Notice[])
                .filter((n) =>
                  `${n.title} ${n.message}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((n) => (
                  <article key={n.id} className={n.readAt ? "read" : ""}>
                    <span className="activity-icon">
                      <Bell size={19} />
                    </span>
                    <div>
                      <h3>{n.title}</h3>
                      <small>
                        {{
                          ATTENDANCE: "Ishga kelish / ketish",
                          SERVICE: "Servis ishlari",
                          DOCUMENTS: "Hujjatlar",
                          REPORTS: "Hisobotlar",
                          OTHER: "Boshqa",
                        }[n.category] || n.category}
                      </small>
                      <p className="notification-message">{n.message}</p>
                      <small>
                        {formatDate(n.createdAt, true)} ·{" "}
                        {n.readAt ? "O‘qilgan" : "Yangi xabar"}
                      </small>
                    </div>
                    <div className="notification-actions">
                      <Badge value={n.status} />
                      {can("*") && (
                        <RecordActions
                          resource="notifications"
                          record={n}
                          onSaved={refresh}
                        />
                      )}
                      {!n.readAt && (
                        <button
                          className="text-button"
                          onClick={async () => {
                            try {
                              await api(`notifications/${n.id}`, "PATCH", {});
                              refresh();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          O‘qildi
                        </button>
                      )}
                      {can("settings.write") && n.status === "FAILED" && (
                        <button
                          className="text-button"
                          onClick={async () => {
                            try {
                              await api(`notifications/${n.id}`, "PATCH", {
                                retry: true,
                              });
                              refresh();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Qayta yuborish
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          )}
          {section === "audit-logs" && (
            <Table
              heads={[
                "VAQT",
                "XODIM",
                "AMAL",
                "OBYEKT",
                "TAFSILOT",
                ...(can("*") ? ["AMALLAR"] : []),
              ]}
            >
              {(rows as Audit[]).map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.timestamp, true)}</td>
                  <td>{a.user ? fullName(a.user) : "Tizim (avtomatik)"}</td>
                  <td>
                    <Badge value={uzLabel(a.action)} />
                  </td>
                  <td>
                    {uzLabel(a.entityType)}
                    <small>{a.entityId}</small>
                  </td>
                  <td>
                    <details>
                      <summary>O‘zgarishni ko‘rish</summary>
                      <pre>
                        {JSON.stringify(
                          { old: a.oldValue, new: a.newValue },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </td>
                  {can("*") && (
                    <td>
                      <RecordActions
                        resource="audit-logs"
                        record={a}
                        lookup={lookup}
                        onSaved={refresh}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
      <div className="pagination">
        <button
          className="secondary"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Oldingi
        </button>
        <span>{page}-sahifa · 50 tagacha yozuv</span>
        <button
          className="secondary"
          disabled={rows.length < 50 || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Keyingi
        </button>
      </div>
      {attendanceEdit && (
        <AttendanceEdit
          entry={attendanceEdit}
          onClose={() => setAttendanceEdit(null)}
          onSaved={refresh}
        />
      )}
      {confirm && (
        <Modal
          title="Xodimni ro‘yxatdan o‘chirish"
          onClose={() => setConfirm(null)}
        >
          <p className="modal-description">
            Xodim ro‘yxatdan yo‘qoladi va tizimga kira olmaydi. Ish tarixi
            saqlanadi. Uni qayta yangi xodim sifatida qo‘shishingiz mumkin.
          </p>
          <div className="form-actions">
            <button className="secondary" onClick={() => setConfirm(null)}>
              Bekor qilish
            </button>
            <button
              className="primary"
              onClick={async () => {
                try {
                  await api(`employees/${confirm.id}`, "DELETE");
                  setConfirm(null);
                  refresh();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Tasdiqlash
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
