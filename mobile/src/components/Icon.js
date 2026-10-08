import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";

// Mêmes pictogrammes que la version web (tracés 24 × 24).
const ICONS = {
  scan: [{ d: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M11 9v6M14 9v6M17 9v6" }],
  search: [{ c: [11, 11, 7] }, { d: "M20 20l-3.5-3.5" }],
  history: [{ c: [12, 12, 8.5] }, { d: "M12 7.5V12l3 2" }],
  flask: [{ d: "M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3M7.5 15h9" }],
  gear: [{ c: [12, 12, 3] }, { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" }],
  chev: [{ d: "M9 6l6 6-6 6" }],
  back: [{ d: "M15 5l-7 7 7 7" }],
  close: [{ d: "M6 6l12 12M18 6L6 18" }],
  star: [{ d: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" }],
  share: [{ d: "M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" }],
  shield: [{ d: "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" }, { d: "M9.5 12.5l2 2 3.5-4" }],
  torch: [{ d: "M8 3h8l-1 5h-6zM9 8h6v3l-1.5 2v8h-3v-8L9 11z" }],
  camera: [{ d: "M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" }, { c: [12, 13, 3.5] }],
  doc: [{ d: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 12h6M9 15.5h6M9 19h4" }],
  keyboard: [{ rect: [3, 6, 18, 12, 2] }, { d: "M7 10h.01M11 10h.01M15 10h.01M7 14h10" }],
  check: [{ d: "M5 12.5l4.5 4.5L19 7.5" }],
  question: [{ d: "M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.2-1.5 2.2v.6M12 18v.1" }],
  cross: [{ d: "M7 7l10 10M17 7L7 17" }],
  dash: [{ d: "M7 12h10" }],
  box: [{ d: "M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10" }],
  energy: [{ d: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.3 1.2-3.6 2.3-4.6.3 1.6 1 2.6 2 3.1C11 9 11.2 5.8 12 3z" }],
  sugars: [{ d: "M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" }],
  "saturated-fat": [{ d: "M12 3.5c3 4 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 3-6.5 6-10.5z" }],
  salt: [{ d: "M8 9h8l-1 11H9zM9 9c0-3 1.3-5 3-5s3 2 3 5" }],
  proteins: [{ d: "M12 4c3.3 0 6 3.4 6 8s-2.7 8-6 8-6-3.4-6-8 2.7-8 6-8z" }],
  fiber: [{ d: "M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7" }],
  fruits: [{ d: "M12 7c-4-2-8 1-7 6 .8 4 3.5 7 7 7s6.2-3 7-7c1-5-3-8-7-6zM12 7c0-2 1-3.5 3-4" }],
  external: [{ d: "M7 17L17 7M9 7h8v8" }],
};

export default function Icon({ name, size = 22, color = "#18211C", width = 2, fill = "none", flip = false }) {
  const shapes = ICONS[name] || ICONS.box;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={flip ? { transform: [{ scaleX: -1 }] } : null}>
      {shapes.map((s, i) => {
        const common = { stroke: color, strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round", fill };
        if (s.c) return <Circle key={i} {...common} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} />;
        if (s.rect) return <Rect key={i} {...common} x={s.rect[0]} y={s.rect[1]} width={s.rect[2]} height={s.rect[3]} rx={s.rect[4]} />;
        return <Path key={i} {...common} d={s.d} />;
      })}
    </Svg>
  );
}

// Le logo : la lettre ب sur fond vert.
export function Logo({ size = 36 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width={48} height={48} rx={12} fill="#14805A" />
      <Path d="M9.6 20.4c-.1 5.6 3.4 8.1 10.4 8.3l7.6.1c6.9 0 10.6-2.6 11-8.4.2-2.4-.3-4.8-1.2-6.6" fill="none" stroke="#FFFFFF" strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={23.6} cy={35.8} r={3.2} fill="#FFD27A" />
    </Svg>
  );
}
