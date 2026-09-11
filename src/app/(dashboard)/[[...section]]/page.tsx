import { DashboardApp } from "@/components/dashboard-app";
import type { User } from "@/components/types";
import { currentUser } from "@/modules/auth/service";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <DashboardApp
      user={JSON.parse(JSON.stringify(user)) as User}
      initialDate={new Date().toISOString()}
    />
  );
}
