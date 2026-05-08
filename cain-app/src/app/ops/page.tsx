"use client";

import { useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function OpsPage() {
  const [status, setStatus] = useState<string>("");

  const subscribePush = async () => {
    try {
      setStatus("권한 요청 중...");

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("이 브라우저는 Push를 지원하지 않음");
        return;
      }

      // 1) 알림 권한 요청
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("알림 권한 거부됨");
        return;
      }

      // 2) SW 등록(이미 layout에서 등록했으면 skip 가능)
      const reg = await navigator.serviceWorker.ready;

      // 3) 구독 생성
      setStatus("구독 생성 중...");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4) 구독 저장 API 호출
      setStatus("서버에 구독 저장 중...");
      const r = await fetch("/api/ops/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      const j = await r.json();

      if (!j.ok) {
        setStatus("저장 실패: " + (j.error ?? "unknown"));
        return;
      }

      setStatus("✅ Push 구독 완료! 이제 가입 신청 오면 푸시가 옵니다.");
    } catch (e: any) {
      setStatus("에러: " + (e?.message ?? "unknown"));
    }
  };

  return (
    <main className="w-full px-3 md:px-5 py-10">
      <div className="mx-auto max-w-md space-y-5">
        <h1 className="text-2xl font-semibold text-[var(--brand)]">CAIN OPS</h1>

        <button
          onClick={subscribePush}
          className="w-full rounded-xl bg-[var(--brand)]/20 text-[var(--brand)] px-4 py-3 font-semibold hover:bg-[var(--brand)]/30 transition"
        >
          보스 폰 Push 구독하기
        </button>

        {status && (
          <div className="text-sm rounded-xl border border-white/10 bg-white/5 p-3">
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
