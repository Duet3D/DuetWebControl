/**
 * components/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

import { App } from "vue";

import { registerButtons } from "./buttons";
import { registerCharts } from "./charts";
import { registerDialogs } from "./dialogs";
import { registerInputs } from "./inputs";
//import { registerLists } from "./lists";
import { registerMisc } from "./misc";
import { registerPanels } from "./panels";

export function registerComponents(app: App<any>) {
	registerButtons(app);
	registerCharts(app);
	registerDialogs(app);
	registerInputs(app);
	//registerLists(app);		// PITA
	registerMisc(app);
	registerPanels(app);
}
