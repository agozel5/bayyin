// Mascotte de Bayyin : la lettre ب de l'icône devient un sourire, et son point doré un grain de beauté.
// Un même personnage, plusieurs attitudes : bonjour, cherche, vide, explique, premium, bravo.
// SVG en ligne (aucune image à charger), avec des identifiants uniques pour que plusieurs mascottes
// puissent cohabiter sur la page.

let uid = 0;

const ARM = 'fill="none" stroke="#0E6346" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';

// Accessoires et bras selon l'attitude (coordonnées dans un cadre de 160 × 160, corps au centre)
const POSES = {
  hello: {
    arms: `<path d="M38 104c-12 4-18 12-18 20" ${ARM}/><path d="M122 92c10-8 16-22 14-36" ${ARM}/>
      <g class="m-wave"><circle cx="136" cy="52" r="9" fill="#1A9466" stroke="#0E6346" stroke-width="4"/></g>`,
    eyes: "open",
  },
  search: {
    arms: `<path d="M38 100c-10 6-14 14-12 22" ${ARM}/><path d="M122 100c10 2 16 0 22-6" ${ARM}/>
      <g transform="translate(130 84)"><circle r="13" fill="rgb(255 255 255 / .55)" stroke="#E7B84E" stroke-width="6"/><path d="M9 10l11 12" stroke="#E7B84E" stroke-width="7" stroke-linecap="round"/></g>`,
    eyes: "right",
  },
  empty: {
    arms: `<path d="M38 102c-12-2-20-10-22-20" ${ARM}/><path d="M122 102c12-2 20-10 22-20" ${ARM}/>`,
    eyes: "up",
    extra: `<g fill="#9CC9B4"><circle cx="14" cy="74" r="4"/><circle cx="146" cy="74" r="4"/></g>`,
  },
  teach: {
    arms: `<path d="M38 104c-10 6-14 14-12 22" ${ARM}/><path d="M122 96l26-30" ${ARM}/>
      <path d="M150 63l8-10" stroke="#E7B84E" stroke-width="5" stroke-linecap="round"/>`,
    eyes: "open",
  },
  star: {
    arms: `<path d="M38 100c-10-8-14-20-12-30" ${ARM}/><path d="M122 100c10-8 14-20 12-30" ${ARM}/>`,
    eyes: "happy",
    top: `<path d="M58 20l10 9 12-15 12 15 10-9-4 22H62z" fill="#FFC95C" stroke="#D9A23A" stroke-width="3" stroke-linejoin="round"/>`,
  },
  bravo: {
    arms: `<path d="M38 96c-10-10-14-24-10-36" ${ARM}/><path d="M122 96c10-10 14-24 10-36" ${ARM}/>`,
    eyes: "happy",
    extra: `<g fill="#FFC95C"><path d="M20 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M140 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>`,
  },
};

function eyes(kind) {
  if (kind === "happy") return `<path d="M58 70c4-6 12-6 16 0M88 70c4-6 12-6 16 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;
  const dx = kind === "right" ? 3 : 0, dy = kind === "up" ? -3 : 0;
  return `<ellipse cx="66" cy="70" rx="9" ry="11" fill="#fff"/><ellipse cx="96" cy="70" rx="9" ry="11" fill="#fff"/>
    <circle cx="${67 + dx}" cy="${72 + dy}" r="5" fill="#0B3B29"/><circle cx="${97 + dx}" cy="${72 + dy}" r="5" fill="#0B3B29"/>
    <circle cx="${69 + dx}" cy="${69 + dy}" r="1.6" fill="#fff"/><circle cx="${99 + dx}" cy="${69 + dy}" r="1.6" fill="#fff"/>`;
}

/** Mascotte en SVG. pose : hello | search | empty | teach | star | bravo */
export function mascot(pose = "hello", { size = 120, label = "" } = {}) {
  const p = POSES[pose] || POSES.hello;
  const id = `m${++uid}`;
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, "&quot;")}"` : 'aria-hidden="true"';
  return `<svg class="mascot m-${pose}" viewBox="0 0 160 160" width="${size}" height="${size}" style="width:${size}px;height:${size}px" ${a11y}>
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26A877"/><stop offset="1" stop-color="#11734F"/></linearGradient></defs>
    <ellipse cx="80" cy="150" rx="38" ry="6" fill="rgb(0 0 0 / .1)"/>
    ${p.extra || ""}
    <g class="m-body">
      ${p.arms}
      <path d="M50 142v-8M110 142v-8" stroke="#0E6346" stroke-width="7" stroke-linecap="round"/>
      <rect x="34" y="38" width="92" height="98" rx="34" fill="url(#${id})"/>
      <path d="M44 56c6-10 16-14 26-14" fill="none" stroke="rgb(255 255 255 / .35)" stroke-width="5" stroke-linecap="round"/>
      ${eyes(p.eyes)}
      <ellipse cx="54" cy="90" rx="7" ry="4.5" fill="#FF8A7A" opacity=".5"/><ellipse cx="108" cy="90" rx="7" ry="4.5" fill="#FF8A7A" opacity=".5"/>
      <path d="M60 86c0 12 8 17 21 17h4c13 0 19-6 19-17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="80" cy="116" r="5.5" fill="#FFC95C"/>
    </g>
    ${p.top || ""}
  </svg>`;
}
