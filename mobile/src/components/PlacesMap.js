// Carte OpenStreetMap (Leaflet) dans une WebView : aucune clé de service nécessaire.
import React, { useMemo, useRef, useEffect } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { C, R, isDark } from "../theme";

const PIN = { only: "#169B57", yes: "#3E8A49" };
const html = (center, places, dark) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;background:${dark ? "#1B231E" : "#E8EEE9"}}
.pin{width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.sel{width:34px;height:34px}.me{width:16px;height:16px;border-radius:50%;background:#2F6FC0;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,111,192,.25)}
${dark ? ".leaflet-tile{filter:brightness(.7) contrast(1.1) saturate(.7)}" : ""}</style></head><body><div id="m"></div>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const C=${JSON.stringify(center)},P=${JSON.stringify(places)};
const send=(o)=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(o));
const m=L.map("m",{zoomControl:false}).setView([C.lat,C.lon],14);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(m);
L.marker([C.lat,C.lon],{icon:L.divIcon({className:"",html:'<div class="me"></div>',iconSize:[16,16]}),interactive:false}).addTo(m);
const pts=[[C.lat,C.lon]];
const marks={};
P.forEach(p=>{const k=L.marker([p.lat,p.lon],{icon:L.divIcon({className:"",html:'<div class="pin" style="background:'+p.c+'"></div>',iconSize:[26,26],iconAnchor:[13,26]})}).addTo(m);
 k.on("click",()=>send({id:p.id}));marks[p.id]=k;pts.push([p.lat,p.lon]);});
if(pts.length>1)m.fitBounds(pts.slice(0,40),{padding:[28,28],maxZoom:16});
window.focusPlace=(id)=>{const p=P.find(x=>x.id===id);if(p)m.setView([p.lat,p.lon],Math.max(m.getZoom(),16),{animate:true});};
</script></body></html>`;

export default function PlacesMap({ center, places, selected, onSelect, height = 260 }) {
  const ref = useRef(null);
  const doc = useMemo(() => html(center, places.slice(0, 120).map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, c: PIN[p.halal] || PIN.yes })), isDark()),
    [center.lat, center.lon, places.map((p) => p.id).join(","), isDark()]);
  useEffect(() => {
    if (selected && ref.current && ref.current.injectJavaScript) ref.current.injectJavaScript(`window.focusPlace&&window.focusPlace(${JSON.stringify(selected)});true;`);
  }, [selected]);
  return (
    <View style={{ height, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.tint }}>
      <WebView ref={ref} source={{ html: doc, baseUrl: "https://agozel5.github.io/bayyin/" }} originWhitelist={["*"]} javaScriptEnabled style={{ flex: 1 }}
        onMessage={(e) => { try { const m = JSON.parse(e.nativeEvent.data); if (m.id) onSelect && onSelect(m.id); } catch { /* message inconnu */ } }} />
    </View>
  );
}
