// src/app/exchange-notices/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import ExchangeNoticeDetailClient from "./ExchangeNoticeDetailClient";

export const dynamic = "force-dynamic";

export default function ExchangeNoticeDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : String(rawId || "");

  return <ExchangeNoticeDetailClient id={id} />;
}