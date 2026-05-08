"use client";
import { useEffect, useState } from "react";

const KEY = "cain_favs";

export default function StarButton({ id }: { id: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      setOn(set.has(id));
    } catch {}
  }, [id]);

  const toggle = () => {
    try {
      const raw = localStorage.getItem(KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      const set = new Set(arr);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      localStorage.setItem(KEY, JSON.stringify([...set]));
      setOn(!on);
    } catch {}
  };

  return (
    <button onClick={toggle} aria-label="즐겨찾기" className="px-2">
      <svg width="16" height="16" viewBox="0 0 24 24" className={on ? "fill-yellow-400" : "fill-transparent stroke-yellow-400"}>
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    </button>
  );
}
