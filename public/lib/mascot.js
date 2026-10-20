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
  if (kind === "happy") return `<path d="M58 71c4-6 12-6 16 0M88 71c4-6 12-6 16 0" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>`;
  const dx = kind === "right" ? 2.5 : 0, dy = kind === "up" ? -2.5 : 0;
  return `<circle cx="${66 + dx}" cy="${70 + dy}" r="6.5" fill="#fff"/><circle cx="${96 + dx}" cy="${70 + dy}" r="6.5" fill="#fff"/>`;
}

/** Mascotte en SVG. pose : hello | search | empty | teach | star | bravo */
export function mascot(pose = "hello", { size = 120, label = "" } = {}) {
  const p = POSES[pose] || POSES.hello;
  const id = `m${++uid}`;
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, "&quot;")}"` : 'aria-hidden="true"';
  return `<svg class="mascot m-${pose}" viewBox="0 0 160 160" width="${size}" height="${size}" style="width:${size}px;height:${size}px" ${a11y}>
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17865D"/><stop offset="1" stop-color="#0E6346"/></linearGradient></defs>
    <ellipse cx="80" cy="150" rx="34" ry="4" fill="rgb(0 0 0 / .08)"/>
    ${p.extra || ""}
    <g class="m-body">
      ${p.arms}
      <path d="M50 142v-8M110 142v-8" stroke="#0E6346" stroke-width="6" stroke-linecap="round"/>
      <rect x="34" y="38" width="92" height="98" rx="26" fill="url(#${id})"/>
      ${eyes(p.eyes)}
      <path d="M60 86c0 11 8 15 21 15h4c13 0 19-4 19-15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="80" cy="113" r="4.5" fill="#FFC95C"/>
    </g>
    ${p.top || ""}
  </svg>`;
}
