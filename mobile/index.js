import { registerRootComponent } from "expo";
import "./src/background"; // tâches en arrière-plan : à définir avant le premier rendu
import App from "./src/App";

registerRootComponent(App);
