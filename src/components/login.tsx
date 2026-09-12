"use client";
import { RentCarBrand } from "./rentcar-brand";
import { ArrowRight, ShieldCheck, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "./ui";
export function Login() {
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", "/login");
  }, []);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand">
          <RentCarBrand />
        </div>
        <div>
          <span className="eyebrow">ICHKI BOSHQARUV TIZIMI</span>
          <h1>
            Har bir avtomobil.
            <br />
            Har bir ish.
            <br />
            <em>Bitta tizimda.</em>
          </h1>
          <p>
            Avtoparkingiz va jamoangizning kundalik ishlarini bir joydan
            boshqaring.
          </p>
        </div>
        <small>OrientRentCar boshqaruvi · Asia/Tashkent</small>
      </section>
      <main className="login-main">
        <form
          method="post"
          action="/api/auth/login"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const data = new FormData(e.currentTarget);
            try {
              await api("auth/login", "POST", Object.fromEntries(data));
              window.location.href = "/";
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="login-icon">
            <ShieldCheck />
          </div>
          <h2>Xush kelibsiz</h2>
          <p>Faqat administrator yaratgan xodim hisoblari uchun.</p>
          <label className="field">
            Login
            <input
              name="login"
              autoComplete="username"
              required
              placeholder="Sizning loginingiz"
            />
          </label>
          <label className="field">
            Parol
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Parolingizni kiriting"
            />
          </label>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <button disabled={busy} className="primary">
            {busy ? "Kirilmoqda…" : "Tizimga kirish"}
            <ArrowRight size={18} />
          </button>
          <small>
            Hisob ochish yoki parolni tiklash uchun administratorga murojaat
            qiling.
          </small>
          <a
            className="secondary administrator-contact"
            href="https://t.me/jakhongir_ps"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Send size={18} aria-hidden="true" /> Administratorga yozish
          </a>
        </form>
      </main>
    </div>
  );
}
