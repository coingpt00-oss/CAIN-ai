//src/app/personal-markets/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PersonalMarketsPage() {
  redirect("/personal-markets/spot");
}