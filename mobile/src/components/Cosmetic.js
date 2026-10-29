// Cosmétiques : note des ingrédients (liste INCI), adaptée au type de produit (rincé ou laissé, spray, lèvres…).
// Même méthode et mêmes textes que la version web.
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Txt, Muted, Row } from "./ui";
import { Glyph, Art } from "./Art";
import { C, R, RISK_COLORS, GRADE_COLORS, LEVEL_COLORS, STATUS_COLORS, dir } from "../theme";
import { t, tn } from "../i18n";
import { SOURCE_BY_ID } from "../core";
import { loadCosing } from "../api";
import { analyzeCosmetic, cosmeticDbVersion } from "../../../public/lib/cosmetic.js";
import { NUT_ART } from "../../../public/lib/rank-art.js";
import { haptic } from "../motion";

const CTX_ORDER = ["rinse", "spray", "powder", "lip", "child"];
const KIND_STATUS = { illegal: "haram", cmr: "haram", ed: "haram", allergen: "mashbouh", irritant: "mashbouh", env: "halal_probable" };
const kindColors = (k) => STATUS_COLORS[KIND_STATUS[k] || "inconnu"];

// Analyse refaite quand la base CosIng arrive (rôles des ingrédients, meilleure reconnaissance)
export function useCosmetic(p) {
  const [ver, setVer] = useState(cosmeticDbVersion());
  useEffect(() => {
    if (ver) return;
    let live = true;
    loadCosing().then(() => live && setVer(cosmeticDbVersion()));
    return () => { live = false; };
  }, []);
  return useMemo(() => (p.raw && ver ? analyzeCosmetic({ ...p.raw, kind: "beauty" }) : p.health), [p, ver]);
}

function Sources({ ids }) {
  const list = (ids || []).map((id) => SOURCE_BY_ID[id]).filter(Boolean);
  if (!list.length) return null;
  return (
    <Txt style={{ fontSize: 12.5, lineHeight: 18, color: C.muted }}>
      {t("detail.source")} :{" "}
      {list.map((s, i) => <Text key={s.id} onPress={() => Linking.openURL(s.url).catch(() => {})} style={{ color: C.brand, textDecorationLine: "underline" }}>{s.name}{i < list.length - 1 ? ", " : ""}</Text>)}
    </Txt>
  );
}

function RiskRow({ r, first }) {
  const [open, setOpen] = useState(false);
  const [fg, bg] = RISK_COLORS[r.level];
  const title = t(`cosm.${r.key}.t`);
  return (
    <View style={{ borderTopWidth: first ? 0 : 0.5, borderTopColor: C.line }}>
      <Pressable onPress={() => { haptic.tap(); setOpen(!open); }} accessibilityRole="button" accessibilityState={{ expanded: open }}
        style={{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 12 }}>
        <View style={{ width: 6, alignSelf: "stretch", borderRadius: 3, backgroundColor: fg }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.fg, textAlign: dir().ta, writingDirection: "ltr" }}>{r.name}</Text>
          {r.name.toLowerCase() !== title.toLowerCase() ? <Muted style={{ fontSize: 13, lineHeight: 17 }}>{title}</Muted> : null}
          {r.kinds && r.kinds.length ? (
            <View style={{ flexDirection: dir().row, flexWrap: "wrap", gap: 5 }}>
              {r.kinds.map((k) => (
                <View key={k} style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: kindColors(k)[1] }}>
                  <Text style={{ fontSize: 11.5, fontWeight: "700", color: kindColors(k)[0] }}>{t(`cosm.kind.${k}`)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: bg }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: fg }}>{t(`risk.${r.level}`)}</Text>
        </View>
        <View style={{ transform: [{ rotate: open ? (dir().rtl ? "-90deg" : "90deg") : "0deg" }] }}><Glyph name="chev" size={15} color={C.faint} /></View>
      </Pressable>
      {open ? (
        <View style={{ gap: 6, paddingBottom: 12, paddingStart: 16 }}>
          <Muted style={{ fontSize: 14, lineHeight: 20 }}>{t(`cosm.${r.key}.p`)}</Muted>
          {r.dose ? <Txt style={{ fontSize: 13.5, lineHeight: 19, fontWeight: "600" }}>{t(`cosm.dose.${r.dose}`)}</Txt> : null}
          <Sources ids={r.sources} />
        </View>
      ) : null}
    </View>
  );
}

