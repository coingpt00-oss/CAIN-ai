"use client";

import { useEffect, useState } from "react";

export default function TimeAgo({ iso }: { iso: string }) {
  // 최초에는 서버와 같은 텍스트(ISO)를 보여줘서 미스매치를 피함
  const [text, setText] = useState(iso);

  useEffect(() => {
    const d = new Date(iso);

    const fmt = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

    const update = () => {
      const sec = Math.round((Date.now() - d.getTime()) / 1000);
      let value = -sec;
      let unit: Intl.RelativeTimeFormatUnit = "second";

      if (Math.abs(sec) >= 60 && Math.abs(sec) < 3600) {
        value = -Math.round(sec / 60);
        unit = "minute";
      } else if (Math.abs(sec) >= 3600 && Math.abs(sec) < 86400) {
        value = -Math.round(sec / 3600);
        unit = "hour";
      } else if (Math.abs(sec) >= 86400) {
        value = -Math.round(sec / 86400);
        unit = "day";
      }

      setText(fmt.format(value, unit));
    };

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  // 서버가 보낸 ISO 텍스트와 달라도 경고를 막음
  return <span suppressHydrationWarning>{text}</span>;
}
