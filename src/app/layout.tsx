import { FormLanguage } from "@/components/form-language";
import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "OrientRentCar — Boshqaruv tizimi",
  description: "Avtopark, xodimlar va kundalik operatsiyalar",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme =
    (await cookies()).get("orient-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="uz" data-theme={theme}>
      <body>
        <FormLanguage />
        {children}
        <ThemeToggle initialTheme={theme} />
      </body>
    </html>
  );
}
