// Illustrations en couleur des rayons des classements (viewBox 48×48).
// Couleurs « naturelles » des aliments : aucune ne porte de verdict.
const S = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;

export const RANK_ART = {
  mueslis: S(`
    <path d="M7 24h34a17 17 0 0 1-34 0z" fill="#4C8DD9"/>
    <path d="M9 27h30a15.5 15.5 0 0 1-2 5H11a15.5 15.5 0 0 1-2-5z" fill="#3A76BF"/>
    <ellipse cx="24" cy="24" rx="17" ry="4" fill="#F3E3C3"/>
    <circle cx="16" cy="22" r="3.2" fill="#C98A45"/><circle cx="22" cy="20.5" r="3" fill="#DDA75F"/>
    <circle cx="28" cy="21.5" r="3.2" fill="#B9763A"/><circle cx="33" cy="22.5" r="2.6" fill="#DDA75F"/>
    <circle cx="19.5" cy="23.5" r="2" fill="#D9414F"/><circle cx="30.5" cy="24" r="2" fill="#6B4BB8"/>
    <circle cx="25" cy="23.8" r="1.8" fill="#D9414F"/>`),
  cereal_bars: S(`
    <g transform="rotate(-28 24 24)">
      <rect x="6" y="17" width="36" height="14" rx="4" fill="#C98A45"/>
      <circle cx="13" cy="22" r="2" fill="#8C5628"/><circle cx="20" cy="26" r="2.2" fill="#E9C27D"/>
      <circle cx="27" cy="21.5" r="1.8" fill="#8C5628"/><circle cx="23" cy="20" r="1.4" fill="#E9C27D"/>
      <circle cx="16" cy="27" r="1.5" fill="#E9C27D"/>
      <path d="M30 15h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H30z" fill="#F2B84B"/>
      <path d="M30 15v18" stroke="#D99A2B" stroke-width="2"/>
      <path d="M44 17l3 2-3 2 3 2-3 2 3 2-3 2" fill="none" stroke="#F2B84B" stroke-width="2" stroke-linejoin="round"/>
    </g>`),
  choco_biscuits: S(`
    <circle cx="24" cy="24" r="17" fill="#DDA75F"/>
    <circle cx="24" cy="24" r="17" fill="none" stroke="#C48A44" stroke-width="2"/>
    <circle cx="17" cy="18" r="2.8" fill="#5A3622"/><circle cx="28" cy="16" r="2.4" fill="#5A3622"/>
    <circle cx="31" cy="27" r="3" fill="#5A3622"/><circle cx="20" cy="29" r="2.6" fill="#5A3622"/>
    <circle cx="25" cy="23" r="1.8" fill="#5A3622"/><circle cx="14" cy="25" r="1.6" fill="#5A3622"/>`),
  candies: S(`
    <path d="M14 24L4 16v16z" fill="#F08AB0"/><path d="M34 24l10-8v16z" fill="#F08AB0"/>
    <circle cx="24" cy="24" r="11" fill="#E0457B"/>
    <path d="M17 17c4 4 4 10 0 14M24 13c3 5 3 17 0 22M31 17c-4 4-4 10 0 14" fill="none" stroke="#F8C6D8" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="20" cy="19" r="2" fill="#fff" opacity=".7"/>`),
  biscuits: S(`
    <rect x="7" y="11" width="34" height="26" rx="5" fill="#E8B964"/>
    <rect x="7" y="11" width="34" height="26" rx="5" fill="none" stroke="#D29A3E" stroke-width="2" stroke-dasharray="3 2.6"/>
    <g fill="#C08436"><circle cx="15" cy="19" r="1.3"/><circle cx="21" cy="19" r="1.3"/><circle cx="27" cy="19" r="1.3"/><circle cx="33" cy="19" r="1.3"/>
    <circle cx="15" cy="29" r="1.3"/><circle cx="21" cy="29" r="1.3"/><circle cx="27" cy="29" r="1.3"/><circle cx="33" cy="29" r="1.3"/></g>`),
  breakfast_cereals: S(`
    <rect x="11" y="6" width="26" height="36" rx="3" fill="#4C8DD9"/>
    <rect x="11" y="6" width="26" height="8" rx="3" fill="#3A76BF"/>
    <circle cx="24" cy="28" r="9" fill="#F2B84B"/>
    <path d="M17 29h14a7 7 0 0 1-14 0z" fill="#fff"/>
    <circle cx="21" cy="27" r="2" fill="#C98A45"/><circle cx="26" cy="26" r="2.2" fill="#DDA75F"/><circle cx="24" cy="28.5" r="1.6" fill="#C98A45"/>
    <rect x="15" y="17" width="18" height="3" rx="1.5" fill="#fff" opacity=".85"/>`),
  chocolates: S(`
    <g transform="rotate(-12 24 24)">
      <rect x="11" y="5" width="26" height="38" rx="3" fill="#6B4226"/>
      <g fill="#7F5133"><rect x="13.5" y="7.5" width="9.5" height="7" rx="1.2"/><rect x="25" y="7.5" width="9.5" height="7" rx="1.2"/>
      <rect x="13.5" y="16.5" width="9.5" height="7" rx="1.2"/><rect x="25" y="16.5" width="9.5" height="7" rx="1.2"/></g>
      <path d="M11 25h26v15a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" fill="#C7372F"/>
      <path d="M11 25l4 2 4-2 4 2 4-2 4 2 4-2 2 1" fill="none" stroke="#D9D9D9" stroke-width="2"/>
      <rect x="15" y="32" width="18" height="4" rx="2" fill="#F2B84B"/>
    </g>`),
  spreads: S(`
    <rect x="12" y="8" width="24" height="8" rx="2.5" fill="#F4F0E8" stroke="#D9D3C4" stroke-width="1.2"/>
    <path d="M12 16h24v20a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" fill="#7A4A2C"/>
    <rect x="15" y="22" width="18" height="12" rx="3" fill="#F6EBD6"/>
    <ellipse cx="22" cy="28" rx="3.2" ry="3.6" fill="#B9763A"/><path d="M22 24.4v-2" stroke="#6E8F3D" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="27.5" cy="28.5" rx="2.6" ry="3" fill="#8C5628"/>`),
  jams: S(`
    <path d="M10 10c4-3 24-3 28 0l-2 6H12z" fill="#F4F0E8"/>
    <g fill="#D9414F"><circle cx="16" cy="11" r="1.2"/><circle cx="22" cy="10" r="1.2"/><circle cx="28" cy="10" r="1.2"/><circle cx="33" cy="11.5" r="1.2"/></g>
    <rect x="12" y="15" width="24" height="2.4" rx="1.2" fill="#C98A45"/>
    <path d="M12 17h24v19a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" fill="#C42F49"/>
    <rect x="15.5" y="23" width="17" height="11" rx="2.5" fill="#F6EBD6"/>
    <path d="M24 25.5c-2.8 0-4 2.2-3 4.2s3 3 3 3 2-1 3-3-.2-4.2-3-4.2z" fill="#D9414F"/>
    <path d="M22.5 25.3l1.5 1 1.5-1" fill="none" stroke="#5E9B45" stroke-width="1.4"/>
    <rect x="14" y="19" width="3" height="10" rx="1.5" fill="#fff" opacity=".35"/>`),
  yogurts: S(`
    <path d="M11 14h26l-3.5 26a3 3 0 0 1-3 2.6H17.5a3 3 0 0 1-3-2.6z" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/>
    <path d="M11 14h26l-.8 6H11.8z" fill="#E3E0D6"/>
    <rect x="9" y="9" width="30" height="6" rx="2" fill="#4C8DD9"/>
    <path d="M24 25c-3 0-4.4 2.4-3.3 4.6S24 33 24 33s2.2-1.2 3.3-3.4S27 25 24 25z" fill="#E0455A"/>
    <path d="M22.4 24.8l1.6 1.1 1.6-1.1" fill="none" stroke="#5E9B45" stroke-width="1.4"/>`),
  desserts: S(`
    <ellipse cx="24" cy="38" rx="18" ry="4.5" fill="#E8EDF0"/>
    <path d="M13 36l3-20h16l3 20z" fill="#F4C64E"/>
    <path d="M16 16h16l.8 5c-3 2-5-1-8 0s-5 2-9 0z" fill="#9B4E1C"/>
    <ellipse cx="24" cy="16" rx="8" ry="2.4" fill="#B5651D"/>
    <rect x="17" y="24" width="2.4" height="9" rx="1.2" fill="#fff" opacity=".45"/>`),
  cheeses: S(`
    <path d="M5 31l31-16 7 5v14H5z" fill="#F6C445"/>
    <path d="M5 31l31-16 7 5-31 11z" fill="#FAD872"/>
    <path d="M5 31h38v3H5z" fill="#E3A92A"/>
    <circle cx="16" cy="35" r="2.4" fill="#E3A92A"/><circle cx="30" cy="36" r="1.8" fill="#E3A92A"/>
    <circle cx="27" cy="24" r="2.2" fill="#E8B437"/><circle cx="35" cy="21.5" r="1.5" fill="#E8B437"/><circle cx="18" cy="28.5" r="1.4" fill="#E8B437"/>`),
  ice_creams: S(`
    <path d="M15 24h18L24 45z" fill="#DDA75F"/>
    <path d="M17 26l11 9M21 25l9 7M15.5 27l8 7M31 26l-11 9M27 25l-9 7" stroke="#B9763A" stroke-width="1.3"/>
    <circle cx="24" cy="12.5" r="7.5" fill="#7FD3B4"/>
    <circle cx="18" cy="20" r="7" fill="#F28CB1"/><circle cx="30" cy="20" r="7" fill="#F6E2B3"/>
    <circle cx="16" cy="18" r="1.6" fill="#fff" opacity=".6"/>`),
  crisps: S(`
    <path d="M10 8h28l-2 4 2 26-2 4H12l-2-4 2-26z" fill="#E8593C"/>
    <path d="M10 8h28l-1 3H11zM10 42h28l-1-3H11z" fill="#C7432A"/>
    <ellipse cx="24" cy="25" rx="9" ry="8" fill="#FBE7B5"/>
    <path d="M17 26c2-6 12-7 14-2-1 4-4 6-8 6s-5-1-6-4z" fill="#F2B84B"/>
    <path d="M20 23.5c2-1.6 6-1.8 8 0" fill="none" stroke="#D99A2B" stroke-width="1.3" stroke-linecap="round"/>`),
  sodas: S(`
    <rect x="13" y="9" width="22" height="33" rx="5" fill="#D7362F"/>
    <path d="M14.5 9.5c0-2 4-3.5 9.5-3.5s9.5 1.5 9.5 3.5z" fill="#C9CED3"/>
    <rect x="13" y="9" width="22" height="3" fill="#B3BAC1"/>
    <path d="M13 26c5-5 17 3 22-2v6c-5 5-17-3-22 2z" fill="#fff"/>
    <rect x="16" y="14" width="3" height="22" rx="1.5" fill="#fff" opacity=".25"/>`),
  juices: S(`
    <path d="M13 12h20l-2.5 29a3 3 0 0 1-3 2.7h-9a3 3 0 0 1-3-2.7z" fill="#E6F0F5"/>
    <path d="M14.3 19h17.4l-1.9 21.5a2 2 0 0 1-2 1.8h-9.6a2 2 0 0 1-2-1.8z" fill="#F7A531"/>
    <path d="M29 4l-4 15" stroke="#4C8DD9" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="34" cy="13" r="7" fill="#F28A1E"/><circle cx="34" cy="13" r="5.3" fill="#FBC46B"/>
    <path d="M34 8v10M29 13h10M30.4 9.4l7.2 7.2M37.6 9.4l-7.2 7.2" stroke="#F28A1E" stroke-width="1"/>`),
  breads: S(`
    <g transform="rotate(-35 24 24)">
      <rect x="3" y="17" width="42" height="14" rx="7" fill="#D99A4E"/>
      <rect x="3" y="17" width="42" height="6" rx="3" fill="#E8B46A"/>
      <path d="M11 20l4 6M19 20l4 6M27 20l4 6M35 20l4 6" stroke="#B3702E" stroke-width="2.2" stroke-linecap="round"/>
    </g>`),
  meals: S(`
    <circle cx="24" cy="25" r="19" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/><circle cx="24" cy="25" r="14" fill="none" stroke="#ECE7DC" stroke-width="1.5"/>
    <path d="M12 26c2-7 10-8 14-6s6 8 1 11-13 1-15-5z" fill="#C0683B"/>
    <circle cx="30" cy="22" r="2.6" fill="#5E9B45"/><circle cx="33" cy="26" r="2.4" fill="#6FB04F"/><circle cx="30.5" cy="29.5" r="2.4" fill="#5E9B45"/>
    <rect x="18" y="31" width="9" height="3" rx="1.5" fill="#F28A1E" transform="rotate(-15 22 32)"/>
    <path d="M19 23c1.5-1 3.5-1 5 0" fill="none" stroke="#E08A5C" stroke-width="1.4" stroke-linecap="round"/>`),
  pizzas: S(`
    <path d="M24 44L8 10c10-5 22-5 32 0z" fill="#F6C445"/>
    <path d="M8 10c10-5 22-5 32 0l-1.8 4c-9-4-19.4-4-28.4 0z" fill="#D99A4E"/>
    <circle cx="19" cy="19" r="3.2" fill="#C7372F"/><circle cx="28.5" cy="20" r="3" fill="#C7372F"/><circle cx="24" cy="30" r="2.8" fill="#C7372F"/>
    <path d="M21 25c1-1.5 3-1.8 3.6-.6M27 27c.8-1.2 2.4-1.2 2.8-.2" fill="none" stroke="#5E9B45" stroke-width="2" stroke-linecap="round"/>`),
  sausages: S(`
    <path d="M7 30c4-10 16-14 26-12" fill="none" stroke="#B4513A" stroke-width="9" stroke-linecap="round"/>
    <path d="M14 38c6-7 18-9 27-5" fill="none" stroke="#C9623F" stroke-width="9" stroke-linecap="round"/>
    <path d="M10 27c3-6 10-9 17-9M17 35c5-4 12-5 19-3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".45"/>
    <circle cx="35" cy="17.5" r="2" fill="#8C3A26"/><circle cx="42.5" cy="33.8" r="2" fill="#9C4428"/>`),
  sauces: S(`
    <rect x="20" y="4" width="8" height="6" rx="1.5" fill="#F4F0E8"/>
    <path d="M19 10h10v4l4 6v18a5 5 0 0 1-5 5h-8a5 5 0 0 1-5-5V20l4-6z" fill="#D7362F"/>
    <rect x="17" y="24" width="14" height="10" rx="2.5" fill="#F6EBD6"/>
    <path d="M24 26.5c-2 0-3 1.6-2.2 3.2S24 32 24 32s1.4-.7 2.2-2.3-.2-3.2-2.2-3.2z" fill="#D7362F"/>
    <rect x="18.5" y="15" width="2.4" height="7" rx="1.2" fill="#fff" opacity=".35"/>`),
  toothpastes: S(`
    <g transform="rotate(-30 24 24)">
      <path d="M8 18h26l6 2v8l-6 2H8a2 2 0 0 1-2-2V20a2 2 0 0 1 2-2z" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/>
      <rect x="6" y="18" width="5" height="12" rx="1.5" fill="#3A76BF"/>
      <path d="M15 18v12M20 18v12" stroke="#4C8DD9" stroke-width="2.4"/><path d="M25 18v12" stroke="#E0455A" stroke-width="2.4"/>
      <rect x="40" y="21" width="5" height="6" rx="1.2" fill="#4C8DD9"/>
    </g>`),
  deodorants: S(`
    <rect x="15" y="16" width="18" height="27" rx="5" fill="#3FA7A0"/>
    <path d="M15 16c0-6 4-10 9-10s9 4 9 10z" fill="#E8F5F3" stroke="#C3DFDB" stroke-width="1.2"/>
    <rect x="15" y="15" width="18" height="3" fill="#2F8C86"/>
    <rect x="18.5" y="23" width="11" height="12" rx="2.5" fill="#E8F5F3"/>
    <path d="M24 26c-1.6 2-2.4 3.2-2.4 4.4a2.4 2.4 0 0 0 4.8 0c0-1.2-.8-2.4-2.4-4.4z" fill="#3FA7A0"/>`),
  shower_gels: S(`
    <rect x="18" y="5" width="12" height="6" rx="2" fill="#2F79B5"/>
    <path d="M16 11h16l2 6v21a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5V17z" fill="#4FB3E8"/>
    <rect x="17" y="21" width="14" height="10" rx="2.5" fill="#E6F4FB"/>
    <circle cx="36" cy="14" r="4" fill="none" stroke="#8ACFF0" stroke-width="1.6"/><circle cx="40" cy="22" r="2.6" fill="none" stroke="#8ACFF0" stroke-width="1.4"/><circle cx="35" cy="28" r="1.8" fill="none" stroke="#8ACFF0" stroke-width="1.3"/>
    <rect x="17.5" y="33" width="2.4" height="6" rx="1.2" fill="#fff" opacity=".4"/>`),
  shampoos: S(`
    <rect x="19" y="4" width="10" height="5" rx="1.5" fill="#6A4BB8"/>
    <path d="M17 9h14v4c3 2 4 4 4 8v17a5 5 0 0 1-5 5H18a5 5 0 0 1-5-5V21c0-4 1-6 4-8z" fill="#8E6CD9"/>
    <rect x="16" y="23" width="16" height="11" rx="2.5" fill="#EFE9FB"/>
    <path d="M20 28.5c2-2 6-2 8 0" fill="none" stroke="#8E6CD9" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M38 9c-1.6 2.2-2.4 3.4-2.4 4.6a2.4 2.4 0 0 0 4.8 0c0-1.2-.8-2.4-2.4-4.6z" fill="#8ACFF0"/>`),
  conditioners: S(`
    <path d="M15 6h18a3 3 0 0 1 3 3v24l-4 4H16l-4-4V9a3 3 0 0 1 3-3z" fill="#E9A23B"/>
    <rect x="16" y="37" width="16" height="6" rx="2" fill="#B9771E"/>
    <rect x="16" y="12" width="16" height="14" rx="2.5" fill="#FCEFD8"/>
    <path d="M20 16c4 0 4 6 8 6M20 22c2 0 3-2 5-2" fill="none" stroke="#E9A23B" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="14" y="28" width="2.4" height="5" rx="1.2" fill="#fff" opacity=".35"/>`),
  body_creams: S(`
    <path d="M22 4h12v3h-8v4h-4z" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/>
    <rect x="20" y="10" width="8" height="5" rx="1" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/>
    <rect x="14" y="15" width="20" height="28" rx="6" fill="#F2D2B8"/>
    <rect x="17" y="22" width="14" height="12" rx="3" fill="#FFF7F0"/>
    <path d="M24 25l1.4 2.8 3 .4-2.2 2 .6 3-2.8-1.5-2.8 1.5.6-3-2.2-2 3-.4z" fill="#E7A97F"/>`),
  face_creams: S(`
    <rect x="8" y="16" width="32" height="8" rx="3" fill="#F3A6B8"/>
    <path d="M9 24h30v10a6 6 0 0 1-6 6H15a6 6 0 0 1-6-6z" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/>
    <path d="M14 16c1-5 6-8 10-6 2-3 8-2 9 1 2 0 4 2 4 5z" fill="#FFF7F0" stroke="#E4DCCF" stroke-width="1.2"/>
    <rect x="16" y="28" width="16" height="6" rx="3" fill="#F3A6B8" opacity=".8"/>`),
  cleansers: S(`
    <path d="M20 6h8v5h-8z" fill="#2F8FA3"/>
    <path d="M18 11h12a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V17a6 6 0 0 1 6-6z" fill="#7FC8D6" opacity=".9"/>
    <rect x="15" y="20" width="18" height="12" rx="3" fill="#EAF7F9"/>
    <circle cx="35" cy="35" r="8" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/>
    <circle cx="35" cy="35" r="4.5" fill="none" stroke="#ECE7DC" stroke-width="1.2" stroke-dasharray="2 2"/>`),
  lip_balms: S(`
    <rect x="17" y="22" width="14" height="21" rx="3" fill="#7DBE8A"/>
    <rect x="17" y="22" width="14" height="4" fill="#5E9B6B"/>
    <path d="M19 22v-9c0-3 2-5 5-6 3 1 5 3 5 6v9z" fill="#F6C6A6"/>
    <path d="M19 13c3-1 7 0 10 2" fill="none" stroke="#fff" stroke-width="1.4" opacity=".5"/>
    <rect x="20" y="30" width="8" height="6" rx="2" fill="#E9F5EC"/>`),
  hand_creams: S(`
    <g transform="rotate(-30 24 24)">
      <path d="M6 16h28l7 4v8l-7 4H6z" fill="#F7C9A9"/>
      <path d="M6 16v16" stroke="#E7A97F" stroke-width="3"/>
      <rect x="41" y="20.5" width="4.5" height="7" rx="1.4" fill="#E7A97F"/>
      <path d="M22 28.5s-6-3.5-6-7.3a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 3.8-6 7.3-6 7.3z" fill="#E0455A"/>
    </g>`),
  sunscreens: S(`
    <rect x="13" y="38" width="16" height="6" rx="2" fill="#C7641A"/>
    <path d="M15 10h12a3 3 0 0 1 3 3v24H12V13a3 3 0 0 1 3-3z" fill="#F28A1E"/>
    <circle cx="21" cy="24" r="5" fill="#FFD25A"/>
    <path d="M21 15.5v2.5M21 30v2.5M12.5 24H15M27 24h2.5M15 18l1.8 1.8M25.2 28.2L27 30M27 18l-1.8 1.8M16.8 28.2L15 30" stroke="#FFD25A" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="37" cy="12" r="5.5" fill="#FFD25A"/>`),
  lipsticks: S(`
    <rect x="16" y="28" width="16" height="15" rx="2" fill="#D9A83C"/>
    <rect x="16" y="28" width="16" height="3" fill="#B98A26"/>
    <rect x="18" y="20" width="12" height="9" fill="#E8C25A"/>
    <path d="M19 20V11l10-5v14z" fill="#C7372F"/>
    <path d="M21 19v-7" stroke="#fff" stroke-width="1.4" opacity=".4" stroke-linecap="round"/>`),
  mascaras: S(`
    <g transform="rotate(35 24 24)">
      <rect x="18" y="20" width="12" height="24" rx="3" fill="#E86AA0"/>
      <rect x="18" y="16" width="12" height="5" rx="1.5" fill="#4A4A60"/>
      <path d="M24 16V5" stroke="#4A4A60" stroke-width="2"/>
      <path d="M21 5h6M21 7.5h6M21 10h6M21 12.5h6" stroke="#4A4A60" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="20" y="24" width="2.4" height="15" rx="1.2" fill="#fff" opacity=".35"/>
    </g>`),
  nail_polishes: S(`
    <rect x="19" y="4" width="10" height="16" rx="2" fill="#4A4A60"/>
    <rect x="17" y="19" width="14" height="4" rx="1" fill="#4A4A60"/>
    <path d="M14 23h20a3 3 0 0 1 3 3v12a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5V26a3 3 0 0 1 3-3z" fill="#E0457B"/>
    <rect x="14" y="26" width="3" height="12" rx="1.5" fill="#fff" opacity=".35"/>`),
  eye_makeup: S(`
    <rect x="6" y="10" width="36" height="28" rx="5" fill="#4A4A60" stroke="#6E6E88" stroke-width="1.2"/>
    <circle cx="15" cy="19" r="5" fill="#C9A1E8"/><circle cx="27" cy="19" r="5" fill="#8ACFF0"/>
    <circle cx="15" cy="30" r="5" fill="#E7A97F"/><circle cx="27" cy="30" r="5" fill="#9B6A4E"/>
    <rect x="35" y="14" width="3" height="20" rx="1.5" fill="#D9A83C"/>`),
  complexion: S(`
    <circle cx="20" cy="27" r="15" fill="#D9A83C"/>
    <circle cx="20" cy="27" r="12" fill="#E8B996"/>
    <circle cx="16" cy="23" r="3.5" fill="#F2CDAF"/>
    <path d="M30 22l10-14" stroke="#7A4A2C" stroke-width="3" stroke-linecap="round"/>
    <path d="M38 6c3-3 8-1 7 3s-5 4-7 3z" fill="#F08AB0"/>`),
  makeup_other: S(`
    <path d="M7 18c0-3 2-5 5-5h24c3 0 5 2 5 5v18c0 3-2 5-5 5H12c-3 0-5-2-5-5z" fill="#8E6CD9"/>
    <path d="M7 20h34" stroke="#6A4BB8" stroke-width="2.4"/>
    <rect x="21" y="16" width="6" height="7" rx="1.5" fill="#D9A83C"/>
    <path d="M16 13V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" fill="none" stroke="#6A4BB8" stroke-width="2.4"/>
    <path d="M24 28l1.6 3.4 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#F3C6E0"/>`)
};

