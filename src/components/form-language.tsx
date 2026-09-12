"use client";
import { useEffect } from "react";
/** Native browser validation messages are explicitly localized for shared forms. */
export function FormLanguage() {
  useEffect(() => {
    const field = (event: Event) =>
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
        ? event.target
        : null;
    const reset = (event: Event) => field(event)?.setCustomValidity("");
    const invalid = (event: Event) => {
      const input = field(event);
      if (!input) return;
      input.setCustomValidity("");
      const v = input.validity;
      input.setCustomValidity(
        v.valueMissing
          ? "Bu maydonni to‘ldiring yoki ro‘yxatdan tanlang."
          : v.typeMismatch
            ? "Ma’lumotni to‘g‘ri formatda kiriting."
            : v.rangeUnderflow
              ? "Qiymat ruxsat etilgan eng kichik qiymatdan kam."
              : v.rangeOverflow
                ? "Qiymat ruxsat etilgan eng katta qiymatdan oshgan."
                : v.tooShort
                  ? "Kiritilgan ma’lumot juda qisqa."
                  : v.tooLong
                    ? "Kiritilgan ma’lumot juda uzun."
                    : "Kiritilgan ma’lumotni tekshiring.",
      );
    };
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", reset, true);
    document.addEventListener("change", reset, true);
    return () => {
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", reset, true);
      document.removeEventListener("change", reset, true);
    };
  }, []);
  return null;
}
