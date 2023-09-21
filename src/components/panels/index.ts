import { App } from "vue";

import ATXPanel from "./ATXPanel.vue";
import ExtrudePanel from "./ExtrudePanel.vue";
import ExtrusionFactorsPanel from "./ExtrusionFactorsPanel.vue";
import FanPanel from "./FanPanel.vue";
import FansPanel from "./FansPanel.vue";
import MovementPanel from "./MovementPanel.vue";
import JobControlPanel from "./JobControlPanel.vue";
import JobDataPanel from "./JobDataPanel.vue";
import JobEstimationsPanel from "./JobEstimationsPanel.vue";
import JobInfoPanel from "./JobInfoPanel.vue";
import SettingsAboutPanel from "./SettingsAboutPanel.vue";
import SettingsAppearancePanel from "./SettingsAppearancePanel.vue";
import SettingsCommunicationPanel from "./SettingsCommunicationPanel.vue";
import SettingsElectronicsPanel from "./SettingsElectronicsPanel.vue";
import SettingsGeneralPanel from "./SettingsGeneralPanel.vue";
import SettingsListItemsPanel from "./SettingsListItemsPanel.vue";
import SettingsMachinePanel from "./SettingsMachinePanel.vue";
import SettingsNotificationsPanel from "./SettingsNotificationsPanel.vue";
import SettingsBehaviourPanel from "./SettingsBehaviourPanel.vue";
import SettingsWebcamPanel from "./SettingsWebcamPanel.vue";
import SpeedFactorPanel from "./SpeedFactorPanel.vue";
import StatusPanel from "./StatusPanel.vue";
import ToolsPanel from "./ToolsPanel/ToolsPanel.vue";
import WebcamPanel from "./WebcamPanel.vue";
import ZBabystepPanel from "./ZBabystepPanel.vue";
import FFFContainerPanel from "./FFFContainerPanel.vue";
import FFFDashboardPanel from "./FFFDashboardPanel.vue";
import CNCAxesPosition from "./CNCAxesPosition.vue";
import CNCContainerPanel from "./CNCContainerPanel.vue";
import CNCMovementPanel from "./CNCMovementPanel.vue";
import CNCDashboardPanel from "./CNCDashboardPanel.vue";
import SpindleSpeedPanel from "./SpindleSpeedPanel.vue";

export function registerPanels(app: App<any>) {
    app
        .component("atx-panel", ATXPanel)
        .component("extrude-panel", ExtrudePanel)
        .component("extrusion-factors-panel", ExtrusionFactorsPanel)
        .component("fan-panel", FanPanel)
        .component("fans-panel", FansPanel)
        .component("job-control-panel", JobControlPanel)
        .component("job-data-panel", JobDataPanel)
        .component("job-estimations-panel", JobEstimationsPanel)
        .component("job-info-panel", JobInfoPanel)
        .component("movement-panel", MovementPanel)
        .component("settings-about-panel", SettingsAboutPanel)
        .component("settings-apperance-panel", SettingsAppearancePanel)
        .component("settings-communication-panel", SettingsCommunicationPanel)
        .component("settings-electronics-panel", SettingsElectronicsPanel)
        .component("settings-general-panel", SettingsGeneralPanel)
        .component("settings-machine-panel", SettingsMachinePanel)
        .component("settings-list-items-panel", SettingsListItemsPanel)
        .component("settings-notifications-panel", SettingsNotificationsPanel)
        .component("settings-behaviour-panel", SettingsBehaviourPanel)
        .component("settings-webcam-panel", SettingsWebcamPanel)
        .component("status-panel", StatusPanel)
        .component("speed-factor-panel", SpeedFactorPanel)
        .component("tools-panel", ToolsPanel)
        .component("webcam-panel", WebcamPanel)
        .component("z-babystep-panel", ZBabystepPanel)
        .component("cnc-axes-position", CNCAxesPosition)
        .component("fff-container-panel", FFFContainerPanel)
        .component("fff-dashboard-panel", FFFDashboardPanel)
        .component("cnc-container-panel", CNCContainerPanel)
        .component("cnc-movement-panel", CNCMovementPanel)
        .component("cnc-dashboard-panel", CNCDashboardPanel)
        .component("spindle-speed-panel", SpindleSpeedPanel);
}
