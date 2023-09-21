import { registerSettingTab } from "@/routes";

import SettingsGeneralTab from "./SettingsGeneralTab.vue";
import SettingsMachineTab from "./SettingsMachineTab.vue";

// Register default Settings -> General tab
registerSettingTab(true, "settings-general-tab", SettingsGeneralTab, "tabs.generalSettings.caption");

// Register default Settings -> Machine tab
registerSettingTab(false, "settings-machine-tab", SettingsMachineTab, "tabs.machineSettings.caption");
