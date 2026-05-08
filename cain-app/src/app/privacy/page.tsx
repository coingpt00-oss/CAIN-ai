// src/app/privacy/page.tsx
import CainPrivacy from "@/components/legal/CainPrivacy";

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div className="py-10">
      <CainPrivacy />
    </div>
  );
}