// Familles d'aliments, pour les produits sans photo hors des rayons ci-dessus
export const FAMILY_ART = {
  vegetable: S(`
    <path d="M30 14L8 40c-1 1.2.6 2.8 1.8 1.8L36 20z" fill="#F28A1E"/>
    <path d="M19 30l3 1M24 25l3 1M14 36l2.4.6" stroke="#C7641A" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M31 15c0-5 2-9 6-10-1 4-2 7-4 9M33 17c4-1 8 0 10 3-4 1-7 0-9-1M32 15c-3-3-4-7-2-10 2 3 3 6 3 9" fill="#5E9B45"/>`),
  poultry: S(`
    <path d="M30 6a12 12 0 0 1 0 24c-2.4 0-4.6-.7-6.4-1.9L17 34.6" fill="#C9813F"/>
    <circle cx="29" cy="18" r="12" fill="#D9934E"/>
    <path d="M22 26l-6 6" stroke="#F4EEE2" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="13" cy="33" r="3.6" fill="#F4EEE2"/><circle cx="16.5" cy="37.5" r="3.6" fill="#F4EEE2"/>
    <path d="M24 12c2-2.6 6-3.2 9-1.6" fill="none" stroke="#F2B878" stroke-width="2.2" stroke-linecap="round"/>`),
  meat: S(`
    <path d="M10 15c7-7 22-7 28 1 5 7 1 19-10 20-5 .4-7-2.6-11-3-5-.4-9-3.5-8.6-9 .3-4 .6-6.6 1.6-9z" fill="#C2473C"/>
    <path d="M10 15c7-7 22-7 28 1" fill="none" stroke="#F3E1D2" stroke-width="3" stroke-linecap="round"/>
    <circle cx="28" cy="21" r="4.6" fill="#F3E1D2"/><circle cx="28" cy="21" r="2" fill="#E4C7B0"/>
    <path d="M15 24c3 1 5 3 6 6" fill="none" stroke="#E0786A" stroke-width="1.8" stroke-linecap="round"/>`),
  fish: S(`
    <path d="M4 24c7-10 21-12 30-3l9-7v20l-9-7c-9 9-23 7-30-3z" fill="#5FA8D3"/>
    <path d="M4 24c7 10 21 12 30 3" fill="#8CC5E6"/>
    <circle cx="13" cy="22" r="1.8" fill="#24415A"/>
    <path d="M21 17c2 3 2 11 0 14" fill="none" stroke="#3E86B5" stroke-width="1.8" stroke-linecap="round"/>`),
  dairy: S(`
    <path d="M16 6h16v5l4 6v24a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V17l4-6z" fill="#FFFFFF" stroke="#D9D3C4" stroke-width="1.2"/>
    <path d="M12 17h24v6H12z" fill="#4C8DD9"/>
    <rect x="16" y="4" width="16" height="4" rx="1" fill="#3A76BF"/>
    <path d="M17 30c2-2 4-2 6 0s4 2 6 0" fill="none" stroke="#8CB8EC" stroke-width="2" stroke-linecap="round"/>`),
  drink: S(`
    <rect x="19" y="4" width="10" height="5" rx="1.5" fill="#3A76BF"/>
    <path d="M18 9h12v4l3 5v21a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V18l3-5z" fill="#BFE3F5"/>
    <path d="M15 24h18v15a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z" fill="#8ACFF0"/>
    <rect x="15" y="19" width="18" height="6" fill="#4C8DD9"/>
    <rect x="18" y="28" width="2.4" height="10" rx="1.2" fill="#fff" opacity=".5"/>`),
  plant: S(`
    <path d="M24 14c-7-4-16 0-14 11 1.4 8 6.6 15 14 13 7.4 2 12.6-5 14-13 2-11-7-15-14-11z" fill="#6FB04F"/>
    <path d="M24 14c0-4 1.6-7 5-9" fill="none" stroke="#7A4A2C" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M26 10c4-3 9-2 11 1-4 2-8 2-11-1z" fill="#4E8E37"/>
    <path d="M15 20c-1.6 2-2 5-1.4 7.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".45"/>`)
};

