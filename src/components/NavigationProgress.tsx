"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number>(0);
  const [visible, setVisible] = useState(false);

  // pathname/searchParams が変わるたびに進捗バーをリセット
  useEffect(() => {
    setVisible(true);
    setProgress(20);
    const t1 = setTimeout(() => setProgress(50), 80);
    const t2 = setTimeout(() => setProgress(85), 240);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setVisible(false), 200);
    }, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, searchParams]);

  // リンククリック直後に表示を出す
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const a = t.closest("a");
      if (!a) return;
      const href = (a as HTMLAnchorElement).getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || a.target === "_blank") return;
      setVisible(true);
      setProgress(15);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed left-0 right-0 top-0 z-[100] h-0.5 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
