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
