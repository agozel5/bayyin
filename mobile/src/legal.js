// Pages légales de l'app : mêmes textes que le site (public/lib/legal-docs.js). Les informations de
// l'éditeur viennent de public/lib/legal-info.js, ou de app.json › expo.extra.legal si elles y sont remplies.
import Constants from "expo-constants";
import { setLegalInfo } from "../../public/lib/legal-docs.js";

setLegalInfo((Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.legal) || {});
export { legalDoc, legalComplete, LEGAL_IDS } from "../../public/lib/legal-docs.js";