export default function CosmeticSection({ p }) {
  const h = useCosmetic(p);
  const [safeOpen, setSafeOpen] = useState(false);
  if (!h || !h.cosmetic) return null;
  const s = h.score;
  const head = (
    <View style={{ gap: 2 }}>
      <Txt accessibilityRole="header" style={{ fontSize: 19, fontWeight: "800" }}>{t("detail.cosmetic")}</Txt>
      <Muted style={{ fontSize: 13 }}>{t("detail.cosmetic_sub")}</Muted>
    </View>
  );
  if (!s) return <View style={{ gap: 10 }}>{head}<Muted>{t("detail.cosmetic_none")}</Muted></View>;
  const all = h.risks || [];
  const risks = all.filter((r) => r.level);
  const safeHere = all.filter((r) => !r.level);
  const ctx = h.context || {};
  const tags = [ctx.rinse ? "rinse" : "leave", ...CTX_ORDER.slice(1).filter((k) => ctx[k])];
  const lead = risks.length
    ? t("detail.cosmetic_lead", { n: s.score, k: h.analyzed, e: s.parts.eleve, m: s.parts.modere, l: s.parts.limite })
    : t("detail.cosmetic_clean", { n: s.score, k: h.analyzed });
  const gc = GRADE_COLORS[s.grade] || C.brand;
  return (
    <View style={{ gap: 12 }}>
      {head}
      <Row gap={12} style={{ alignItems: "center" }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 5, borderColor: gc, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 19, fontWeight: "800", color: gc }}>{s.score}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontWeight: "800", color: gc }}>{t(`grade.${s.grade}`)}</Txt>
          <Muted style={{ fontSize: 14, lineHeight: 20 }}>{lead}</Muted>
        </View>
      </Row>
      <View style={{ flexDirection: dir().row, flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: 13, color: C.muted, fontWeight: "600" }}>{t("detail.cosmetic_ctx")}</Text>
        {tags.map((k) => (
          <View key={k} style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: C.tint2 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.fg }}>{t(`cosm.ctx.${k}`)}</Text>
          </View>
        ))}
      </View>
      {risks.length ? (
        <View>
          <Text style={{ fontSize: 13, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2, textAlign: dir().ta }}>{t("detail.cosmetic_watch")}</Text>
          {risks.map((r, i) => <RiskRow key={r.key + r.name} r={r} first={i === 0} />)}
        </View>
      ) : (
        <Row gap={12} style={{ padding: 12, borderRadius: R.md, backgroundColor: C.tint }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.artBg, alignItems: "center", justifyContent: "center" }}><Art xml={NUT_ART.additives} size={30} /></View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontWeight: "700" }}>{t("detail.cosmetic_ok_t")}</Txt>
            <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("detail.cosmetic_ok_p")}</Muted>
          </View>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: LEVEL_COLORS.bon }} />
        </Row>
      )}
      {safeHere.length ? (
        <Pressable onPress={() => setSafeOpen(!safeOpen)} accessibilityRole="button" accessibilityState={{ expanded: safeOpen }}
          style={{ padding: 12, borderRadius: R.md, backgroundColor: C.tint, gap: 4 }}>
          <Row gap={8}>
            <Txt style={{ flex: 1, fontWeight: "700", fontSize: 14.5 }}>{t("detail.cosmetic_safe_here", { n: safeHere.length })}</Txt>
            <View style={{ transform: [{ rotate: safeOpen ? (dir().rtl ? "-90deg" : "90deg") : "0deg" }] }}><Glyph name="chev" size={15} color={C.faint} /></View>
          </Row>
          <Muted style={{ fontSize: 13, lineHeight: 18, writingDirection: "ltr" }}>{safeHere.map((r) => r.name).join(", ")}</Muted>
          {safeOpen ? <Muted style={{ fontSize: 13.5, lineHeight: 19 }}>{t("detail.cosmetic_safe_here_p")}</Muted> : null}
        </Pressable>
      ) : null}
      <Muted style={{ fontSize: 12.5, lineHeight: 18 }}>{t("detail.cosmetic_method")}</Muted>
    </View>
  );
}

