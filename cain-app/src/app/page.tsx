// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  // 첫 접속 시 CAIN 코인시세 지표 화면으로 자동 이동
  redirect("/personal-markets/spot");
}