"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>Tizimga ulanish imkoni bo‘lmadi</h1>
      <p>Server va ma’lumotlar bazasi ulanishini tekshiring.</p>
      <button onClick={reset}>Qayta urinish</button>
    </main>
  );
}
