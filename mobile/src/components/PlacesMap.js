// Carte OpenStreetMap (Leaflet) dans une WebView : aucune clé de service nécessaire.
import React, { useMemo, useRef, useEffect } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { C, R, isDark } from "../theme";

// Mêmes épingles que le site : couleur selon le halal, pictogramme selon le type de commerce
const PIN = () => (isDark() ? { only: "#4FBF80", yes: "#72B783" } : { only: "#169B57", yes: "#3E8A49" });
const ICON = {
  butcher: '<path d="M14.5 4.2c3 .6 5.3 3.4 4.9 6.6-.5 3.6-4 6.4-7.9 6.2l-3.1 3.1a1.6 1.6 0 1 1-2.3-2.3l3.1-3.1c-.4-3.4 1.4-7 4.4-8.9.3-.2.6-.4.9-.6z"/><circle cx="14.6" cy="10.4" r="1.6"/>',
  restaurant: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9M16.5 3C14.8 3 13.5 5 13.5 8s1.3 4 3 4v9"/>',
  grocery: '<path d="M3.5 5.5h2.2l2 10.5h9.5l2.2-7.5H6.6"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/>',
  bakery: '<path d="M4 15c0-4.4 3.6-8 8-8s8 3.6 8 8v2H4z"/><path d="M9 9.5l1 5M15 9.5l-1 5M12 8v6.5"/>',
  other: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
};
const html = (center, places, dark) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;background:${dark ? "#1B231E" : "#E8EEE9"}}
.pin{width:34px;height:34px;box-sizing:border-box;border-radius:50% 50% 50% 6px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;color:#fff;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3);transition:transform .2s}
.pin svg{width:17px;height:17px;transform:rotate(45deg);fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.pin.sel{background:${dark ? "#0B5139" : "#0B5139"}!important;transform:rotate(-45deg) scale(1.15)}
.me{width:18px;height:18px;box-sizing:border-box;border-radius:50%;background:#2F7BF5;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,123,245,.25)}
.leaflet-control-attribution{font-size:10px}
${dark ? ".leaflet-tile-pane{filter:brightness(.6) invert(1) contrast(3) hue-rotate(200deg) saturate(.3) brightness(.7)}.leaflet-bar a{background:#1B241F;color:#E8EEEA;border-color:#28332D}" : ""}</style></head><body><div id="m"></div>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const C=${JSON.stringify(center)},P=${JSON.stringify(places)};
const send=(o)=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(o));
const m=L.map("m",{zoomControl:false}).setView([C.lat,C.lon],14);
L.control.zoom({position:"bottomright"}).addTo(m);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(m);
L.marker([C.lat,C.lon],{icon:L.divIcon({className:"",html:'<div class="me"></div>',iconSize:[18,18]}),interactive:false}).addTo(m);
const pts=[[C.lat,C.lon]];
const marks={};
const pin=(p,sel)=>L.divIcon({className:"",html:'<div class="pin'+(sel?' sel':'')+'" style="background:'+p.c+'"><svg viewBox="0 0 24 24">'+p.i+'</svg></div>',iconSize:[34,34],iconAnchor:[17,32]});
let cur=null;
P.forEach(p=>{const k=L.marker([p.lat,p.lon],{icon:pin(p,false),title:p.n||""}).addTo(m);
 k.on("click",()=>send({id:p.id}));marks[p.id]=k;pts.push([p.lat,p.lon]);});
if(pts.length>1)m.fitBounds(pts.slice(0,40),{padding:[28,28],maxZoom:16});
window.focusPlace=(id)=>{const p=P.find(x=>x.id===id);if(!p)return;if(cur&&marks[cur])marks[cur].setIcon(pin(P.find(x=>x.id===cur),false));cur=id;marks[id].setIcon(pin(p,true));marks[id].setZIndexOffset(1000);m.setView([p.lat,p.lon],Math.max(m.getZoom(),16),{animate:true});};
</script></body></html>`;

export default function PlacesMap({ center, places, selected, onSelect, height = 260 }) {
  const ref = useRef(null);
  const doc = useMemo(() => html(center, places.slice(0, 120).map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, n: p.name || "", c: PIN()[p.halal] || PIN().yes, i: ICON[p.cat] || ICON.other })), isDark()),
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
