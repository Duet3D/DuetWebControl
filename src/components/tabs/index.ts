import Vue from "vue";

import { registerSettingTab } from "@/routes";

import SettingsGeneralTab from "./SettingsGeneralTab.vue";
import SettingsMachineTab from "./SettingsMachineTab.vue";

import PluginsExternalTab from "./PluginsExternalTab.vue";
import PluginsIntegratedTab from "./PluginsIntegratedTab.vue";

Vue.component("plugins-external-tab", PluginsExternalTab);
Vue.component("plugins-integrated-tab", PluginsIntegratedTab);

// Register default Settings -> General tab
registerSettingTab(true, "settings-general-tab", SettingsGeneralTab, "tabs.generalSettings.caption");

// Register default Settings -> Machine tab
registerSettingTab(false, "settings-machine-tab", SettingsMachineTab, "tabs.machineSettings.caption");