// Liste complète des ingrédients : rôle (CosIng) et niveau de risque dans ce produit
const FN_FIRST = ["PRESERVATIVE", "UV FILTER", "UV ABSORBER", "COLORANT", "HAIR DYEING", "SURFACTANT - CLEANSING", "SURFACTANT - EMULSIFYING",
  "SKIN CONDITIONING - EMOLLIENT", "SKIN CONDITIONING - HUMECTANT", "HUMECTANT", "PERFUMING", "ANTIOXIDANT", "ANTIPERSPIRANT", "DEODORANT",
  "EXFOLIATING", "SOLVENT", "VISCOSITY CONTROLLING", "FILM FORMING", "HAIR CONDITIONING", "SKIN CONDITIONING", "SKIN PROTECTING"];
const FN_LAST = ["DENATURANT", "FRAGRANCE", "ANTIFOAMING", "BUFFERING", "ORAL CARE", "ANTISTATIC", "BINDING", "BULKING", "NOT REPORTED"];
const fnRank = (f) => { const i = FN_FIRST.indexOf(f); return i >= 0 ? i : FN_LAST.includes(f) ? 900 + FN_LAST.indexOf(f) : 100; };
const sortFunctions = (list) => { const main = list.filter((f) => !FN_LAST.includes(f)); return [...(main.length ? main : list)].sort((a, b) => fnRank(a) - fnRank(b)); };
const fnLabel = (f) => {
  const k = "fn." + f.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return t(k) !== k ? t(k) : f.charAt(0) + f.slice(1).toLowerCase();
};
const DOT = { eleve: "#E2533F", modere: "#F0A23A", limite: "#D9B600" };

export function CosmeticIngredients({ p }) {
  const h = useCosmetic(p);
  const list = (h && h.ingredients) || [];
  if (!list.length || !h.coverage) {
    return p.ingredients ? <View style={{ gap: 8 }}><Txt style={{ fontSize: 19, fontWeight: "800" }}>{t("detail.ingredients")}</Txt><Muted>{p.ingredients.replace(/_/g, "")}</Muted></View> : null;
  }
  const c = h.coverage;
  const low = c.total >= 4 && c.known / c.total < 0.7;
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt accessibilityRole="header" style={{ fontSize: 19, fontWeight: "800" }}>{t("detail.all_ingredients")}</Txt>
        <Text style={{ fontWeight: "800", color: C.muted }}>{list.length}</Text>
      </Row>
      <Muted style={{ fontSize: 13, lineHeight: 18 }}>{t("detail.coverage", { k: c.known, n: c.total })}{low ? ` ${t("detail.coverage_low")}` : ""}</Muted>
      <View>
        {list.map((x, i) => {
          const fns = [...new Set(sortFunctions(x.functions).map(fnLabel))].slice(0, 3).join(" · ");
          const sub = fns || (x.known ? t("detail.ing_ok") : t("detail.ing_unknown"));
          return (
            <View key={x.name + i} style={{ flexDirection: dir().row, alignItems: "center", gap: 10, paddingVertical: 9, borderTopWidth: i ? 0.5 : 0, borderTopColor: C.line }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: x.level ? DOT[x.level] : x.known ? "#3FB46B" : C.tint2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: "700", color: C.fg, textAlign: dir().ta, writingDirection: "ltr" }}>{x.name}</Text>
                <Muted style={{ fontSize: 12.5, lineHeight: 17 }}>{sub}</Muted>
              </View>
              {x.level ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: RISK_COLORS[x.level][1] }}>
                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: RISK_COLORS[x.level][0] }}>{t(`risk.short.${x.level}`)}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <Txt style={{ fontSize: 12.5, lineHeight: 18, color: C.muted }}>{t("detail.ing_legend")}</Txt>
      <Sources ids={["cosing"]} />
    </View>
  );
}
