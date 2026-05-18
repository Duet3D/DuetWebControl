<template>
	<v-card>
		<v-card-title class="d-flex align-center pt-0">
			<v-icon size="small" class="mr-1">mdi-swap-horizontal</v-icon>
			{{ $t("panel.movement.caption") }}
			<v-spacer />
			<v-select v-model="currentWorkplace" :items="workCoordinates" hide-details
					  :title="$t('panel.movement.wcs')" class="wcs-selection"
					  @update:model-value="updateWorkplaceCoordinate" />
		</v-card-title>

		<v-card-text v-show="visibleAxes.length > 0">
			<v-row density="compact">
				<v-col cols="6" order="2" md="3" order-md="3">
					<CodeButton v-show="visibleAxes.length > 0" block color="primary" code="G28"
								:title="$t('button.home.titleAll')" class="ml-0 move-btn">
						{{ $t("button.home.captionAll") }}
					</CodeButton>
				</v-col>
				<v-col cols="12" order="3" md="6" order-md="2">
					<v-btn color="warning" tile block class="move-btn" @click="goToWorkplaceZero">
						{{ $t("panel.movement.workzero") }}
					</v-btn>
				</v-col>
				<v-col cols="6" order="1" md="3" order-md="1">
					<v-btn block class="move-btn" @click="setWorkplaceZero">
						{{ $t("panel.movement.setWorkXYZ") }}
					</v-btn>
				</v-col>
			</v-row>

			<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" density="compact">
				<!-- Set axis to zero at the current work offset -->
				<v-col cols="4" order="1" sm="4" md="1" order-md="1">
					<v-row density="compact">
						<v-col>
							<CodeButton color="warning" tile block class="move-btn"
										:code="`G10 L20 P${currentWorkplace} ${axis.letter}0`">
								{{ $t("panel.movement.set", [axis.letter]) }}
							</CodeButton>
						</v-col>
					</v-row>
					<v-divider class="my-4 d-md-none" />
				</v-col>

				<!-- Decreasing movements -->
				<v-col cols="6" order="3" md="5" order-md="2">
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
				<v-col cols="6" order="4" md="5" order-md="3">
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
				<v-col cols="4" order="2" offset="4" sm="4" offset-sm="4" md="1" order-md="4" offset-md="0">
					<v-row density="compact">
						<v-col>
							<CodeButton tile block class="move-btn" :color="axis.homed ? 'primary' : 'warning'"
										:disabled="uiStore.uiFrozen"
										:title="$t('button.home.title', [/[a-z]/.test(axis.letter) ? `'${axis.letter}` : axis.letter])"
										:code="`G28 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter}`">
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

			<v-row density="compact">
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
											{{ $t("panel.movement.compensationInUse", [compensationType]) }}
										</v-list-item-title>
									</v-list-item>
									<v-divider />
								</template>
								<v-list-item @click="sendCode('G32')">
									<template #prepend>
										<v-icon>mdi-format-vertical-align-center</v-icon>
									</template>
									<v-list-item-title>
										{{ isDelta ? $t("panel.movement.runDelta") : $t("panel.movement.runBed") }}
									</v-list-item-title>
								</v-list-item>
								<v-list-item :disabled="!isCompensationEnabled" @click="sendCode('M561')">
									<template #prepend>
										<v-icon>mdi-border-none</v-icon>
									</template>
									<v-list-item-title>{{ $t("panel.movement.disableBedCompensation") }}</v-list-item-title>
								</v-list-item>

								<v-divider />

								<v-list-item @click="sendCode('G29')">
									<template #prepend>
										<v-icon>mdi-grid</v-icon>
									</template>
									<v-list-item-title>{{ $t("panel.movement.runMesh") }}</v-list-item-title>
								</v-list-item>
								<v-list-item @click="showMeshEditDialog = true">
									<template #prepend>
										<v-icon>mdi-pencil</v-icon>
									</template>
									<v-list-item-title>{{ $t("panel.movement.editMesh") }}</v-list-item-title>
								</v-list-item>
								<v-list-item @click="sendCode('G29 S1')">
									<template #prepend>
										<v-icon>mdi-content-save</v-icon>
									</template>
									<v-list-item-title>{{ $t("panel.movement.loadMesh") }}</v-list-item-title>
								</v-list-item>
								<v-list-item :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
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
		</v-card-text>

		<v-alert v-if="unhomedAxes.length > 0" type="warning" class="mb-0">
			{{ $t("panel.movement.axesNotHomed", unhomedAxes.length) }}
			<strong>{{ unhomedAxes.map(axis => axis.letter).join(", ") }}</strong>
		</v-alert>

		<v-alert v-if="visibleAxes.length === 0" type="info">
			{{ $t("panel.movement.noAxes") }}
		</v-alert>

		<MeshEditDialog v-model:shown="showMeshEditDialog" />
		<InputDialog v-model:shown="moveStepDialog.shown" :title="$t('dialog.changeMoveStep.title')"
					 :prompt="$t('dialog.changeMoveStep.prompt')" :preset="moveStepDialog.preset" is-numeric-value
					 @confirmed="moveStepDialogConfirmed" />
	</v-card>
