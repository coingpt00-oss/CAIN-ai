// 서버 컴포넌트라 가정
import Link from "next/link";
import { cookies } from "next/headers";

export default async function Nav() {
  const cookieStore = await cookies();
  const authed = Boolean(cookieStore.get("cain_token")?.value); // ← 너희 토큰/세션 쿠키 키에 맞춰 수정

  const Item = ({ href, label, locked }: { href: string; label: string; locked?: boolean }) => {
    if (locked && !authed) {
      return (
        <span
          title="회원가입 후 이용 가능합니다"
          className="px-3 py-2 opacity-50 cursor-not-allowed select-none"
        >
          🔒 {label}
        </span>
      );
    }
    return (
      <Link href={href} className="px-3 py-2 hover:text-[var(--brand)] transition">
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex items-center gap-1">
      <Item href="/pages/markets" label="코인 시세" />
      <Item href="/pages/charts" label="차트" />
      <Item href="/pages/news" label="뉴스" />
      <Item href="/pages/airdrops" label="에어드랍" locked />
      <Item href="/pages/events" label="이벤트" locked />
    </nav>
  );
}
