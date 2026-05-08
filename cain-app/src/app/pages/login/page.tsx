// src/app/pages/login/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LoginLegacyPage() {
  // 옛날 /pages/login 주소로 들어온 사람은 새 로그인으로 보냄
  redirect("/login");
}
