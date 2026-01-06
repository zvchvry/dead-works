"use client";

import { useEffect, useState } from "react";

type Props = {
  text: string;
  speed?: number; // ms per character
};

export function Typewriter({ text, speed = 30 }: Props) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);

    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <p className="whitespace-pre-line">
      {displayed}
<span className="inline-block ml-0.5 scale-175 -translate-y-[2px] animate-pulse">
  ▮
</span>
    </p>
  );
}
