"use client";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";
// Mini App session is kept only in memory, never in URLs or browser storage.
let miniSession: string | null = null;
export function setMiniSession(token: string | null) {
  miniSession = token;
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(miniSession ? { Authorization: `Bearer ${miniSession}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "So‘rov bajarilmadi");
  return result as T;
}
export const fullName = (u?: {
  profile?: { firstName: string; lastName: string } | null;
}) => (u?.profile ? `${u.profile.firstName} ${u.profile.lastName}` : "—");
export const carName = (c?: { brand: string; model: string } | null) =>
  c ? `${c.brand} ${c.model}` : "—";
export { clock, formatDate, today } from "@/lib/display-date";
const names: Record<string, string> = {
  AVAILABLE: "Bo‘sh",
  RENTED: "Ijarada",
  SERVICE: "Servisda",
  RESERVED: "Band qilingan",
  UNAVAILABLE: "Mavjud emas",
  LATE: "Kechikdi",
  ON_TIME: "O‘z vaqtida",
  SENT: "Yuborildi",
  PENDING: "Navbatda",
  FAILED: "Xatolik",
  SKIPPED: "Faqat web",
  PROCESSING: "Yuborilmoqda",
  SUCCESS: "Sinxronlandi",
  NEVER: "Hali yo‘q",
  RUNNING: "Jarayonda",
};
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase()}`}>
      <i />
      {names[value] || value}
    </span>
  );
}
export function Empty({ text = "Hozircha ma’lumot yo‘q" }: { text?: string }) {
  return <div className="empty">{text}</div>;
}
export function Loading() {
  return (
    <div className="empty">
      <Loader2 className="spin" size={24} /> Yuklanmoqda…
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const node = ref.current;
    return () => node?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Yopish"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        minLength={type === "password" ? 12 : undefined}
        autoComplete={type === "password" ? "new-password" : undefined}
        onInput={
          type === "password"
            ? (e) => {
                const input = e.currentTarget;
                input.setCustomValidity(
                  input.value && input.value.length < 12
                    ? "Parol kamida 12 belgidan iborat bo‘lishi kerak"
                    : "",
                );
              }
            : undefined
        }
      />
    </label>
  );
}
export function Select({
  label,
  name,
  options,
  value,
  optional = false,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  optional?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={value || ""} required={!optional}>
        <option value="">{optional ? "Bog‘lanmagan" : "Tanlang"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Table({
  heads,
  children,
}: {
  heads: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
