<style scoped>
/* Don't reset min-width here - Vuetify's `.v-btn--block` rule (`min-width: 100%`) loses to
   `min-width: 0` in the cascade and the button falls back to its intrinsic width */
.move-btn {
	padding-left: 0 !important;
	padding-right: 0 !important;
}

.cnc-movement .move-btn {
	height: 65px !important;
}

.wcs-selection {
	max-width: 260px;
}
</style>

<template>
	<PanelCard icon="mdi-swap-horizontal" :title="$t('panel.movement.caption')" :class="{ 'cnc-movement': cnc }">
		<template #title-append>
			<v-spacer />

			<!-- CNC: workplace coordinate selector -->
			<v-select v-if="cnc" v-model="currentWorkplace" :items="workCoordinates" hide-details
					  variant="outlined" density="compact" :label="$t('panel.movement.wcs')"
					  v-hint="$t('panel.movement.wcs')" class="wcs-selection"
					  @update:model-value="updateWorkplaceCoordinate" />

			<!-- FFF: home-all button and compensation menu -->
			<template v-else>
				<CodeButton v-show="visibleAxes.length > 0 && settings.showHomeAllButton" color="primary" code="G28"
							:disabled="!canHome" :title="$t('button.home.titleAll')" class="d-none d-md-flex me-2"
							size="small">
					{{ $t("button.home.captionAll") }}
				</CodeButton>

				<v-menu location="bottom end">
					<template #activator="{ props: activatorProps }">
						<v-btn v-show="visibleAxes.length > 0 && compensationMenuVisible" v-bind="activatorProps"
							   color="primary" :size="largeBtnSize ?? 'small'" class="mx-0" :elevation="1">
							{{ isXs ? $t("panel.movement.compensationShort") : $t("panel.movement.compensation") }}
							<v-icon end>mdi-menu-down</v-icon>
						</v-btn>
					</template>

					<v-card>
						<v-list>
							<template v-if="isCompensationEnabled">
								<v-list-item>
									<v-list-item-title class="text-center">
										{{ $t("panel.movement.compensationInUse", [$t(`panel.movement.compensationType.${compensationType}`)]) }}
									</v-list-item-title>
								</v-list-item>

								<v-divider />
							</template>

							<v-list-item v-if="hasCompensationItem('runBed')" :disabled="!canHome" @click="sendCode('G32')">
								<template #prepend>
									<v-icon>mdi-format-vertical-align-center</v-icon>
								</template>
								<v-list-item-title>
									{{ isDelta ? $t("panel.movement.runDelta") : $t("panel.movement.runBed") }}
								</v-list-item-title>
							</v-list-item>

							<v-divider v-if="hasCompensationItem('runBed') && hasMeshCompensationItems" />

							<v-list-item v-if="hasCompensationItem('runMesh')" :disabled="!canHome" @click="sendCode('G29')">
								<template #prepend>
									<v-icon>mdi-grid</v-icon>
								</template>
								<v-list-item-title>{{ $t("panel.movement.runMesh") }}</v-list-item-title>
							</v-list-item>
							<v-list-item v-if="hasCompensationItem('editMesh')" :disabled="uiStore.uiFrozen"
										 @click="showMeshEditDialog = true">
								<template #prepend>
									<v-icon>mdi-pencil</v-icon>
								</template>
								<v-list-item-title>{{ $t("panel.movement.editMesh") }}</v-list-item-title>
							</v-list-item>
							<v-list-item v-if="hasCompensationItem('loadMesh')" :disabled="!canHome"
										 @click="sendCode('G29 S1')">
								<template #prepend>
									<v-icon>mdi-content-save</v-icon>
								</template>
								<v-list-item-title>{{ $t("panel.movement.loadMesh") }}</v-list-item-title>
							</v-list-item>
							<v-list-item v-if="hasCompensationItem('disableMeshCompensation')" :disabled="!isCompensationEnabled"
										 @click="sendCode('G29 S2')">
								<template #prepend>
									<v-icon>mdi-grid-off</v-icon>
								</template>
								<v-list-item-title>{{ $t("panel.movement.disableMeshCompensation") }}</v-list-item-title>
							</v-list-item>
						</v-list>
					</v-card>
				</v-menu>
			</template>
		</template>

		<v-card-text v-show="visibleAxes.length > 0">
			<!-- CNC: work-offset controls plus per-axis jog rows -->
			<template v-if="cnc">
				<v-row density="compact">
					<v-col v-if="settings.showHomeAllButton" cols="6" md="3" class="order-2 order-md-3">
						<CodeButton v-show="visibleAxes.length > 0" block color="primary" code="G28"
									:title="$t('button.home.titleAll')" class="ml-0 move-btn">
							{{ $t("button.home.captionAll") }}
						</CodeButton>
					</v-col>
					<v-col cols="12" md="6" class="order-3 order-md-2">
						<v-btn color="warning" tile block class="move-btn" @click="goToWorkplaceZero">
							{{ $t("panel.movement.workzero") }}
						</v-btn>
					</v-col>
					<v-col cols="6" md="3" class="order-1 order-md-1">
						<v-btn block class="move-btn" @click="setWorkplaceZero">
							{{ $t("panel.movement.setWorkXYZ") }}
						</v-btn>
					</v-col>
				</v-row>

				<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" density="compact">
					<!-- Set axis to zero at the current work offset -->
					<v-col cols="4" sm="4" md="1" class="order-1 order-md-1">
						<v-row density="compact">
							<v-col>
								<CodeButton color="warning" tile block class="move-btn"
											:code="`G10 L20 P${currentWorkplace} ${axisGCodeLetter(axis.letter)}0`">
									{{ $t("panel.movement.set", [axis.letter]) }}
								</CodeButton>
							</v-col>
						</v-row>
						<v-divider class="my-4 d-md-none" />
					</v-col>

					<!-- Decreasing movements -->
					<v-col cols="6" md="5" class="order-3 order-md-2">
						<v-row density="compact">
							<v-col v-for="index in numMoveSteps" :key="index"
								   :class="[getMoveCellClass(index - 1), (index === numMoveSteps ? 'd-none d-md-block' : '')]">
								<CodeButton :code="getMoveCode(axis, index - 1, true)" no-wait block tile class="move-btn"
											@contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)">
									<v-icon>mdi-chevron-left</v-icon>
									{{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
								</CodeButton>
							</v-col>
						</v-row>
					</v-col>

					<!-- Increasing movements -->
					<v-col cols="6" md="5" class="order-4 order-md-3">
						<v-row density="compact">
							<v-col v-for="index in numMoveSteps" :key="index"
								   :class="[getMoveCellClass(numMoveSteps - index), (index === 1 ? 'd-none d-md-block' : '')]">
								<CodeButton :code="getMoveCode(axis, numMoveSteps - index, false)" no-wait block tile
											class="move-btn"
											@contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)">
									{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
									<v-icon>mdi-chevron-right</v-icon>
								</CodeButton>
							</v-col>
						</v-row>
					</v-col>

					<!-- Home this axis -->
					<v-col v-if="settings.showAxisHomeButtons" cols="4" offset="4" sm="4" offset-sm="4" md="1"
						   offset-md="0" class="order-2 order-md-4">
						<v-row density="compact">
							<v-col>
								<CodeButton tile block class="move-btn" :color="axis.homed ? 'primary' : 'warning'"
											:disabled="uiStore.uiFrozen"
											:title="$t('button.home.title', [axisGCodeLetter(axis.letter)])"
											:code="`G28 ${axisGCodeLetter(axis.letter)}`">
									{{ $t("button.home.caption", [axis.letter]) }}
								</CodeButton>
							</v-col>
						</v-row>
						<v-divider class="my-4 d-md-none" />
					</v-col>

					<v-col cols="12" class="d-md-none">
						<v-divider class="my-4" />
					</v-col>
				</v-row>

				<v-row v-if="compensationMenuVisible" density="compact">
					<v-col cols="12">
						<v-divider class="my-4" />
					</v-col>
					<v-col cols="12">
						<v-menu location="bottom end" :disabled="uiStore.uiFrozen">
							<template #activator="{ props: activatorProps }">
								<v-btn v-show="visibleAxes.length > 0" v-bind="activatorProps" color="primary" block
									   class="mx-0 move-btn" :disabled="uiStore.uiFrozen">
									{{ isXs ? $t("panel.movement.compensationShort") : $t("panel.movement.compensation") }}
									<v-icon end>mdi-menu-down</v-icon>
								</v-btn>
							</template>
							<v-card>
								<v-list>
									<template v-if="isCompensationEnabled">
										<v-list-item>
											<v-list-item-title class="text-center">
												{{ $t("panel.movement.compensationInUse", [$t(`panel.movement.compensationType.${compensationType}`)]) }}
											</v-list-item-title>
										</v-list-item>
										<v-divider />
									</template>
									<v-list-item v-if="hasCompensationItem('runBed')" @click="sendCode('G32')">
										<template #prepend>
											<v-icon>mdi-format-vertical-align-center</v-icon>
										</template>
										<v-list-item-title>
											{{ isDelta ? $t("panel.movement.runDelta") : $t("panel.movement.runBed") }}
										</v-list-item-title>
									</v-list-item>
									<v-list-item v-if="hasCompensationItem('disableBedCompensation')"
												 :disabled="!isCompensationEnabled" @click="sendCode('M561')">
										<template #prepend>
											<v-icon>mdi-border-none</v-icon>
										</template>
										<v-list-item-title>{{ $t("panel.movement.disableBedCompensation") }}</v-list-item-title>
									</v-list-item>

									<v-divider v-if="hasBedCompensationItems && hasMeshCompensationItems" />

									<v-list-item v-if="hasCompensationItem('runMesh')" @click="sendCode('G29')">
										<template #prepend>
											<v-icon>mdi-grid</v-icon>
										</template>
										<v-list-item-title>{{ $t("panel.movement.runMesh") }}</v-list-item-title>
									</v-list-item>
									<v-list-item v-if="hasCompensationItem('editMesh')" @click="showMeshEditDialog = true">
										<template #prepend>
											<v-icon>mdi-pencil</v-icon>
										</template>
										<v-list-item-title>{{ $t("panel.movement.editMesh") }}</v-list-item-title>
									</v-list-item>
									<v-list-item v-if="hasCompensationItem('loadMesh')" @click="sendCode('G29 S1')">
										<template #prepend>
											<v-icon>mdi-content-save</v-icon>
										</template>
										<v-list-item-title>{{ $t("panel.movement.loadMesh") }}</v-list-item-title>
									</v-list-item>
									<v-list-item v-if="hasCompensationItem('disableMeshCompensation')"
												 :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
										<template #prepend>
											<v-icon>mdi-grid-off</v-icon>
										</template>
										<v-list-item-title>{{ $t("panel.movement.disableMeshCompensation") }}</v-list-item-title>
									</v-list-item>
								</v-list>
							</v-card>
						</v-menu>
					</v-col>
				</v-row>
			</template>

			<!-- FFF: per-axis jog grid -->
			<template v-else>
				<!-- Mobile home buttons (hidden on md+ where the per-row home button takes over) -->
				<v-row v-if="settings.showHomeAllButton || (settings.showAxisHomeButtons && !isDelta)"
					   class="d-flex d-md-none py-2" no-gutters>
					<v-col v-if="settings.showHomeAllButton">
						<CodeButton color="primary" code="G28" :disabled="!canHome" :title="$t('button.home.titleAll')"
									:size="largeBtnSize" block tile>
							{{ $t("button.home.captionAll") }}
						</CodeButton>
					</v-col>
					<template v-if="settings.showAxisHomeButtons && !isDelta">
						<v-col v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex">
							<CodeButton :color="axis.homed ? 'primary' : 'warning'" :disabled="!canHome"
										:title="$t('button.home.title', [axisGCodeLetter(axis.letter)])"
										:code="`G28 ${axisGCodeLetter(axis.letter)}`"
										:size="largeBtnSize" block tile>
								{{ $t("button.home.caption", [axis.letter]) }}
							</CodeButton>
						</v-col>
					</template>
				</v-row>

				<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" density="compact">
					<!-- Per-row home button (md+ only) -->
					<v-col v-if="!isDelta && settings.showAxisHomeButtons" cols="auto" class="flex-shrink-1 d-none d-md-flex">
						<CodeButton :color="axis.homed ? 'primary' : 'warning'" :disabled="!canHome"
									:title="$t('button.home.title', [axisGCodeLetter(axis.letter)])"
									:code="`G28 ${axisGCodeLetter(axis.letter)}`" class="ml-0">
							{{ $t("button.home.caption", [axis.letter]) }}
						</CodeButton>
					</v-col>

					<!-- Decreasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(index - 1)">
								<CodeButton :code="getMoveCode(axis, index - 1, true)" :disabled="!canMove(axis)" no-wait
											:size="largeBtnSize" block tile class="move-btn"
											@contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)">
									<v-icon>mdi-chevron-left</v-icon>
									{{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
								</CodeButton>
							</v-col>
						</v-row>
					</v-col>

					<!-- Increasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(numMoveSteps - index)">
								<CodeButton :code="getMoveCode(axis, numMoveSteps - index, false)" :disabled="!canMove(axis)"
											no-wait :size="largeBtnSize" block tile class="move-btn"
											@contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)">
									{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
									<v-icon>mdi-chevron-right</v-icon>
								</CodeButton>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>
		</v-card-text>

		<v-alert v-if="unhomedAxes.length > 0" type="warning" class="mb-0">
			{{ $t("panel.movement.axesNotHomed", unhomedAxes.length) }}
			<strong>{{ unhomedAxes.map(axis => axis.letter).join(", ") }}</strong>
		</v-alert>

		<v-alert v-if="visibleAxes.length === 0" type="info">
			{{ $t("panel.movement.noAxes") }}
		</v-alert>

		<MeshEditDialog v-model:shown="showMeshEditDialog" />

		<template #settings>
			<EntityVisibilityList kind="axes" :label="$t('panel.movement.displayedAxes')"
								  v-model="settings.displayedAxes" />

			<v-divider class="my-3" />

			<v-switch v-model="settings.showHomeAllButton" color="primary"
					  :label="$t('panel.movement.settings.showHomeAllButton')"
					  v-hint="$t('panel.movement.settings.showHomeAllButtonHint')"
					  density="comfortable" hide-details />
			<v-switch v-model="settings.showAxisHomeButtons" color="primary"
					  :label="$t('panel.movement.settings.showAxisHomeButtons')"
					  v-hint="$t('panel.movement.settings.showAxisHomeButtonsHint')"
					  density="comfortable" hide-details />

			<v-divider class="my-3" />

			<v-autocomplete v-model="compensationItemsModel" :items="compensationItemOptions"
							:label="$t('panel.movement.settings.compensationItems')"
							v-hint="$t('panel.movement.settings.compensationItemsHint')"
							variant="outlined" density="comfortable" hide-details chips closable-chips clearable multiple />

			<v-divider class="my-3" />

			<v-number-input v-model="settings.moveFeedrate" :min="1" :step="600" :precision="0"
							:label="$t('panel.movement.settings.moveFeedrate')"
							v-hint="$t('panel.movement.settings.moveFeedrateHint')"
							variant="outlined" density="comfortable" hide-details suffix="mm/min" />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { Axis, AxisLetter, KinematicsName, MachineStatus, MoveCompensationType } from "@duet3d/objectmodel";
import { useDisplay } from "vuetify";

import CodeButton from "@/components/buttons/CodeButton.vue";
import { getNumericInput } from "@/composables/useInputDialog";
import MeshEditDialog from "@/components/dialogs/MeshEditDialog.vue";
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useLargeButtons } from "@/composables/useLargeButtons";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { axisGCodeLetter } from "@/utils/gcode";

const props = defineProps<{
	// Render the CNC workplace-coordinate layout instead of the FFF jog grid
	cnc?: boolean;
}>();

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const { xs: isXs } = useDisplay();
// Large-buttons mode lifts every jog / home / compensation button to v-btn size="large"
// at sm so the FFF jog grid is reachable with a finger
const { btnSize: largeBtnSize } = useLargeButtons();

// Compensation drop-down entries the user can show or hide from the panel settings
type CompensationMenuItem = "runBed" | "disableBedCompensation" | "runMesh" | "editMesh"
	| "loadMesh" | "disableMeshCompensation";

interface MovementPanelSettings {
	// Axis-visibility overlay; `null` shows every visible axis
	displayedAxes: Array<number> | null;
	showHomeAllButton: boolean;
	showAxisHomeButtons: boolean;
	compensationItems: Array<CompensationMenuItem>;
	// Feedrate sent with the manual move buttons (G1 F[value]), in mm/min
	moveFeedrate: number;
}

// disableBedCompensation only exists in the CNC layout, so the FFF default omits it - leaving it
// out of the persisted list keeps the settings autocomplete from showing an orphaned chip there
const settings = useComponentSettings<MovementPanelSettings>({
	displayedAxes: null,
	showHomeAllButton: true,
	showAxisHomeButtons: true,
	moveFeedrate: 6000,
	compensationItems: props.cnc
		? ["runBed", "disableBedCompensation", "runMesh", "editMesh", "loadMesh", "disableMeshCompensation"]
		: ["runBed", "runMesh", "editMesh", "loadMesh", "disableMeshCompensation"],
});

const showMeshEditDialog = ref(false);
const currentWorkplace = ref(1);

const visibleAxes = computed<Array<Axis>>(() => {
	const displayed = settings.value.displayedAxes;
	return machineStore.model.move.axes.filter((axis, index) =>
		axis.visible && (displayed === null || displayed.includes(index)));
});
const unhomedAxes = computed(() => visibleAxes.value.filter(axis => !axis.homed));
const isDelta = computed(() => [KinematicsName.linearDelta, KinematicsName.rotaryDelta].includes(machineStore.model.move.kinematics.name));
const isCompensationEnabled = computed(() => machineStore.model.move.compensation.type !== MoveCompensationType.none);
const compensationType = computed(() => machineStore.model.move.compensation.type);

function hasCompensationItem(item: CompensationMenuItem): boolean {
	return settings.value.compensationItems.includes(item);
}

const meshCompensationItems: ReadonlyArray<CompensationMenuItem> =
	["runMesh", "editMesh", "loadMesh", "disableMeshCompensation"];
const hasMeshCompensationItems = computed(() => meshCompensationItems.some(hasCompensationItem));
const hasBedCompensationItems = computed(() =>
	hasCompensationItem("runBed") || hasCompensationItem("disableBedCompensation"));

// Entries offered by the compensation drop-down for this layout; disableBedCompensation is
// CNC-only. The drop-down button is hidden entirely once the user deselects every entry
const compensationItemOptions = computed<Array<{ value: CompensationMenuItem; title: string }>>(() => {
	const options: Array<{ value: CompensationMenuItem; title: string }> = [
		{ value: "runBed", title: isDelta.value ? i18n.global.t("panel.movement.runDelta") : i18n.global.t("panel.movement.runBed") },
	];
	if (props.cnc) {
		options.push({ value: "disableBedCompensation", title: i18n.global.t("panel.movement.disableBedCompensation") });
	}
	options.push(
		{ value: "runMesh", title: i18n.global.t("panel.movement.runMesh") },
		{ value: "editMesh", title: i18n.global.t("panel.movement.editMesh") },
		{ value: "loadMesh", title: i18n.global.t("panel.movement.loadMesh") },
		{ value: "disableMeshCompensation", title: i18n.global.t("panel.movement.disableMeshCompensation") }
	);
	return options;
});
const compensationMenuVisible = computed(() =>
	compensationItemOptions.value.some(option => hasCompensationItem(option.value)));

// v-autocomplete emits null when cleared; normalise it back to an empty array
const compensationItemsModel = computed<Array<CompensationMenuItem>>({
	get: () => settings.value.compensationItems,
	set: (value) => { settings.value.compensationItems = value ?? []; }
});
const canHome = computed(() => {
	if (uiStore.uiFrozen) {
		return false;
	}
	const status = machineStore.model.state.status;
	return status !== MachineStatus.pausing && status !== MachineStatus.processing && status !== MachineStatus.resuming;
});
// Driven by the per-axis move-step settings: the array length is fixed at five today, but reading
// it back from the settings store leaves room for future per-axis customisation
const numMoveSteps = computed(() => settingsStore.moveSteps.default.length);
const workCoordinates = computed(() => [...Array(9).keys()].map(i => i + 1));
const workplaceNumber = computed(() => {
	const system = machineStore.model.move.motionSystems[machineStore.selectedMotionSystem];
	return system ? system.workplaceNumber : 0;
});

function moveSteps(axis: AxisLetter): Array<number> {
	return settingsStore.moveSteps[axis] ?? settingsStore.moveSteps.default;
}

function canMove(axis: Axis): boolean {
	return canHome.value && (axis.homed || !machineStore.model.move.noMovesBeforeHoming);
}

function sendCode(code: string) {
	return machineStore.sendCode(code);
}

function getMoveCode(axis: Axis, index: number, decrementing: boolean) {
	const sign = decrementing ? "-" : "";
	const step = moveSteps(axis.letter)[index];
	return `M120\nG91\nG1 ${axisGCodeLetter(axis.letter)}${sign}${step} F${settings.value.moveFeedrate}\nM121`;
}

// Progressive disclosure tuned for Vuetify 4's breakpoint defaults (sm 600 / md 840 / xl 1545 /
// xxl 2138). The outermost steps (index 0 and 5) only appear at xxl; the odd middle steps appear
// from sm in FFF mode and from xl in CNC mode, whose buttons are wider. Use d-{bp}-block (not
// d-{bp}-flex): d-flex on a single-child v-col shrinks the button to its intrinsic width and
// leaves gaps; d-block matches v-col's natural display so `block` fills the cell
function getMoveCellClass(index: number): string {
	if (index === 0 || index === 5) {
		return "d-none d-xxl-block";
	}
	if (index > 1 && index < 4 && index % 2 === 1) {
		return props.cnc ? "d-none d-xl-block" : "d-none d-sm-block";
	}
	return "";
}

function showSign(value: number): string {
	return value > 0 ? `+${value}` : value.toString();
}

async function showMoveStepDialog(axis: AxisLetter, index: number) {
	const value = await getNumericInput(i18n.global.t("dialog.changeMoveStep.title"), i18n.global.t("dialog.changeMoveStep.prompt"), moveSteps(axis)[index]);
	if (value === null) {
		return;
	}
	settingsStore.setMoveStep(axis, index, value);
}

async function setWorkplaceZero() {
	let code = `G10 L20 P${currentWorkplace.value}`;
	for (const axis of visibleAxes.value) {
		code += ` ${axisGCodeLetter(axis.letter)}0`;
	}
	// The trailing G10 L20 ensures the WCS confirms the new offsets even if RRF buffers the first one
	await machineStore.sendCode(`${code}\nG10 L20 P${currentWorkplace.value}`);
}

async function goToWorkplaceZero() {
	await machineStore.sendCode('M98 P"workzero.g"');
}

async function updateWorkplaceCoordinate(value: number) {
	// G54..G59 are 1..6; G59.1..G59.3 are 7..9
	const code = value < 7 ? `G${53 + value}` : `G59.${value - 6}`;
	await machineStore.sendCode(`${code}\nG10 L20 P${value}`);
}

onMounted(() => {
	currentWorkplace.value = workplaceNumber.value + 1;
});

watch(workplaceNumber, (to) => {
	currentWorkplace.value = to + 1;
});

// Drop the mesh-edit dialog when the connection breaks so we don't end up with a hanging modal on top of a stale page
watch(() => machineStore.isConnected, (connected) => {
	if (!connected) {
		showMeshEditDialog.value = false;
	}
});
</script>