</template>

<style scoped>
/* Drop default v-btn horizontal padding so step labels fit narrow cells; do not reset
   min-width or the cascade kills `.v-btn--block`'s `min-width: 100%` (see MovementPanel) */
.move-btn {
	height: 65px !important;
	padding-left: 0 !important;
	padding-right: 0 !important;
}

.wcs-selection {
	max-width: 200px;
}
</style>

<script setup lang="ts">
import { Axis, AxisLetter, KinematicsName, MoveCompensationType } from "@duet3d/objectmodel";
import { useDisplay } from "vuetify";

import CodeButton from "@/components/buttons/CodeButton.vue";
import InputDialog from "@/components/dialogs/InputDialog.vue";
import MeshEditDialog from "@/components/dialogs/MeshEditDialog.vue";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const { xs: isXs } = useDisplay();

const showMeshEditDialog = ref(false);
const moveStepDialog = reactive({
	shown: false,
	axis: AxisLetter.X as AxisLetter,
	index: 0,
	preset: 0,
});
const currentWorkplace = ref(1);

const visibleAxes = computed<Array<Axis>>(() => machineStore.model.move.axes.filter(axis => axis.visible));
const unhomedAxes = computed(() => visibleAxes.value.filter(axis => !axis.homed));
const isDelta = computed(() => [KinematicsName.linearDelta, KinematicsName.rotaryDelta].includes(machineStore.model.move.kinematics.name));
const isCompensationEnabled = computed(() => machineStore.model.move.compensation.type !== MoveCompensationType.none);
const compensationType = computed(() => machineStore.model.move.compensation.type);
const numMoveSteps = computed(() => settingsStore.moveSteps.default.length);
const workCoordinates = computed(() => [...Array(9).keys()].map(i => i + 1));
const workplaceNumber = computed(() => {
	const system = machineStore.model.move.motionSystems[machineStore.selectedMotionSystem];
	return system ? system.workplaceNumber : 0;
});

function moveSteps(axis: AxisLetter): Array<number> {
	return settingsStore.moveSteps[axis] ?? settingsStore.moveSteps.default;
}

// Step hiding mirrors MovementPanel's logic so the two panels stay visually aligned
function getMoveCellClass(index: number): string {
	if (index === 0 || index === 5) {
		return "d-none d-xxl-block";
	}
	if (index > 1 && index < 4 && index % 2 === 1) {
		return "d-none d-xl-block";
	}
	return "";
}

function getMoveCode(axis: Axis, index: number, decrementing: boolean) {
	const isWorkplace = /[a-z]/.test(axis.letter);
	const prefix = isWorkplace ? "'" : "";
	const sign = decrementing ? "-" : "";
	const step = moveSteps(axis.letter)[index];
	return `M120\nG91\nG1 ${prefix}${axis.letter}${sign}${step} F${settingsStore.moveFeedrate}\nM121`;
}

function showSign(value: number): string {
	return value > 0 ? `+${value}` : value.toString();
}

function showMoveStepDialog(axis: AxisLetter, index: number) {
	moveStepDialog.axis = axis;
	moveStepDialog.index = index;
	moveStepDialog.preset = moveSteps(axis)[index];
	moveStepDialog.shown = true;
}

function moveStepDialogConfirmed(value: string | number) {
	settingsStore.setMoveStep(moveStepDialog.axis, moveStepDialog.index, value as number);
}

function sendCode(code: string) {
	return machineStore.sendCode(code);
}

async function setWorkplaceZero() {
	let code = `G10 L20 P${currentWorkplace.value}`;
	for (const axis of visibleAxes.value) {
		code += ` ${axis.letter}0`;
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

watch(() => machineStore.isConnected, (connected) => {
	if (!connected) {
		showMeshEditDialog.value = false;
		moveStepDialog.shown = false;
	}
});
</script>
