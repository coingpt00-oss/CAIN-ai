// src/app/pages/register/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RegisterLegacyPage() {
  // 옛날 /pages/register 로 들어오면 새 회원가입 페이지로 보냄
  redirect("/register");
}