// Onglet Santé : un dessin par nutriment (le niveau reste donné par le point et la barre)
export const NUT_ART = {
  energy: S(`
    <path d="M24 4c2.4 7.6 12 11.6 12 22a12 12 0 0 1-24 0c0-5.4 2.8-8.6 5.4-10.8.6 3.6 2.2 6 4.8 7.2C20.8 15.4 21.6 9.4 24 4z" fill="#F59A2C"/>
    <path d="M24 4c2.4 7.6 12 11.6 12 22a12 12 0 0 1-12 12c5-2 8-6 8-12 0-9-6-13-8-22z" fill="#E07F16"/>
    <path d="M24 24c1.2 3.4 5.6 5.4 5.6 10a5.6 5.6 0 0 1-11.2 0c0-2.6 1.6-4.2 2.8-5 .4 1.6 1.2 2.6 2.2 3-.4-2.8-.2-5.4.6-8z" fill="#FFD45E"/>
    <path d="M16 22c.6-2 1.6-3.6 2.8-4.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>`),
  sugars: S(`
    <path d="M6 23l11-5.5L28 23v13l-11 5.5L6 36z" fill="#FFFFFF"/>
    <path d="M6 23l11 5.5V41.5L6 36z" fill="#E6EBF0"/><path d="M28 23l-11 5.5v13l11-5.5z" fill="#CFD8E1"/>
    <path d="M21 12.5L31 7.5l10 5v11.5l-10 5-10-5z" fill="#FFFFFF"/>
    <path d="M21 12.5l10 5v11.5l-10-5z" fill="#E6EBF0"/><path d="M41 12.5l-10 5v11.5l10-5z" fill="#CFD8E1"/>
    <g fill="#BAC6D2"><circle cx="11" cy="30" r=".9"/><circle cx="13.5" cy="34" r=".9"/><circle cx="23" cy="31" r=".9"/><circle cx="35" cy="21" r=".9"/><circle cx="26" cy="18" r=".9"/></g>`),
  "saturated-fat": S(`
    <path d="M5 28l9-9h29v11l-7 7H5z" fill="#E8B530"/>
    <path d="M5 28l9-9h29l-9 9z" fill="#FBE07A"/>
    <path d="M5 28h29v9H5z" fill="#F4CB47"/>
    <path d="M34 28l9-9v11l-9 7z" fill="#D29A1E"/>
    <path d="M13 22h18" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>
    <path d="M9 31h11" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45"/>`),
  salt: S(`
    <path d="M15 19h18l-2.4 23H17.4z" fill="#FFFFFF"/>
    <path d="M24 19h9l-2.4 23H24z" fill="#E2E8EE"/>
    <path d="M15 19c0-6.6 4-11 9-11s9 4.4 9 11z" fill="#A9B2BC"/>
    <path d="M24 8c5 0 9 4.4 9 11h-9z" fill="#8E98A3"/>
    <g fill="#5E6873"><circle cx="20.5" cy="13.5" r="1.2"/><circle cx="24" cy="11.4" r="1.2"/><circle cx="27.5" cy="13.5" r="1.2"/></g>
    <rect x="14" y="17.6" width="20" height="3" rx="1.2" fill="#7D8792"/>
    <path d="M19 25v12" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>`),
  proteins: S(`
    <path d="M24 5c8.4 0 15 9.8 15 20a15 15 0 0 1-30 0C9 14.8 15.6 5 24 5z" fill="#EBC79C"/>
    <path d="M24 5c8.4 0 15 9.8 15 20a15 15 0 0 1-15 15c6-3 9-9 9-16 0-9-4-16-9-19z" fill="#D9AE7E"/>
    <path d="M16 16c1.6-3.6 4.2-6 7-6.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".65"/>`),
  fiber: S(`
    <path d="M24 45V13" stroke="#B5852A" stroke-width="2.6" stroke-linecap="round"/>
    <g fill="#EBC06C"><ellipse cx="24" cy="9" rx="3.2" ry="5.4"/>
    <ellipse cx="18.6" cy="17" rx="3.2" ry="5.4" transform="rotate(-32 18.6 17)"/><ellipse cx="18.6" cy="25.4" rx="3.2" ry="5.4" transform="rotate(-32 18.6 25.4)"/><ellipse cx="18.6" cy="33.8" rx="3.2" ry="5.4" transform="rotate(-32 18.6 33.8)"/></g>
    <g fill="#D9A44A"><ellipse cx="29.4" cy="17" rx="3.2" ry="5.4" transform="rotate(32 29.4 17)"/><ellipse cx="29.4" cy="25.4" rx="3.2" ry="5.4" transform="rotate(32 29.4 25.4)"/><ellipse cx="29.4" cy="33.8" rx="3.2" ry="5.4" transform="rotate(32 29.4 33.8)"/></g>
    <path d="M22.6 6.6c.4-1 1-1.6 1.6-2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`),
  fruits: S(`
    <path d="M24 15c-6.4-3.8-14.6 0-13.2 10.4 1.2 7.8 6.4 14.2 13.2 12.4 6.8 1.8 12-4.6 13.2-12.4C38.6 15 30.4 11.2 24 15z" fill="#E2465A"/>
    <path d="M24 15c6.4-3.8 14.6 0 13.2 10.4-1.2 7.8-6.4 14.2-13.2 12.4 4-3 7-8 7-14 0-5-2-7.4-7-8.8z" fill="#C4324A"/>
    <path d="M24 15c0-4.2 1.4-6.8 4.6-8.8" fill="none" stroke="#7A4A2C" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M26.4 10.6c3.6-3.2 8.4-2.6 10.6.4-3.8 2.2-7.4 2.2-10.6-.4z" fill="#5FA845"/>
    <path d="M15.4 20.4c-1.4 2.2-1.8 4.8-1.2 7.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`),
  additives: S(`
    <path d="M19 6h10M20 6v11L10 36a3 3 0 0 0 2.6 4.5h22.8A3 3 0 0 0 38 36L28 17V6" fill="#EEF4F8" stroke="#B2BFCA" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M14.4 28h19.2L38 36a3 3 0 0 1-2.6 4.5H12.6A3 3 0 0 1 10 36z" fill="#9B79E2"/>
    <path d="M24 28h9.6L38 36a3 3 0 0 1-2.6 4.5H24z" fill="#7F5FD0"/>
    <circle cx="19" cy="34" r="2" fill="#E3D8FA"/><circle cx="25" cy="31.5" r="1.4" fill="#E3D8FA"/><circle cx="29" cy="36" r="1.1" fill="#E3D8FA"/>
    <path d="M22.4 9v8.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`)
};

