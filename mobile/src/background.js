// Travail en arrière-plan : vérification des rappels (le système choisit le moment, au mieux toutes les quelques heures).
import { Platform } from "react-native";

export const RECALL_TASK = "bayyin-recalls";

if (Platform.OS !== "web") {
  try {
    const TaskManager = require("expo-task-manager");
    const BackgroundTask = require("expo-background-task");
    TaskManager.defineTask(RECALL_TASK, async () => {
      try {
        const { initStorage, getSettings } = require("./storage");
        const { setLang } = require("./i18n");
        const { checkRecalls, notifyRecalls } = require("./recalls");
        await initStorage();
        setLang(getSettings().lang);
        const hits = await checkRecalls({ force: true });
        await notifyRecalls(hits);
        try { require("./widget").updateWidgets(require("./storage").getHistory(), hits.map((h) => h.code)); } catch { /* widgets absents */ }
        return BackgroundTask.BackgroundTaskResult.Success;
      } catch {
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  } catch { /* module absent (Expo Go) */ }
}

export async function registerBackground() {
  if (Platform.OS === "web") return;
  try {
    const BackgroundTask = require("expo-background-task");
    await BackgroundTask.registerTaskAsync(RECALL_TASK, { minimumInterval: 6 * 60 });
  } catch { /* indisponible */ }
}
