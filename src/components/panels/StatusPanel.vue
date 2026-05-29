<template>
	<PanelCard icon="mdi-information" :title="$t('panel.status.caption')">
		<template #title-append>
			<v-spacer />

			<StatusLabel v-if="machineStore.model.state.status" />

			<v-spacer />

			<template v-if="machineStore.model.state.machineMode">
				<v-menu v-if="switchableModes.length > 0">
					<template #activator="{ props: menuProps }">
						<a v-bind="menuProps" href="javascript:void(0)">
							{{ $t("panel.status.mode", [machineStore.model.state.machineMode.toUpperCase()]) }}
						</a>
					</template>
					<v-list :density="controlDensity">
						<v-list-item v-for="mode in switchableModes" :key="mode" :title="mode"
									 :active="mode === machineStore.model.state.machineMode"
									 :disabled="uiStore.uiFrozen || mode === machineStore.model.state.machineMode"
									 @click="changeMode(mode)" />
					</v-list>
				</v-menu>
				<span v-else>
					{{ $t("panel.status.mode", [machineStore.model.state.machineMode.toUpperCase()]) }}
				</span>
			</template>

			<a v-if="hasMultipleMotionSystems" href="javascript:void(0)" class="ms-2"
			   @click="cycleMotionSystem">
				<template v-if="abbreviateMotionSystem">
					{{ $t("panel.status.motionSystemShort", [machineStore.selectedMotionSystem]) }}
				</template>
				<template v-else>
					{{ $t("panel.status.motionSystem", [machineStore.selectedMotionSystem]) }}
				</template>
			</a>
		</template>

		<v-card-text v-if="hasContent" class="px-0 pt-0 pb-2 content text-xs-center">
			<!-- Axis positions -->
			<template v-if="visibleAxes.length > 0">
				<template v-for="(row, rowIndex) in axisRows" :key="rowIndex">
					<v-divider v-if="rowIndex > 0" class="my-2" />

					<v-row no-gutters class="flex-nowrap">
						<v-col tag="strong" class="category-header">
							<a v-if="row.toggleable" href="javascript:void(0)"
							   @click="toggledToTool = !toggledToTool">
								{{ row.machine ? $t("panel.status.machinePosition") : $t("panel.status.toolPosition") }}
							</a>
							<template v-else>
								{{ row.machine ? $t("panel.status.machinePosition") : $t("panel.status.toolPosition") }}
							</template>
						</v-col>
						<v-col>
							<v-row no-gutters class="align-content-center">
								<v-col v-for="item in visibleAxes" :key="item.index"
									   class="d-flex flex-column align-center">
									<span class="axis-span font-weight-bold" :class="axisSpanClasses(item.index)">
										{{ item.axis.letter }}
									</span>
									<span>
										{{ displayAxisPosition(item.axis, row.machine, settings.showAxisUnits) }}
									</span>
								</v-col>
							</v-row>
						</v-col>
					</v-row>
				</template>
			</template>

			<!-- Extruders -->
			<template v-if="visibleExtruders.length > 0">
				<template v-for="(row, rowIndex) in extruderRows" :key="rowIndex">
					<v-divider v-if="rowIndex > 0 || visibleAxes.length > 0" class="my-2" />

					<v-row no-gutters class="flex-nowrap align-content-center">
						<v-col tag="strong" class="category-header">
							<a v-if="row.toggleable" href="javascript:void(0)"
							   @click="toggledToVolume = !toggledToVolume">
								{{ row.volume ? $t("panel.status.extrudedVolume") : $t("panel.status.extruders") }}
							</a>
							<template v-else>
								{{ row.volume ? $t("panel.status.extrudedVolume") : $t("panel.status.extruders") }}
							</template>
						</v-col>
						<v-col>
							<v-row no-gutters class="align-content-center">
								<v-col v-for="item in visibleExtruders" :key="item.index"
									   class="d-flex flex-column align-center">
									<strong>{{ $t("panel.status.extruderDrive", [item.index]) }}</strong>
									<filament-monitor-indicator :monitor="filamentMonitor(item.index)"
																:extruder-index="item.index">
										<span>{{ displayExtruderAmount(item.extruder, row.volume, settings.showExtruderUnits) }}</span>
									</filament-monitor-indicator>
								</v-col>
							</v-row>
						</v-col>
					</v-row>
				</template>
			</template>

			<!-- Virtual extruder position -->
			<template v-if="showVirtualEPos">
				<v-divider v-if="visibleAxes.length > 0 || visibleExtruders.length > 0" class="my-2" />

				<v-row no-gutters class="flex-nowrap align-content-center">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.virtualEPos") }}
					</v-col>
					<v-col class="d-flex align-center justify-center">
						{{ display(virtualEPos, 1, settings.showExtruderUnits ? "mm" : undefined) }}
					</v-col>
				</v-row>
			</template>

			<!-- Speeds -->
			<template v-if="hasSpeedReadings">
				<v-divider v-if="visibleAxes.length > 0 || visibleExtruders.length > 0 || showVirtualEPos"
						   class="my-2" />

				<v-row no-gutters class="flex-nowrap align-content-center">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.speeds") }}
					</v-col>
					<v-col>
						<v-row no-gutters class="align-content-center">
							<v-col v-if="showRequestedSpeed" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.requestedSpeed") }}</strong>
								<span class="text-no-wrap">
									{{ displayMoveSpeed(machineStore.model.move.currentMove.requestedSpeed) }}
								</span>
							</v-col>
							<v-col v-if="showTopSpeed" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.topSpeed") }}</strong>
								<span class="text-no-wrap">
									{{ displayMoveSpeed(machineStore.model.move.currentMove.topSpeed) }}
								</span>
							</v-col>
							<v-col v-if="showVolumetricFlow" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.volumetricFlow") }}</strong>
								<span class="text-no-wrap">{{ display(volumetricFlow, 1, "mm³/s") }}</span>
							</v-col>
							<v-col v-if="showExtrusionRate" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.extrusionRate") }}</strong>
								<span class="text-no-wrap">
									{{ displayMoveSpeed(machineStore.model.move.currentMove.extrusionRate) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Sensors -->
			<template v-if="sensorsPresent">
				<v-divider v-if="visibleAxes.length > 0 || visibleExtruders.length > 0 || showVirtualEPos || hasSpeedReadings"
						   class="my-2" />

				<v-row no-gutters class="flex-nowrap align-content-center">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.sensors") }}
					</v-col>
					<v-col>
						<v-row no-gutters class="align-content-center justify-center">
							<template v-if="mainboard !== null">
								<v-col v-if="showVIn" class="d-flex flex-column align-center">
									<strong>{{ $t("panel.status.vIn") }}</strong>
									<v-tooltip location="bottom"
											   :text="$t('panel.status.minMax', [display(mainboard.vIn!.min, 1, 'V'), display(mainboard.vIn!.max, 1, 'V')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap my-auto">
												{{ display(mainboard.vIn!.current, 1, "V") }}
											</span>
										</template>
									</v-tooltip>
								</v-col>
								<v-col v-if="showV12" class="d-flex flex-column align-center">
									<strong>{{ $t("panel.status.v12") }}</strong>
									<v-tooltip location="bottom"
											   :text="$t('panel.status.minMax', [display(mainboard.v12!.min, 1, 'V'), display(mainboard.v12!.max, 1, 'V')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap my-auto">
												{{ display(mainboard.v12!.current, 1, "V") }}
											</span>
										</template>
									</v-tooltip>
								</v-col>
								<v-col v-if="showMcuTemp" class="d-flex flex-column align-center">
									<strong class="text-no-wrap">{{ $t("panel.status.mcuTemp") }}</strong>
									<v-tooltip location="bottom"
											   :text="$t('panel.status.minMax', [display(mainboard.mcuTemp!.min, 1, '°C'), display(mainboard.mcuTemp!.max, 1, '°C')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap my-auto">
												{{ display(mainboard.mcuTemp!.current, 1, "°C") }}
											</span>
										</template>
									</v-tooltip>
								</v-col>
							</template>

							<v-col v-if="showFanRPM" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.fanRPM") }}</strong>
								<div class="d-flex flex-row my-auto">
									<template v-for="(item, index) in fanRPM" :key="index">
										<template v-if="index !== 0">,&nbsp;</template>
										<v-tooltip location="bottom" :text="item.name">
											<template #activator="{ props: tooltipProps }">
												<span v-bind="tooltipProps" class="mx-0">{{ item.rpm }}</span>
											</template>
										</v-tooltip>
									</template>
								</div>
							</v-col>

							<v-col v-if="visibleProbes.length > 0" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.probe", visibleProbes.length) }}</strong>
								<div class="d-flex my-auto">
									<v-tooltip v-for="(item, index) in visibleProbes" :key="item.index" location="bottom"
											   :text="probeTooltip(item.probe)" :disabled="!probeTooltip(item.probe)">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="pa-1 probe-span"
												  :class="probeSpanClasses(item.probe, index === 0)">
												{{ probeDisplay(item.probe) }}
											</span>
										</template>
									</v-tooltip>
								</div>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>
		</v-card-text>

		<v-card-text v-else class="pa-0">
			<v-alert type="info" :text="$t('panel.status.noStatus')" tile />
		</v-card-text>

		<template #settings>
			<EntityVisibilityList kind="axes" :label="$t('panel.status.settings.axes')"
								  v-model="settings.displayedAxes" />
			<v-row no-gutters class="mt-4 align-center">
				<v-col>
					<v-select v-model="settings.positionDisplay" :items="positionDisplayItems"
							  item-value="value" item-title="title" :label="$t('panel.status.settings.positionDisplay')"
							  v-hint="$t('panel.status.settings.positionDisplayHint')" variant="outlined"
							  density="comfortable" hide-details />
				</v-col>
				<v-col cols="auto" class="ps-5">
					<v-switch v-model="settings.showAxisUnits" color="primary" density="compact" hide-details
							  :label="$t('panel.status.settings.showUnits')"
							  v-hint="$t('panel.status.settings.showAxisUnitsHint')" />
				</v-col>
			</v-row>

			<EntityVisibilityList kind="extruders" :label="$t('panel.status.settings.extruders')"
								  v-model="settings.displayedExtruders" class="mt-4" />
			<v-row no-gutters class="mt-4 align-center">
				<v-col>
					<v-select v-model="settings.extruderDisplay" :items="extruderDisplayItems"
							  item-value="value" item-title="title" :label="$t('panel.status.settings.extruderDisplay')"
							  v-hint="$t('panel.status.settings.extruderDisplayHint')" variant="outlined"
							  density="comfortable" hide-details />
				</v-col>
				<v-col cols="auto" class="ps-5">
					<v-switch v-model="settings.showExtruderUnits" color="primary" density="compact" hide-details
							  :label="$t('panel.status.settings.showUnits')"
							  v-hint="$t('panel.status.settings.showExtruderUnitsHint')" />
				</v-col>
			</v-row>
			<v-switch v-model="settings.virtualEPos" color="primary" density="compact" hide-details
					  class="mt-4" :label="$t('panel.status.settings.virtualEPos')"
					  v-hint="$t('panel.status.settings.virtualEPosHint')" />

			<v-autocomplete v-model="checkedSpeeds" :items="speedItems" item-value="value" item-title="title"
							:label="$t('panel.status.speeds')" v-hint="$t('panel.status.settings.speedsHint')"
							variant="outlined" density="comfortable" hide-details chips closable-chips clearable multiple
							class="mt-4" />
			<v-autocomplete v-if="sensorItems.length > 0" v-model="checkedSensors" :items="sensorItems"
							item-value="value" item-title="title" :label="$t('panel.status.sensors')"
							v-hint="$t('panel.status.settings.sensorsHint')" variant="outlined"
							density="comfortable" hide-details chips closable-chips clearable multiple class="mt-4" />
			<EntityVisibilityList v-if="hasTachoFans" kind="tachoFans" :label="$t('panel.status.fanRPM')"
								  v-model="settings.displayedFanRPM" class="mt-4" />
			<EntityVisibilityList v-if="hasProbes" kind="probes" :label="$t('panel.status.settings.probes')"
								  v-model="settings.displayedProbes" class="mt-4" />
			<v-autocomplete v-model="settings.machineModes" :items="machineModeItems" item-value="value"
							item-title="title" :label="$t('panel.status.settings.machineModes')"
							v-hint="$t('panel.status.settings.machineModesHint')" variant="outlined"
							density="comfortable" hide-details chips closable-chips clearable multiple class="mt-4" />
		</template>
	</PanelCard>
</template>

<style scoped>
.axis-span {
	border-radius: 5px;
}

strong {
	align-self: center;
	text-align: center;
}

.category-header {
	flex: 0 0 100px;
}

a {
	color: inherit;
	text-decoration: none;
}

.content span,
.content strong {
	padding-left: 8px;
	padding-right: 8px;
}

.probe-span {
	border-radius: 5px;
	text-align: center;
	white-space: nowrap;
	min-width: 60px;
}

.probe-span:not(:last-child) {
	margin-right: 8px;
}
</style>

<script setup lang="ts">
import { type FilamentMonitor, MachineMode, ProbeType, type Extruder, type Probe } from "@duet3d/objectmodel";

import FilamentMonitorIndicator from "@/components/misc/FilamentMonitorIndicator.vue";
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useLargeButtons } from "@/composables/useLargeButtons";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { display, displayAxisPosition, displayMoveSpeed, displayZ } from "@/utils/display";
import { isPrinting } from "@/utils/enums";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const { controlDensity } = useLargeButtons();

const settings = useComponentSettings({
	displayedAxes: null as Array<number> | null,
	displayedExtruders: null as Array<number> | null,
	displayedProbes: null as Array<number> | null,
	displayedFanRPM: null as Array<number> | null,
	// Requested + top by default; volumetric flow and extrusion rate are opt-in via the panel settings
	displayedSpeeds: ["requested", "top"] as Array<string> | null,
	// Vin/V12/MCU temp are off by default - the Boards table covers them when needed and most users
	// don't watch them on the dashboard
	displayedSensors: ["fanRPM"] as Array<string> | null,
	positionDisplay: "toggle" as "tool" | "machine" | "toggle" | "both",
	showAxisUnits: true,
	extruderDisplay: "toggle" as "length" | "volume" | "toggle" | "both",
	showExtruderUnits: true,
	virtualEPos: false,
	// Modes offered in the machine-mode dropdown; empty keeps the mode label non-interactive
	machineModes: [] as Array<MachineMode>
});

// #region Displayed entities

const visibleAxes = computed(() => {
	const displayed = settings.value.displayedAxes;
	return machineStore.model.move.axes
		.map((axis, index) => ({ axis, index }))
		.filter(item => item.axis.visible && (displayed === null || displayed.includes(item.index)));
});

const visibleExtruders = computed(() => {
	const displayed = settings.value.displayedExtruders;
	return machineStore.model.move.extruders
		.map((extruder, index) => ({ extruder, index }))
		.filter(item => displayed === null || displayed.includes(item.index));
});

// Filament monitors are indexed by extruder number, so the monitor for extruder i lives at
// sensors.filamentMonitors[i] (null when none is assigned)
function filamentMonitor(extruderIndex: number): FilamentMonitor | null {
	return machineStore.model.sensors.filamentMonitors[extruderIndex] ?? null;
}

const hasProbes = computed(() =>
	machineStore.model.sensors.probes.some(probe => probe !== null && probe.type !== ProbeType.none));

const visibleProbes = computed<Array<{ probe: Probe; index: number }>>(() => {
	const displayed = settings.value.displayedProbes;
	return machineStore.model.sensors.probes
		.map((probe, index) => ({ probe, index }))
		.filter(item => item.probe !== null && item.probe.type !== ProbeType.none
			&& (displayed === null || displayed.includes(item.index))) as Array<{ probe: Probe; index: number }>;
});

const mainboard = computed(() => machineStore.model.boards.find(board => !board.canAddress) ?? null);

const hasTachoFans = computed(() => machineStore.model.fans.some(fan => fan !== null && fan.rpm >= 0));

const fanRPM = computed(() => {
	const displayed = settings.value.displayedFanRPM;
	return machineStore.model.fans
		.map((fan, index) => ({ fan, index }))
		.filter(item => item.fan !== null && item.fan.rpm >= 0
			&& (displayed === null || displayed.includes(item.index)))
		.map(item => ({
			name: item.fan!.name || `Fan ${item.index}`,
			rpm: item.fan!.rpm
		}));
});

// #endregion

// #region Axis / extruder rows

// In toggle mode the row header flips its mode on click; "both" renders two rows, the other
// modes render one pinned row
const toggledToTool = ref(true);
const toggledToVolume = ref(false);

interface AxisRow {
	machine: boolean;
	toggleable: boolean;
}

const axisRows = computed<Array<AxisRow>>(() => {
	switch (settings.value.positionDisplay) {
		case "tool":
			return [{ machine: false, toggleable: false }];
		case "machine":
			return [{ machine: true, toggleable: false }];
		case "both":
			return [{ machine: false, toggleable: false }, { machine: true, toggleable: false }];
		default:
			return [{ machine: !toggledToTool.value, toggleable: true }];
	}
});

interface ExtruderRow {
	volume: boolean;
	toggleable: boolean;
}

const extruderRows = computed<Array<ExtruderRow>>(() => {
	switch (settings.value.extruderDisplay) {
		case "length":
			return [{ volume: false, toggleable: false }];
		case "volume":
			return [{ volume: true, toggleable: false }];
		case "both":
			return [{ volume: false, toggleable: false }, { volume: true, toggleable: false }];
		default:
			return [{ volume: toggledToVolume.value, toggleable: true }];
	}
});

function displayExtruderAmount(extruder: Extruder, volume: boolean, showUnit: boolean): string {
	if (volume) {
		const radius = extruder.filamentDiameter / 2;
		return display(extruder.position * Math.PI * radius * radius, 1, showUnit ? "mm³" : undefined);
	}
	return display(extruder.position, 1, showUnit ? "mm" : undefined);
}

// #endregion

// #region Per-row visibility

function isSpeedShown(key: string): boolean {
	return settings.value.displayedSpeeds === null || settings.value.displayedSpeeds.includes(key);
}

function isSensorShown(key: string): boolean {
	return settings.value.displayedSensors === null || settings.value.displayedSensors.includes(key);
}

const showRequestedSpeed = computed(() =>
	isSpeedShown("requested") && isFinite(machineStore.model.move.currentMove.requestedSpeed));
const showTopSpeed = computed(() =>
	isSpeedShown("top") && isFinite(machineStore.model.move.currentMove.topSpeed));
const showVolumetricFlow = computed(() =>
	isSpeedShown("volumetricFlow") && uiStore.isFFF && isFinite(volumetricFlow.value));
const showExtrusionRate = computed(() =>
	isSpeedShown("extrusionRate") && uiStore.isFFF && isFinite(machineStore.model.move.currentMove.extrusionRate));
const hasSpeedReadings = computed(() =>
	showRequestedSpeed.value || showTopSpeed.value || showVolumetricFlow.value || showExtrusionRate.value);

const showVIn = computed(() => isSensorShown("vIn") && mainboard.value?.vIn != null);
const showV12 = computed(() => isSensorShown("v12") && mainboard.value?.v12 != null);
const showMcuTemp = computed(() => isSensorShown("mcuTemp") && mainboard.value?.mcuTemp != null);
const showFanRPM = computed(() => isSensorShown("fanRPM") && fanRPM.value.length > 0);

const sensorsPresent = computed(() =>
	showVIn.value || showV12.value || showMcuTemp.value || showFanRPM.value || visibleProbes.value.length > 0);

// Virtual extruder position is its own accumulative row below the extruders; only meaningful
// when the machine actually has extruders
const showVirtualEPos = computed(() =>
	settings.value.virtualEPos && machineStore.model.move.extruders.length > 0);

const hasContent = computed(() =>
	visibleAxes.value.length > 0 || visibleExtruders.value.length > 0 || showVirtualEPos.value
	|| hasSpeedReadings.value || sensorsPresent.value);

// #endregion

// #region Settings inputs

const positionDisplayItems = computed(() => [
	{ value: "tool", title: i18n.global.t("panel.status.settings.positionTool") },
	{ value: "machine", title: i18n.global.t("panel.status.settings.positionMachine") },
	{ value: "toggle", title: i18n.global.t("panel.status.settings.positionToggle") },
	{ value: "both", title: i18n.global.t("panel.status.settings.positionBoth") }
]);

const extruderDisplayItems = computed(() => [
	{ value: "length", title: i18n.global.t("panel.status.settings.userPosition") },
	{ value: "volume", title: i18n.global.t("panel.status.settings.extruderVolume") },
	{ value: "toggle", title: i18n.global.t("panel.status.settings.extruderToggle") },
	{ value: "both", title: i18n.global.t("panel.status.settings.extruderBoth") }
]);

const speedItems = computed(() => [
	{ value: "requested", title: i18n.global.t("panel.status.requestedSpeed") },
	{ value: "top", title: i18n.global.t("panel.status.topSpeed") },
	{ value: "volumetricFlow", title: i18n.global.t("panel.status.volumetricFlow") },
	{ value: "extrusionRate", title: i18n.global.t("panel.status.extrusionRate") }
]);

const sensorItems = computed(() => {
	const items: Array<{ value: string; title: string }> = [];
	if (mainboard.value?.vIn != null) {
		items.push({ value: "vIn", title: i18n.global.t("panel.status.vIn") });
	}
	if (mainboard.value?.v12 != null) {
		items.push({ value: "v12", title: i18n.global.t("panel.status.v12") });
	}
	if (mainboard.value?.mcuTemp != null) {
		items.push({ value: "mcuTemp", title: i18n.global.t("panel.status.mcuTemp") });
	}
	if (hasTachoFans.value) {
		items.push({ value: "fanRPM", title: i18n.global.t("panel.status.fanRPM") });
	}
	return items;
});

// Multi-selects materialise an explicit key list from the `null` (show-all) overlay on first edit
const checkedSpeeds = computed<Array<string>>({
	get: () => settings.value.displayedSpeeds ?? speedItems.value.map(item => item.value),
	set: (value) => { settings.value.displayedSpeeds = value; }
});

const checkedSensors = computed<Array<string>>({
	get: () => settings.value.displayedSensors ?? sensorItems.value.map(item => item.value),
	set: (value) => { settings.value.displayedSensors = value; }
});

// #endregion

// #region Motion system

const hasMultipleMotionSystems = computed(() => machineStore.model.move.motionSystems.length > 1);

// Abbreviate the label to "MS:" only when the title would otherwise carry all four elements
// (caption, status, machine mode, motion system) and run out of horizontal room
const abbreviateMotionSystem = computed(() =>
	hasMultipleMotionSystems.value
	&& !!machineStore.model.state.status
	&& !!machineStore.model.state.machineMode);

// Cycle the displayed motion system; a status poll only overrides this when the machine's own
// HTTP motion system changes (see the machine store)
function cycleMotionSystem() {
	const count = machineStore.model.move.motionSystems.length;
	machineStore.selectedMotionSystem = (machineStore.selectedMotionSystem + 1) % count;
}

// Virtual extrusion position belongs to the currently-selected motion system; defaults to 0 when only
// one motion system is configured (the common case)
const virtualEPos = computed(() => {
	const ms = machineStore.model.move.motionSystems[machineStore.selectedMotionSystem];
	return ms?.virtualEPos ?? NaN;
});

// #endregion

// #region Machine mode

const allMachineModes: Array<MachineMode> = [MachineMode.fff, MachineMode.cnc, MachineMode.laser];

// RRF selects the operating mode through these codes; the menu sends the matching one on click
const machineModeCommands: Record<MachineMode, string> = {
	[MachineMode.fff]: "M451",
	[MachineMode.laser]: "M452",
	[MachineMode.cnc]: "M453"
};

const machineModeItems = allMachineModes.map(mode => ({ value: mode, title: mode }));

// Configured modes in canonical order rather than the order they were picked in the settings
const switchableModes = computed(() => allMachineModes.filter(mode => settings.value.machineModes.includes(mode)));

const changingMode = ref(false);

async function changeMode(mode: MachineMode) {
	if (changingMode.value || mode === machineStore.model.state.machineMode) {
		return;
	}
	changingMode.value = true;
	try {
		await machineStore.sendCode(machineModeCommands[mode]);
	} catch {
		// sendCode reports failures itself
	}
	changingMode.value = false;
}

// #endregion

const volumetricFlow = computed(() => {
	const currentToolIndex = machineStore.model.state.currentTool;
	if (currentToolIndex < 0 || currentToolIndex >= machineStore.model.tools.length) {
		return NaN;
	}
	const selectedTool = machineStore.model.tools[currentToolIndex];
	if (!selectedTool) {
		return NaN;
	}

	let numExtruders = 0;
	let filamentArea = 0;
	for (let i = 0; i < selectedTool.extruders.length; i++) {
		const extruderIndex = selectedTool.extruders[i];
		if (extruderIndex >= 0 && extruderIndex < machineStore.model.move.extruders.length) {
			const extruder = machineStore.model.move.extruders[extruderIndex];
			if (extruder !== null) {
				filamentArea += selectedTool.mix[i] * (Math.PI * Math.pow(extruder.filamentDiameter / 2, 2));
				numExtruders++;
			}
		}
	}
	if (numExtruders === 0) {
		return NaN;
	}
	filamentArea /= numExtruders;
	return filamentArea * machineStore.model.move.currentMove.extrusionRate;
});

function axisSpanClasses(axisIndex: number): string | null {
	const endstops = machineStore.model.sensors.endstops;
	if (axisIndex >= 0 && axisIndex < endstops.length && endstops[axisIndex]?.triggered) {
		return settingsStore.darkTheme ? "bg-light-green-darken-3" : "bg-light-green-lighten-4";
	}
	return null;
}

function formatProbeValues(values: Array<number>): string | number {
	if (values.length === 1) {
		return values[0];
	}
	return `${values[0]} (${values.slice(1).join(", ")})`;
}

function isProbeNearTrigger(probe: Probe): boolean {
	return probe.value.length > 0 && probe.value[0] > probe.threshold * 0.9 && probe.value[0] < probe.threshold;
}

function probeHeight(probe: Probe): number | null {
	return (probe.measuredHeight !== null && isProbeNearTrigger(probe)) ? probe.measuredHeight : null;
}

function probeDisplay(probe: Probe): string | number {
	const height = probeHeight(probe);
	return (height !== null) ? displayZ(height) : formatProbeValues(probe.value);
}

function probeTooltip(probe: Probe): string | undefined {
	if (probeHeight(probe) !== null) {
		return `${formatProbeValues(probe.value)}`;
	}
	return (probe.measuredHeight !== null) ? displayZ(probe.measuredHeight) : undefined;
}

function probeSpanClasses(probe: Probe, isFirstItem: boolean): Array<string> {
	const result: Array<string> = [];
	if (!isFirstItem) {
		result.push("ml-2");
	}
	if (!isPrinting(machineStore.model.state.status) && probe.value.length > 0) {
		if (probe.value[0] >= probe.threshold) {
			result.push(settingsStore.darkTheme ? "bg-red-darken-3" : "bg-red-lighten-4");
		} else if (isProbeNearTrigger(probe)) {
			result.push(settingsStore.darkTheme ? "bg-orange-darken-2" : "bg-orange-lighten-4");
		}
	}
	return result;
}
</script>
