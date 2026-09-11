import { MiniApp } from "@/components/mini-app";
import { headers } from "next/headers";
export default async function Page() {
  return <MiniApp nonce={(await headers()).get("x-nonce") || undefined} />;
}