// Onglet Planète : un dessin par critère
export const ENV_ART = {
  origin: S(`
    <circle cx="24" cy="24" r="18" fill="#3D84DB"/>
    <path d="M24 6a18 18 0 0 1 0 36c8-4 12-11 12-18S32 10 24 6z" fill="#2F6FC0"/>
    <path d="M14 13c3 0 4 2 7 2s3 3 1 5-5 1-6 4 2 5 0 7-6-1-7-4c-1-4 0-10 5-14z" fill="#6DB24E"/>
    <path d="M29 9c3 1 6 3 7 6-2 1-4 0-5 2s1 4 3 5 4 4 2 8-6 5-7 2 1-6-1-8-4-3-3-7 2-5 4-8z" fill="#5A9C3E"/>
    <path d="M12 18c1.6-3.6 4.4-6.2 8-7.4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>`),
  prod: S(`
    <path d="M6 42V24l9 5v-5l9 5v-5l9 5V14h7v28z" fill="#909AA5"/>
    <path d="M33 14h7v28h-7z" fill="#76808B"/>
    <path d="M6 42h34v2H6z" fill="#6A737D"/>
    <rect x="32" y="10" width="9" height="4" rx="1" fill="#6A737D"/>
    <circle cx="38" cy="6" r="3.2" fill="#D9DEE3"/><circle cx="43" cy="4.6" r="2.4" fill="#E8EBEE"/><circle cx="34.5" cy="5" r="2" fill="#E8EBEE"/>
    <g fill="#F4CB47"><rect x="10" y="32" width="4" height="4" rx="1"/><rect x="19" y="32" width="4" height="4" rx="1"/><rect x="28" y="32" width="4" height="4" rx="1"/></g>`),
  bio: S(`
    <path d="M9 39C7 22 18 8 41 7c1 21-12 34-32 32z" fill="#5FA845"/>
    <path d="M9 39C7 22 18 8 41 7 30 18 19 29 9 39z" fill="#86C764"/>
    <path d="M9 39C17 30 26 21 35 13" fill="none" stroke="#3B7429" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M18 30l-1-7M24 24l-1-6M22 28l7 1M28 22l6 .5" stroke="#3B7429" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`),
  palm: S(`
    <path d="M22.4 20c-1 8-1 16 1.4 24h5.6c-2.4-8-2.4-16-1.4-24z" fill="#A06E40"/>
    <path d="M25.6 20h2.4c-1 8-1 16 1.4 24h-3c-1.6-8-1.6-16-.8-24z" fill="#865830"/>
    <path d="M24 27h4M24 33h4.6M24.4 39h5" stroke="#6E4524" stroke-width="1.4"/>
    <path d="M26 20c-4-6-11-8-19-5 6 0 11 2 14 6z" fill="#4E8E37"/>
    <path d="M26 20c4-6 11-8 19-5-6 0-11 2-14 6z" fill="#3F7A2C"/>
    <path d="M26 20c-1-6-6-11-14-12 5 3 8 7 10 12z" fill="#6DB24E"/>
    <path d="M26 20c1-6 6-11 14-12-5 3-8 7-10 12z" fill="#5A9C3E"/>
    <circle cx="24.4" cy="22" r="2.2" fill="#C7641A"/><circle cx="28.2" cy="22.6" r="2.2" fill="#DB7A2C"/>`),
  pack: S(`
    <path d="M6 16l18-8 18 8v18l-18 8-18-8z" fill="#D49E57"/>
    <path d="M24 24l18-8v18l-18 8z" fill="#BD8541"/>
    <path d="M6 16l18 8 18-8-18-8z" fill="#E9C285"/>
    <path d="M15 12l18 8v6" fill="none" stroke="#F6E6CB" stroke-width="3.2"/>
    <path d="M10 22v7" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45"/>
    <path d="M30 32l3-2.2 3 2.2M33 29.8V37" fill="none" stroke="#3F7A2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
};

// Additifs : origine en un coup d'œil (deux tons et un reflet, pour rester lisible en petit)
export const ORIGIN_ART = {
  plant: S(`
    <path d="M8 40C6 22 18 8 41 7c1 21-12 34-33 33z" fill="#5FA845"/>
    <path d="M8 40C6 22 18 8 41 7 30 18 18 29 8 40z" fill="#86C764"/>
    <path d="M8 40C17 30 26 21 35 13" fill="none" stroke="#3B7429" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M17 31l-1-7M23 25l-1-6M21 29l7 1M27 23l6 .5" stroke="#3B7429" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`),
  animal: S(`
    <path d="M24 23c6 0 11 6 11 11 0 4-3 6-6 6-2 0-3-1-5-1s-3 1-5 1c-3 0-6-2-6-6 0-5 5-11 11-11z" fill="#8A5A3C"/>
    <path d="M24 23c6 0 11 6 11 11-6-4-16-4-22 0 0-5 5-11 11-11z" fill="#A9744F"/>
    <g fill="#8A5A3C"><ellipse cx="10.5" cy="21" rx="4.2" ry="5.4" transform="rotate(-20 10.5 21)"/><ellipse cx="18.5" cy="12" rx="4.2" ry="5.6" transform="rotate(-8 18.5 12)"/>
    <ellipse cx="29.5" cy="12" rx="4.2" ry="5.6" transform="rotate(8 29.5 12)"/><ellipse cx="37.5" cy="21" rx="4.2" ry="5.4" transform="rotate(20 37.5 21)"/></g>
    <g fill="#C08B63"><circle cx="17.4" cy="10" r="1.4"/><circle cx="28.4" cy="10" r="1.4"/><circle cx="9.6" cy="19" r="1.3"/><circle cx="36.4" cy="19" r="1.3"/></g>`),
  insect: S(`
    <path d="M18 9l3 4M30 9l-3 4" stroke="#5C5C74" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M11 23l-5-3M10 31H5M13 38l-4 4M37 23l5-3M38 31h5M35 38l4 4" stroke="#5C5C74" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="24" cy="16" r="5.5" fill="#3A3A4C"/>
    <path d="M24 18c8 0 14 6 14 13s-6 12-14 12-14-5-14-12 6-13 14-13z" fill="#D63A4F"/>
    <path d="M24 18v25" stroke="#3A3A4C" stroke-width="1.8"/>
    <g fill="#3A3A4C"><circle cx="17.5" cy="27" r="2.6"/><circle cx="30.5" cy="27" r="2.6"/><circle cx="18.5" cy="36" r="2.2"/><circle cx="29.5" cy="36" r="2.2"/></g>
    <path d="M14 26c1-3 3-5 6-6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>`),
  animal_product: S(`
    <path d="M19 7c6.6 0 12 9.6 12 18a12 12 0 0 1-24 0c0-8.4 5.4-18 12-18z" fill="#F1D9B5"/>
    <path d="M19 7c6.6 0 12 9.6 12 18 0 6.6-5.4 12-12 12 4-3 6-8 6-13 0-8-3-14.4-6-17z" fill="#E2C193"/>
    <path d="M12 17c1-3 3-5.4 5-6.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
    <path d="M35 21c3.6 4.6 6.6 8 6.6 12a6.6 6.6 0 0 1-13.2 0c0-4 3-7.4 6.6-12z" fill="#FFFFFF"/>
    <path d="M35 21c3.6 4.6 6.6 8 6.6 12a6.6 6.6 0 0 1-6.6 6.6c2-1.6 3-4 3-6.6 0-4-1.4-8-3-12z" fill="#DCE6EE"/>`),
  maybe: S(`
    <circle cx="24" cy="24" r="19" fill="#EDE6D8"/>
    <path d="M24 5a19 19 0 0 0 0 38z" fill="#DDEBD3"/>
    <path d="M9 33c-1-10 5-17 14-17 1 10-5 17-14 17z" fill="#5FA845"/>
    <path d="M9 33c4-5 8-9 13-13" fill="none" stroke="#3B7429" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="33" cy="32" rx="5.2" ry="4.6" fill="#8A5A3C"/>
    <g fill="#8A5A3C"><ellipse cx="26.5" cy="25.5" rx="2.2" ry="2.8"/><ellipse cx="31" cy="21.5" rx="2.2" ry="2.8"/><ellipse cx="36" cy="21.5" rx="2.2" ry="2.8"/><ellipse cx="40" cy="25.5" rx="2.2" ry="2.8"/></g>`),
  unknown: S(`
    <circle cx="24" cy="24" r="18" fill="#7C858F"/>
    <path d="M24 6a18 18 0 0 1 0 36 22 22 0 0 0 0-36z" fill="#6A737D"/>
    <path d="M18.5 19a5.5 5.5 0 1 1 7.6 5.1c-1.4.6-2.1 1.8-2.1 3.4v1" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="24" cy="34.5" r="2.2" fill="#fff"/>`)
};

// Allergènes du profil (les 14 allergènes à déclaration obligatoire en Europe)
export const ALLERGEN_ART = {
  "en:gluten": NUT_ART.fiber,
  "en:milk": FAMILY_ART.dairy,
  "en:eggs": NUT_ART.proteins,
  "en:nuts": S(`
    <path d="M24 16c8 0 13 6 13 13s-6 14-13 14-13-7-13-14 5-13 13-13z" fill="#B9763A"/>
    <path d="M24 16c8 0 13 6 13 13s-6 14-13 14c5-3 7-8 7-14s-3-11-7-13z" fill="#9A5E2B"/>
    <path d="M10 19c2-7 8-11 14-11s12 4 14 11c-9-4-19-4-28 0z" fill="#7A4A2C"/>
    <path d="M24 8V4" stroke="#7A4A2C" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M16 26c.6-2 1.8-3.4 3.4-4.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45"/>`),
  "en:peanuts": S(`
    <g transform="rotate(-35 24 24)">
      <path d="M24 4c6 0 9 4.4 9 9 0 3-2 5-2 7s3 4 3 9c0 6-4.6 11-10 11s-10-5-10-11c0-5 3-7 3-9s-2-4-2-7c0-4.6 3-9 9-9z" fill="#E6C287"/>
      <path d="M24 4c6 0 9 4.4 9 9 0 3-2 5-2 7s3 4 3 9c0 6-4.6 11-10 11 3-3 5-7 5-11 0-5-3-7-3-9s2-4 2-7c0-4.6-1-7-4-9z" fill="#CFA768"/>
      <g fill="#B98C4E"><circle cx="21" cy="12" r="1"/><circle cx="26" cy="15" r="1"/><circle cx="20" cy="30" r="1"/><circle cx="25" cy="34" r="1"/><circle cx="27" cy="27" r="1"/></g>
    </g>`),
  "en:soybeans": S(`
    <path d="M8 34C10 18 24 8 40 10c2 14-12 28-32 24z" fill="#7DBE45"/>
    <path d="M8 34C10 18 24 8 40 10 30 18 20 26 8 34z" fill="#9BD162"/>
    <g fill="#E3EFA8"><ellipse cx="17" cy="27" rx="4.2" ry="3.6"/><ellipse cx="24.5" cy="21.5" rx="4.2" ry="3.6"/><ellipse cx="32" cy="16" rx="4" ry="3.4"/></g>`),
  "en:fish": FAMILY_ART.fish,
  "en:crustaceans": S(`
    <path d="M36 12c-12-4-26 4-26 16 0 6 4 10 9 10l4-4c-4 0-7-2-7-6 0-8 10-13 18-10z" fill="#F07C4A"/>
    <path d="M36 12c4 2 6 6 4 9l-6 1c1-3 0-6-2-7z" fill="#E0623A"/>
    <path d="M14 30c-3 2-6 6-5 10 4 0 7-3 8-6" fill="#F59A6B"/>
    <path d="M17 20l-3 3M22 15.6l-1.6 3.8M28 13.6l-.4 4" stroke="#C94F2C" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M38 13c3-3 6-5 9-5M38 15c4-1 7-1 9 1" fill="none" stroke="#C94F2C" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="35" cy="16" r="1.4" fill="#3A3A4C"/>`),
  "en:molluscs": S(`
    <path d="M24 40L8 18c4-8 28-8 32 0z" fill="#F3B6A0"/>
    <path d="M24 40L8 18c3-6 10-8 16-8z" fill="#F7CBB9"/>
    <path d="M24 40L14 14M24 40V11M24 40l10-26M24 40L9.5 20M24 40l14.5-20" stroke="#E08E74" stroke-width="1.6"/>
    <path d="M18 40h12l-2 4h-8z" fill="#E08E74"/>`),
  "en:celery": S(`
    <path d="M17 44l2-22M24 44V20M31 44l-2-22" stroke="#8CC062" stroke-width="5" stroke-linecap="round"/>
    <path d="M17 44l2-22M24 44V20M31 44l-2-22" stroke="#B5DA8E" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M19 22c-6-2-9-8-6-13 4 0 7 4 7 8 1-5 4-9 8-9 2 4 0 9-4 11 4-2 9-1 11 3-3 3-8 3-11 1" fill="#5FA845"/>`),
  "en:mustard": S(`
    <rect x="15" y="6" width="18" height="7" rx="2" fill="#5A6472"/>
    <path d="M14 13h20l2 6v18a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V19z" fill="#E9B824"/>
    <path d="M24 13h10l2 6v18a5 5 0 0 1-5 5h-7z" fill="#D4A010"/>
    <rect x="15" y="22" width="18" height="11" rx="2.5" fill="#FFF4CF"/>
    <g fill="#C98F12"><circle cx="20" cy="27.5" r="1.6"/><circle cx="24" cy="26" r="1.6"/><circle cx="28" cy="28" r="1.6"/></g>`),
  "en:sesame-seeds": S(`
    <g fill="#F1E1B8" stroke="#D7BE85" stroke-width="1.2">
      <path d="M14 10c3 3 3 9 0 12-3-3-3-9 0-12z"/><path d="M30 8c3 3 3 9 0 12-3-3-3-9 0-12z" transform="rotate(30 30 14)"/>
      <path d="M22 20c3 3 3 9 0 12-3-3-3-9 0-12z" transform="rotate(-25 22 26)"/><path d="M36 24c3 3 3 9 0 12-3-3-3-9 0-12z" transform="rotate(15 36 30)"/>
      <path d="M13 30c3 3 3 9 0 12-3-3-3-9 0-12z" transform="rotate(40 13 36)"/><path d="M27 34c3 3 3 9 0 12-3-3-3-9 0-12z" transform="rotate(-10 27 40)"/>
    </g>`),
  "en:sulphur-dioxide-and-sulphites": S(`
    <path d="M14 30L24 20l10 10" stroke="#B2BFCA" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="19" r="9" fill="#F2C94C"/><circle cx="24" cy="19" r="9" fill="none" stroke="#D9A82A" stroke-width="1.4"/>
    <circle cx="12" cy="32" r="7" fill="#E0566A"/><circle cx="36" cy="32" r="7" fill="#E0566A"/>
    <path d="M20 15c1-1.6 2.6-2.4 4.4-2.4M9 29.4c.8-1.2 2-1.8 3.4-1.8M33 29.4c.8-1.2 2-1.8 3.4-1.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>`),
  "en:lupin": S(`
    <path d="M24 44V8" stroke="#5E9B45" stroke-width="2.4" stroke-linecap="round"/>
    <g fill="#8A6FDB"><ellipse cx="24" cy="8" rx="3" ry="3.4"/><ellipse cx="20" cy="14" rx="3.4" ry="3"/><ellipse cx="28" cy="14" rx="3.4" ry="3"/>
    <ellipse cx="19" cy="21" rx="3.8" ry="3.2"/><ellipse cx="29" cy="21" rx="3.8" ry="3.2"/></g>
    <g fill="#A992EA"><ellipse cx="18.4" cy="28" rx="4" ry="3.4"/><ellipse cx="29.6" cy="28" rx="4" ry="3.4"/><ellipse cx="24" cy="24.5" rx="3" ry="3"/></g>
    <path d="M24 44c-4-4-9-5-13-3 3 3 8 4 13 3zM24 40c4-4 9-5 13-3-3 3-8 4-13 3z" fill="#6DB24E"/>`)
};

// Commerces halal : un dessin par type de commerce
export const PLACE_ART = {
  butcher: S(`
    <path d="M8 24c5-7 18-8 24-2 4 5 1 14-8 15-4 .3-6-2-9-2.4-4-.3-7.4-2.8-7.2-6.8.1-1.6.2-2.8.2-3.8z" fill="#C2473C"/>
    <path d="M8 24c5-7 18-8 24-2" fill="none" stroke="#F3E1D2" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="25" cy="27" r="3.6" fill="#F3E1D2"/>
    <path d="M30 6l12 12-6 6-12-12z" fill="#C9D2DA"/><path d="M30 6l12 12-3 3-12-12z" fill="#E6EBEF"/>
    <path d="M36 24l6 6" stroke="#5A3E2B" stroke-width="4" stroke-linecap="round"/>
    <circle cx="35" cy="11" r="1.4" fill="#8E969F"/>`),
  restaurant: S(`
    <ellipse cx="24" cy="37" rx="19" ry="4" fill="#9AA6B2"/>
    <path d="M7 35a17 17 0 0 1 34 0z" fill="#C3CCD5"/>
    <path d="M24 18a17 17 0 0 1 17 17h-8c0-9-4-16-9-17z" fill="#A3AEB9"/>
    <rect x="21.5" y="12" width="5" height="6" rx="2.5" fill="#8794A1"/>
    <path d="M13 28c1.4-3 3.6-5 6-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
    <path d="M40 8v8M43 8v8M46 8v8M40 16h6M43 16v10" stroke="#8794A1" stroke-width="1.6" stroke-linecap="round" opacity="0"/>`),
  grocery: S(`
    <path d="M14 18l6-10M34 18l-6-10" stroke="#8B5A3C" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="18" cy="16" r="5" fill="#E2465A"/><circle cx="26" cy="13" r="5" fill="#F7A531"/><circle cx="32" cy="17" r="4.6" fill="#7DBE45"/>
    <path d="M6 18h36l-4 22a3 3 0 0 1-3 2.4H13A3 3 0 0 1 10 40z" fill="#D49E57"/>
    <path d="M24 18h18l-4 22a3 3 0 0 1-3 2.4H24z" fill="#BD8541"/>
    <path d="M15 24l1.4 13M24 24v13M33 24l-1.4 13" stroke="#A36F31" stroke-width="1.8" stroke-linecap="round"/>`),
  bakery: S(`
    <path d="M4 30c2-8 8-14 14-15l6 14-8 9c-6 0-11-3-12-8z" fill="#E0A04F"/>
    <path d="M44 30c-2-8-8-14-14-15l-6 14 8 9c6 0 11-3 12-8z" fill="#E0A04F"/>
    <path d="M18 15c4-2 8-2 12 0l-6 14z" fill="#F0BC6C"/>
    <path d="M16 38l8-9 8 9c-5 3-11 3-16 0z" fill="#C9813F"/>
    <path d="M12 22l5 7M36 22l-5 7" stroke="#B56F2E" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M20 17c2.4-1 5-1.2 8-.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>`),
  other: S(`
    <path d="M8 20h32v22H8z" fill="#F4EEE2"/>
    <path d="M24 20h16v22H24z" fill="#E3DBCB"/>
    <path d="M6 12h36l2 8H4z" fill="#1FA597"/>
    <path d="M6 12h6l-1 8H4zM18 12h6v8h-7zM30 12h6l2 8h-7z" fill="#E8F5F3"/>
    <path d="M4 20c0 3 7 3 7 0 0 3 6.4 3 6.4 0 0 3 6.6 3 6.6 0 0 3 6.6 3 6.6 0 0 3 6.4 3 6.4 0 0 3 7 3 7 0z" fill="#1A8C80"/>
    <rect x="13" y="28" width="9" height="14" rx="1" fill="#8B5A3C"/>
    <rect x="27" y="27" width="9" height="7" rx="1" fill="#BFE3F5"/>`)
};
