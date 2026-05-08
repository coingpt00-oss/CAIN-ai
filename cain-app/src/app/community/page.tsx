// src/app/community/page.tsx
import CommunityListClient from "./CommunityListClient";

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  return (
    <main className="w-full px-4 md:px-8 py-10">
      <section className="max-w-5xl mx-auto">
        {/* 제목 + 서브 텍스트 */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">커뮤니티</h1>
          <p className="text-sm md:text-base text-white/60">
            코인시장 이야기, 투자 후기, 전략 공유까지.{" "}
            <span className="text-[var(--brand)] font-medium">NEO 님 환영합니다.</span>
          </p>
        </header>

        {/* 실제 리스트는 클라이언트에서 정렬/검색 처리 */}
        <CommunityListClient />
      </section>
    </main>
  );
}
