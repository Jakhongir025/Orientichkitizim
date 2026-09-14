"use client";
import { uzLabel } from "@/lib/uzbek";
import { FleetStatus } from "./fleet-status";
import { RentCarBrand } from "./rentcar-brand";
import {
  Bell,
  CalendarDays,
  CarFront,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CarProfile } from "./car-profile";
import { Overview } from "./overview";
import { RecordForm } from "./record-form";
import { Records } from "./records";
import { RentalSearch } from "./rental-search";
import { SettingsPanel } from "./settings-panel";
import type { Car, Document, Lookups, User } from "./types";
import { api, carName, Empty, formatDate, fullName, Modal } from "./ui";
const navigation = [
  {
    path: "",
    label: "Bosh sahifa",
    icon: LayoutDashboard,
    permission: "dashboard.read",
  },
  {
    path: "employees",
    label: "Xodimlar",
    icon: Users,
    permission: "employees.read",
  },
  {
    path: "attendance",
    label: "Davomat",
    icon: Clock3,
    permission: "attendance.write",
  },
  {
    path: "daily-reports",
    label: "Kunlik hisobotlar",
    icon: ClipboardList,
    permission: "reports.write",
  },
  {
    path: "cars",
    label: "Avtomobillar",
    icon: CarFront,
    permission: "cars.read",
  },
  {
    path: "car-status",
    label: "Avtomobillar holati",
    icon: CarFront,
    permission: "cars.read",
  },
  {
    path: "services",
    label: "Servis tarixi",
    icon: Wrench,
    permission: "cars.read",
  },
  {
    path: "documents",
    label: "Hujjatlar",
    icon: FileText,
    permission: "documents.read",
  },
  {
    path: "rentals",
    label: "Ijara / Jarima qidiruvi",
    icon: Search,
    permission: "rentals.read",
  },
  {
    path: "notifications",
    label: "Bildirishnomalar",
    icon: Bell,
    permission: "notifications.read",
  },
  {
    path: "audit-logs",
    label: "Audit tarixi",
    icon: ShieldCheck,
    permission: "audit.read",
  },
  {
    path: "settings",
    label: "Sozlamalar",
    icon: Settings,
    permission: "settings.write",
  },
];
const emptyLookups: Lookups = {
  cars: [],
  employees: [],
  roles: [],
  offices: [],
  serviceTypes: [],
  documentTypes: [],
};
export function DashboardApp({
  user,
  initialDate,
}: {
  user: User;
  initialDate: string;
}) {
  const [timezone, setTimezone] = useState("Asia/Tashkent");
  useEffect(() => setTimezone("Asia/Tashkent"), []);
  const path = usePathname().split("/").filter(Boolean),
    section = path[0] || "",
    carId = section === "cars" ? path[1] : undefined;
  const can = (permission: string) =>
    permission === "*"
      ? user.role.name === "SUPER_ADMIN"
      : user.role.permissions.includes("*") ||
        user.role.permissions.includes(permission);
  const [mobile, setMobile] = useState(false),
    [global, setGlobal] = useState(""),
    [suggestions, setSuggestions] = useState<Car[]>([]),
    [lookup, setLookup] = useState<Lookups>(emptyLookups),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState<{
    kind: "car" | "employee" | "service" | "document" | "report";
    initial?: Car | Document | User;
  } | null>(null);
  const [typeForm, setTypeForm] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [linkInstruction, setLinkInstruction] = useState("");
  const refresh = () => setRevision((v) => v + 1);
  useEffect(() => {
    api<Lookups>("lookup")
      .then(setLookup)
      .catch((e) => setNotice(e.message));
  }, [revision]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (global.trim())
        api<Car[]>(`cars?q=${encodeURIComponent(global)}&limit=6`)
          .then((v) => {
            if (active) setSuggestions(v);
          })
          .catch(() => {});
      else setSuggestions([]);
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [global]);
  const current = navigation.find((n) => n.path === section),
    allowed = current && can(current.permission);
  const titles: Record<string, string> = {
    "": "Operatsiyalar markazi",
    employees: "Xodimlar",
    attendance: "Davomat",
    "daily-reports": "Kunlik hisobotlar",
    cars: carId ? "Avtomobil profili" : "Avtopark",
    "car-status": "Avtomobillar holati",
    services: "Servis tarixi",
    documents: "Avtomobil hujjatlari",
    rentals: "Ijara va jarima qidiruvi",
    notifications: "Bildirishnomalar",
    "audit-logs": "Audit tarixi",
    settings: "Tizim sozlamalari",
  };
  const descriptions: Record<string, string> = {
    "": "Jamoangiz va avtoparkingizning bugungi holati.",
    employees: "Jamoa, rollar va Telegram hisoblarini boshqaring.",
    attendance: "Ishga kelish, ketish va kechikishlar.",
    cars: "Barcha avtomobillar va ularning joriy holati.",
    services: "Har bir avtomobil uchun bajarilgan ishlar.",
    documents: "Hujjatlar, mas’ullar va yangilash muddatlari.",
    rentals: "Avtomobil kimda bo‘lganini ijara tarixidan aniqlang.",
  };
  const actions: Record<
    string,
    {
      kind: "car" | "employee" | "service" | "document" | "report";
      label: string;
      permission: string;
    }
  > = {
    cars: {
      kind: "car",
      label: "Avtomobil qo‘shish",
      permission: "cars.write",
    },
    employees: {
      kind: "employee",
      label: "Xodim qo‘shish",
      permission: "employees.write",
    },
    services: {
      kind: "service",
      label: "Servis qo‘shish",
      permission: "services.write",
    },
    documents: {
      kind: "document",
      label: "Hujjat qo‘shish",
      permission: "documents.write",
    },
    "daily-reports": {
      kind: "report",
      label: "Hisobot yozish",
      permission: "reports.write",
    },
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link href="/" className="brand">
          <RentCarBrand />
        </Link>
        <span className="nav-caption">BOSHQARUV</span>
        <nav>
          {navigation
            .filter((n) => can(n.permission))
            .map((n) => (
              <Link
                key={n.path}
                href={`/${n.path}`}
                onClick={() => setMobile(false)}
                className={section === n.path ? "active" : ""}
              >
                <n.icon size={19} />
                {n.label}
                {section === n.path && <span className="active-dot" />}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="office-label">
            <span className="live-dot" />
            <div>
              {user.profile?.office?.name || "Toshkent ofisi"}
              <small>10:00 – 22:00 · UZT</small>
            </div>
          </div>
          <button
            className="logout"
            onClick={async () => {
              try {
                await api("auth/logout", "POST", {});
                window.location.href = "/login";
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            <LogOut size={18} />
            Tizimdan chiqish
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          onClick={() => setMobile(false)}
          aria-label="Menyuni yopish"
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setMobile(!mobile)}
            aria-label="Menyu"
          >
            <Menu />
          </button>
          <div className="global-search">
            <Search size={18} />
            <input
              aria-label="Global avtomobil qidiruvi"
              placeholder="Raqam, model yoki VIN bo‘yicha qidirish…"
              value={global}
              onChange={(e) => setGlobal(e.target.value)}
            />
            <kbd>Qidiruv</kbd>
            {global && (
              <div className="search-results">
                {suggestions.length ? (
                  suggestions.map((c) => (
                    <Link
                      key={c.id}
                      href={`/cars/${c.id}`}
                      onClick={() => setGlobal("")}
                    >
                      <CarFront size={18} />
                      <span>
                        {carName(c)}
                        <small>{c.plateNumber}</small>
                      </span>
                      <ChevronRight size={16} />
                    </Link>
                  ))
                ) : (
                  <p>Natija topilmadi</p>
                )}
              </div>
            )}
          </div>
          <div className="topbar-right">
            <span className="timezone">
              {timezone.replaceAll("_", " ")} <span className="live-dot" />
            </span>
            <Link
              className="icon-button"
              href="/notifications"
              aria-label="Bildirishnomalar"
            >
              <Bell size={20} />
            </Link>
            <span className="top-divider" />
            <button
              className="avatar"
              onClick={() => setProfileOpen(true)}
              aria-label="Mening profilim"
            >
              {user.profile?.firstName[0]}
              {user.profile?.lastName[0]}
            </button>
            <div className="user-name">
              {fullName(user)}
              <small>
                {user.profile?.position || user.role.name.replaceAll("_", " ")}
              </small>
            </div>
          </div>
        </header>
        <main className="workspace">
          <div className="breadcrumb">
            Boshqaruv <ChevronRight size={14} />
            <span>{current?.label || "Sahifa"}</span>
          </div>
          <div className="page-heading">
            <div>
              <h1>{titles[section] || "Sahifa topilmadi"}</h1>
              <p>
                {descriptions[section] || "Yozuvlarni ko‘ring va boshqaring."}
              </p>
            </div>
            <div className="heading-actions">
              {["services", "documents"].includes(section) &&
                can("types.write") && (
                  <button
                    className="secondary"
                    onClick={() => setTypeForm(true)}
                  >
                    + Yangi tur
                  </button>
                )}
              {section === "" && (
                <span className="date-chip">
                  <CalendarDays size={17} />
                  {formatDate(initialDate, false, timezone)}
                </span>
              )}
              {actions[section] &&
                !carId &&
                can(actions[section].permission) && (
                  <button
                    className="primary"
                    onClick={() => setForm({ kind: actions[section].kind })}
                  >
                    <Plus size={18} />
                    {actions[section].label}
                  </button>
                )}
            </div>
          </div>
          {notice && (
            <div className="error" role="alert">
              {notice}
              <button
                onClick={() => setNotice("")}
                className="icon-button"
                aria-label="Yopish"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!allowed ? (
            <Empty text="Bu sahifa topilmadi yoki kirishga ruxsat yo‘q" />
          ) : section === "" ? (
            <Overview
              user={user}
              revision={revision}
              refresh={refresh}
              report={() => setForm({ kind: "report" })}
            />
          ) : section === "car-status" ? (
            <FleetStatus
              canManage={["SUPER_ADMIN", "ADMIN"].includes(user.role.name)}
              onSaved={refresh}
            />
          ) : section === "settings" ? (
            <SettingsPanel lookup={lookup} refresh={refresh} />
          ) : section === "rentals" ? (
            <RentalSearch canManage={can("*")} />
          ) : carId ? (
            <CarProfile
              carId={carId}
              can={can}
              lookups={lookup}
              refresh={refresh}
              edit={(car) => setForm({ kind: "car", initial: car })}
              revision={revision}
            />
          ) : (
            <Records
              section={section}
              revision={revision}
              lookup={lookup}
              can={can}
              edit={(kind, initial) => setForm({ kind, initial })}
              refresh={refresh}
            />
          )}
          <footer className="footer">
            <span>OrientRentCar Boshqaruv tizimi</span>
            <span>{timezone} · Ichki foydalanish uchun</span>
          </footer>
        </main>
      </div>
      {profileOpen && (
        <Modal title="Mening profilim" onClose={() => setProfileOpen(false)}>
          <div className="detail-grid">
            {Object.entries({
              "Ism-familiya": fullName(user),
              Telefon: user.profile?.phone || "—",
              Lavozim: user.profile?.position || "—",
              Login: user.login,
              "Tizimdagi ruxsat":
                user.role.name === "SUPER_ADMIN"
                  ? "Bosh administrator · To‘liq boshqaruv"
                  : uzLabel(user.role.name),
              Telegram: user.profile?.telegramChatId || "Bog‘lanmagan",
            }).map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <button
            className="secondary"
            onClick={async () => {
              try {
                const result = await api<{ instruction: string }>(
                  "telegram/connect",
                  "POST",
                  {},
                );
                setLinkInstruction(result.instruction);
              } catch (e) {
                setLinkInstruction((e as Error).message);
              }
            }}
          >
            Telegramni ulash
          </button>
          <button
            className="secondary"
            onClick={async () => {
              try {
                await api("auth/logout-all", "POST");
                window.location.href = "/login";
              } catch (e) {
                setLinkInstruction((e as Error).message);
              }
            }}
          >
            Barcha qurilmalardan chiqish
          </button>
          {linkInstruction && <p className="success">{linkInstruction}</p>}
        </Modal>
      )}
      {typeForm && (
        <Modal title="Yangi tur qo‘shish" onClose={() => setTypeForm(false)}>
          <form
            method="post"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(
                  `settings/${section === "services" ? "service-types" : "document-types"}`,
                  "POST",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                setTypeForm(false);
                refresh();
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            <label className="field">
              Tur nomi
              <input name="name" required minLength={2} maxLength={100} />
            </label>
            {notice && <p className="error">{notice}</p>}
            <button className="primary">Qo‘shish</button>
          </form>
        </Modal>
      )}
      {form && (
        <RecordForm
          kind={form.kind}
          initial={form.initial}
          lookups={lookup}
          onClose={() => setForm(null)}
          onSaved={() => {
            refresh();
            setNotice("");
          }}
        />
      )}
    </div>
  );
}
