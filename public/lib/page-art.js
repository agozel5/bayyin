// Illustrations d'en-tête des pages de réglages (viewBox 320×150). Une scène par page,
// dans la couleur de sa tuile ; décoratives (aria-hidden), sans texte à traduire.
import { ALLERGEN_ART } from "./rank-art.js";

const W = (body) => `<svg viewBox="0 0 320 150" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
// Dessin 48×48 de rank-art placé dans la scène
const put = (art, x, y, s) => art.replace("<svg ", `<svg x="${x}" y="${y}" width="${s}" height="${s}" `);
// Fond commun : deux cercles flous et quelques points
const bg = (c1, c2) => `
  <circle cx="70" cy="40" r="60" fill="${c1}" opacity=".16"/>
  <circle cx="262" cy="112" r="54" fill="${c2}" opacity=".16"/>
  <g fill="${c1}" opacity=".35"><circle cx="34" cy="118" r="3"/><circle cx="292" cy="28" r="2.5"/><circle cx="250" cy="20" r="1.8"/><circle cx="20" cy="70" r="2"/></g>`;
const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="#000" opacity=".12"/>`;

export const PAGE_ART = {
  lang: W(`${bg("#3D84DB", "#8A63DA")}
    ${shadow(160, 134, 46)}
    <circle cx="160" cy="80" r="46" fill="#3D84DB"/>
    <path d="M160 34a46 46 0 0 1 0 92c20-10 30-27 30-46s-10-36-30-46z" fill="#2F6FC0"/>
    <path d="M131 53c8 0 10 5 18 5s8 8 3 13-13 3-15 10 5 13 0 18-15-3-18-10c-3-10-1-26 12-36z" fill="#6DB24E"/>
    <path d="M172 41c8 3 15 8 18 15-5 3-10 0-13 5s3 10 8 13 10 10 5 20-15 13-18 5 3-15-3-20-10-8-8-18 5-13 11-20z" fill="#5A9C3E"/>
    <path d="M126 66c4-9 11-16 20-19" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>
    <g transform="translate(58 22)"><rect width="58" height="40" rx="12" fill="#fff"/><path d="M14 40l-4 12 14-12z" fill="#fff"/>
      <text x="29" y="27" text-anchor="middle" font-family="IBM Plex Sans,system-ui,sans-serif" font-weight="700" font-size="18" fill="#3D84DB">Aa</text></g>
    <g transform="translate(206 30)"><rect width="56" height="40" rx="12" fill="#fff"/><path d="M42 40l4 12-14-12z" fill="#fff"/>
      <text x="28" y="28" text-anchor="middle" font-family="IBM Plex Sans Arabic,system-ui,sans-serif" font-weight="700" font-size="20" fill="#1A9C68">عربي</text></g>
    <g transform="translate(222 84)"><rect width="46" height="30" rx="10" fill="#fff" opacity=".95"/>
      <text x="23" y="20" text-anchor="middle" font-family="IBM Plex Sans,system-ui,sans-serif" font-weight="700" font-size="13" fill="#8A63DA">Tr</text></g>`),

  profile: W(`${bg("#E0457B", "#F2B84B")}
    ${shadow(160, 136, 56)}
    <rect x="112" y="26" width="96" height="108" rx="16" fill="#fff"/>
    <rect x="112" y="26" width="96" height="30" rx="16" fill="#E0457B"/><rect x="112" y="40" width="96" height="16" fill="#E0457B"/>
    <circle cx="160" cy="62" r="16" fill="#F7C9D9" stroke="#fff" stroke-width="4"/>
    <circle cx="160" cy="58" r="6" fill="#E0457B"/><path d="M150 72c2-6 6-8 10-8s8 2 10 8" fill="#E0457B"/>
    <rect x="128" y="88" width="64" height="7" rx="3.5" fill="#EDE6EA"/><rect x="136" y="101" width="48" height="6" rx="3" fill="#F3EEF0"/>
    <g transform="translate(182 104)"><circle r="13" fill="#1A9C68"/><path d="M-6 0l4 4 8-8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></g>
    <circle cx="70" cy="58" r="22" fill="#fff"/>${put(ALLERGEN_ART["en:gluten"], 52, 40, 36)}
    <circle cx="252" cy="52" r="22" fill="#fff"/>${put(ALLERGEN_ART["en:milk"], 234, 34, 36)}
    <circle cx="80" cy="112" r="18" fill="#fff"/>${put(ALLERGEN_ART["en:eggs"], 66, 98, 28)}
    <circle cx="246" cy="110" r="18" fill="#fff"/>${put(ALLERGEN_ART["en:peanuts"], 232, 96, 28)}`),

  religion: W(`${bg("#1FA597", "#E2A812")}
    ${shadow(160, 136, 70)}
    <path d="M104 126V82c0-24 25-38 56-38s56 14 56 38v44z" fill="#1FA597"/>
    <path d="M160 44c31 0 56 14 56 38v44h-28V82c0-20-12-34-28-38z" fill="#17877C"/>
    <path d="M160 44c-6-10-6-18 0-24 6 6 6 14 0 24z" fill="#E2A812"/>
    <rect x="96" y="124" width="128" height="8" rx="3" fill="#13756B"/>
    <path d="M146 126v-22a14 14 0 0 1 28 0v22z" fill="#0E5F57"/>
    <g fill="#C9EDE7"><path d="M118 104v-12a6 6 0 0 1 12 0v12z"/><path d="M190 104v-12a6 6 0 0 1 12 0v12z"/></g>
    <rect x="70" y="62" width="12" height="70" rx="3" fill="#1FA597"/><path d="M70 62l6-14 6 14z" fill="#E2A812"/>
    <rect x="238" y="62" width="12" height="70" rx="3" fill="#17877C"/><path d="M238 62l6-14 6 14z" fill="#E2A812"/>
    <g transform="translate(262 34)"><path d="M14 0a16 16 0 1 0 12 26A13 13 0 1 1 14 0z" fill="#E2A812"/>
      <path d="M30 6l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.8-3.3 1.8.8-3.6-2.7-2.4 3.6-.4z" fill="#F4CB47"/></g>`),

  appearance: W(`${bg("#F2B84B", "#4C64D6")}
    ${shadow(122, 136, 34)}${shadow(202, 136, 34)}
    <rect x="88" y="24" width="68" height="110" rx="14" fill="#fff" stroke="#E3E7EB" stroke-width="2"/>
    <rect x="98" y="40" width="48" height="22" rx="6" fill="#E8F5EE"/><rect x="98" y="68" width="48" height="8" rx="4" fill="#EEF1F4"/>
    <rect x="98" y="82" width="34" height="8" rx="4" fill="#EEF1F4"/><rect x="98" y="100" width="48" height="20" rx="6" fill="#1A9C68"/>
    <rect x="168" y="24" width="68" height="110" rx="14" fill="#141B17"/>
    <rect x="178" y="40" width="48" height="22" rx="6" fill="#1E3A2C"/><rect x="178" y="68" width="48" height="8" rx="4" fill="#26302B"/>
    <rect x="178" y="82" width="34" height="8" rx="4" fill="#26302B"/><rect x="178" y="100" width="48" height="20" rx="6" fill="#1A9C68"/>
    <g transform="translate(56 40)"><circle r="16" fill="#F4CB47"/><g stroke="#F4CB47" stroke-width="3.4" stroke-linecap="round">
      <path d="M0-24v-5M0 24v5M-24 0h-5M24 0h5M-17-17l-3.5-3.5M17 17l3.5 3.5M17-17l3.5-3.5M-17 17l-3.5 3.5"/></g></g>
    <g transform="translate(262 40)"><path d="M4-18a18 18 0 1 0 14 30A15 15 0 1 1 4-18z" fill="#8A9BE8"/>
      <circle cx="16" cy="-14" r="2" fill="#C9D2F6"/><circle cx="24" cy="2" r="1.6" fill="#C9D2F6"/></g>`),

  offline: W(`${bg("#2F6FC0", "#1FA597")}
    ${shadow(146, 138, 34)}
    <rect x="112" y="20" width="68" height="116" rx="14" fill="#1F2A36"/>
    <rect x="118" y="30" width="56" height="96" rx="8" fill="#fff"/>
    <rect x="124" y="38" width="44" height="12" rx="4" fill="#E6EFF8"/>
    <g transform="translate(124 56)"><rect width="44" height="14" rx="4" fill="#EEF1F4"/><rect y="20" width="44" height="14" rx="4" fill="#EEF1F4"/><rect y="40" width="44" height="14" rx="4" fill="#EEF1F4"/></g>
    <g transform="translate(160 106)"><circle r="12" fill="#1A9C68"/><path d="M-5 0l3.4 3.4L5-3.6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g transform="translate(196 16)"><path d="M18 46a14 14 0 0 1-2-27.8A19 19 0 0 1 52 22a12 12 0 0 1 2 24z" fill="#fff"/>
      <path d="M36 24v16M29 34l7 7 7-7" fill="none" stroke="#2F6FC0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g transform="translate(64 62)" fill="none" stroke="#9AA6B2" stroke-width="4.4" stroke-linecap="round">
      <path d="M0 10a30 30 0 0 1 40 0"/><path d="M8 19a18 18 0 0 1 24 0"/><circle cx="20" cy="28" r="2.4" fill="#9AA6B2" stroke="none"/>
      <path d="M-2 -2l44 40" stroke="#E0566A"/></g>`),

  data: W(`${bg("#71809A", "#1FA597")}
    ${shadow(160, 138, 44)}
    <rect x="124" y="16" width="72" height="120" rx="15" fill="#2E3846"/>
    <rect x="130" y="26" width="60" height="100" rx="9" fill="#fff"/>
    <g transform="translate(160 66)"><path d="M0-26l22 9v14c0 14-9 24-22 29-13-5-22-15-22-29v-14z" fill="#1FA597"/>
      <path d="M0-26l22 9v14c0 14-9 24-22 29z" fill="#17877C"/>
      <rect x="-9" y="-4" width="18" height="15" rx="3" fill="#fff"/><path d="M-5-4v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#fff" stroke-width="3"/></g>
    <rect x="140" y="104" width="40" height="7" rx="3.5" fill="#EEF1F4"/>
    <g transform="translate(62 36)"><rect width="46" height="34" rx="9" fill="#fff"/><circle cx="14" cy="17" r="7" fill="none" stroke="#3D84DB" stroke-width="3"/><path d="M14 13v4l3 2" stroke="#3D84DB" stroke-width="2.4" stroke-linecap="round"/><rect x="26" y="12" width="13" height="4" rx="2" fill="#E6EFF8"/><rect x="26" y="19" width="9" height="4" rx="2" fill="#EEF1F4"/></g>
    <g transform="translate(64 86)"><rect width="46" height="34" rx="9" fill="#fff"/><path d="M14 9l2.4 4.8 5.3.8-3.8 3.7.9 5.2-4.8-2.5-4.8 2.5.9-5.2-3.8-3.7 5.3-.8z" fill="#E2A812"/><rect x="26" y="12" width="13" height="4" rx="2" fill="#FBF1D6"/><rect x="26" y="19" width="9" height="4" rx="2" fill="#EEF1F4"/></g>
    <g transform="translate(212 58)"><rect width="46" height="34" rx="9" fill="#fff"/><path d="M8 13h14l-1.6 10a1 1 0 0 1-1 .9H10.6a1 1 0 0 1-1-.9z" fill="#E0457B"/><rect x="28" y="12" width="11" height="4" rx="2" fill="#FBE3EC"/><rect x="28" y="19" width="8" height="4" rx="2" fill="#EEF1F4"/></g>`),

  how: W(`${bg("#E2A812", "#1A9C68")}
    ${shadow(160, 138, 92)}
    <g transform="translate(40 44)"><rect width="66" height="66" rx="16" fill="#fff"/>
      <g stroke="#1F2A36" stroke-width="3.2"><path d="M14 18v30M20 18v30M25 18v30M31 18v30M38 18v30M43 18v30M49 18v30"/></g>
      <path d="M8 33h50" stroke="#E0566A" stroke-width="2.6" stroke-linecap="round"/></g>
    <path d="M114 77h22" stroke="#E2A812" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/><path d="M134 70l8 7-8 7" fill="none" stroke="#E2A812" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(150 30)"><rect width="56" height="96" rx="12" fill="#1F2A36"/><rect x="5" y="9" width="46" height="78" rx="7" fill="#fff"/>
      <rect x="10" y="16" width="36" height="22" rx="6" fill="#1A9C68"/><path d="M20 27l5 5 9-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="10" y="44" width="36" height="6" rx="3" fill="#EEF1F4"/><rect x="10" y="54" width="26" height="6" rx="3" fill="#EEF1F4"/>
      <circle cx="20" cy="72" r="7" fill="none" stroke="#7DBE45" stroke-width="3.4"/><rect x="31" y="69" width="15" height="6" rx="3" fill="#EEF1F4"/></g>
    <path d="M214 77h22" stroke="#1A9C68" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/><path d="M234 70l8 7-8 7" fill="none" stroke="#1A9C68" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(250 52)"><circle cx="24" cy="25" r="24" fill="#1A9C68"/><path d="M24 1a24 24 0 0 1 0 48c9-6 14-15 14-24S33 7 24 1z" fill="#158656"/>
      <path d="M13 25l7 7 15-15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`),

  sources: W(`${bg("#4C64D6", "#1FA597")}
    ${shadow(150, 138, 64)}
    <g transform="translate(92 92)"><rect width="116" height="18" rx="4" fill="#1FA597"/><rect x="0" y="4" width="10" height="10" fill="#17877C"/><rect x="18" y="7" width="60" height="4" rx="2" fill="#C9EDE7"/></g>
    <g transform="translate(100 72)"><rect width="104" height="20" rx="4" fill="#E2A812"/><rect x="0" y="4" width="10" height="12" fill="#C9900D"/><rect x="18" y="8" width="50" height="4" rx="2" fill="#FBF1D6"/></g>
    <g transform="translate(88 110)"><rect width="124" height="22" rx="4" fill="#4C64D6"/><rect x="0" y="5" width="10" height="12" fill="#3A50B8"/><rect x="18" y="9" width="70" height="4" rx="2" fill="#D9DFF7"/></g>
    <g transform="translate(112 22)"><path d="M0 4c14-6 30-6 40 2v44c-10-8-26-8-40-2z" fill="#fff"/><path d="M80 4c-14-6-30-6-40 2v44c10-8 26-8 40-2z" fill="#F1F3FA"/>
      <path d="M40 6v44" stroke="#D9DFF7" stroke-width="2"/><g stroke="#C3CBEB" stroke-width="2.4" stroke-linecap="round"><path d="M8 16h24M8 24h20M8 32h24M48 16h24M48 24h20M48 32h24"/></g></g>
    <g transform="translate(222 44)"><circle cx="22" cy="22" r="18" fill="#E6EFF8" stroke="#4C64D6" stroke-width="7"/><path d="M36 36l18 18" stroke="#4C64D6" stroke-width="9" stroke-linecap="round"/>
      <path d="M12 16a12 12 0 0 1 8-6" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></g>`),

  limits: W(`${bg("#F0BC33", "#3D84DB")}
    ${shadow(146, 138, 52)}
    <g transform="translate(98 26)"><rect width="96" height="108" rx="12" fill="#fff"/>
      <rect x="12" y="14" width="44" height="8" rx="4" fill="#E9EEF2"/>
      <g fill="#EEF1F4"><rect x="12" y="32" width="72" height="6" rx="3"/><rect x="12" y="44" width="64" height="6" rx="3"/><rect x="12" y="56" width="70" height="6" rx="3"/><rect x="12" y="68" width="48" height="6" rx="3"/></g>
      <rect x="12" y="84" width="34" height="14" rx="7" fill="#FFF2CC"/><rect x="50" y="84" width="34" height="14" rx="7" fill="#E6EFF8"/></g>
    <g transform="translate(176 58)"><circle cx="26" cy="26" r="22" fill="#FFF8E5" fill-opacity=".85" stroke="#F0BC33" stroke-width="8"/>
      <path d="M42 42l20 20" stroke="#D9A21E" stroke-width="11" stroke-linecap="round"/>
      <path d="M20 20a7 7 0 1 1 9 6.6c-2 .6-3 2-3 4" fill="none" stroke="#C98A0E" stroke-width="4" stroke-linecap="round"/><circle cx="26" cy="38" r="2.6" fill="#C98A0E"/></g>
    <g transform="translate(58 34)"><path d="M20 0l20 36H0z" fill="#F0BC33"/><path d="M20 12v11" stroke="#4A3A10" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="29" r="2.4" fill="#4A3A10"/></g>`),
};
