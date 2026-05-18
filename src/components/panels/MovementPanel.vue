<template>
	<v-card>
		<v-card-title class="d-flex align-center py-2">
			<CodeButton v-show="visibleAxes.length > 0" color="primary" code="G28" :disabled="!canHome"
						:title="$t('button.home.titleAll')" class="ml-0 d-none d-md-flex" size="small">
				{{ $t("button.home.captionAll") }}
			</CodeButton>

			<v-spacer class="d-none d-md-flex" />

			<v-icon size="small" class="mr-1">mdi-swap-horizontal</v-icon>
			{{ $t("panel.movement.caption") }}

			<v-spacer />

			<v-menu location="bottom end">
				<template #activator="{ props: activatorProps }">
					<v-btn v-show="visibleAxes.length > 0" v-bind="activatorProps" color="primary" size="small"
						   class="mx-0" :elevation="1">
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

						<v-list-item :disabled="!canHome" @click="sendCode('G32')">
							<template #prepend>
								<v-icon>mdi-format-vertical-align-center</v-icon>
							</template>
							<v-list-item-title>
								{{ isDelta ? $t("panel.movement.runDelta") : $t("panel.movement.runBed") }}
							</v-list-item-title>
						</v-list-item>

						<v-divider />

						<v-list-item :disabled="!canHome" @click="sendCode('G29')">
							<template #prepend>
								<v-icon>mdi-grid</v-icon>
							</template>
							<v-list-item-title>{{ $t("panel.movement.runMesh") }}</v-list-item-title>
						</v-list-item>
						<v-list-item :disabled="uiStore.uiFrozen" @click="showMeshEditDialog = true">
							<template #prepend>
								<v-icon>mdi-pencil</v-icon>
							</template>
							<v-list-item-title>{{ $t("panel.movement.editMesh") }}</v-list-item-title>
						</v-list-item>
						<v-list-item :disabled="uiStore.uiFrozen" @click="sendCode('G29 S1')">
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
		</v-card-title>

		<v-card-text v-show="visibleAxes.length > 0">
			<!-- Mobile home buttons (hidden on md+ where the per-row home button takes over) -->
			<v-row class="d-flex d-md-none py-2" no-gutters>
				<v-col>
					<CodeButton color="primary" code="G28" :disabled="!canHome" :title="$t('button.home.titleAll')"
								block tile>
						{{ $t("button.home.captionAll") }}
					</CodeButton>
				</v-col>
				<template v-if="!isDelta">
					<v-col v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex">
						<CodeButton :color="axis.homed ? 'primary' : 'warning'" :disabled="!canHome"
									:title="$t('button.home.title', [/[a-z]/.test(axis.letter) ? `'${axis.letter}` : axis.letter])"
									:code="`G28 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter}`" block tile>
							{{ $t("button.home.caption", [axis.letter]) }}
						</CodeButton>
					</v-col>
				</template>
			</v-row>

			<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" density="compact">
				<!-- Per-row home button (md+ only) -->
				<v-col v-if="!isDelta" cols="auto" class="flex-shrink-1 d-none d-md-flex">
					<CodeButton :color="axis.homed ? 'primary' : 'warning'" :disabled="!canHome"
								:title="$t('button.home.title', [/[a-z]/.test(axis.letter) ? `'${axis.letter}` : axis.letter])"
								:code="`G28 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter}`" class="ml-0">
						{{ $t("button.home.caption", [axis.letter]) }}
					</CodeButton>
				</v-col>

				<!-- Decreasing movements -->
				<v-col>
					<v-row no-gutters>
						<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(index - 1)">
							<CodeButton :code="getMoveCode(axis, index - 1, true)" :disabled="!canMove(axis)" no-wait
										block tile class="move-btn"
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
										no-wait block tile class="move-btn"
										@contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)">
								{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
								<v-icon>mdi-chevron-right</v-icon>
							</CodeButton>
						</v-col>
					</v-row>
				</v-col>
			</v-row>
		</v-card-text>

		<MeshEditDialog v-model:shown="showMeshEditDialog" />
		<InputDialog v-model:shown="moveStepDialog.shown" :title="$t('dialog.changeMoveStep.title')"
					 :prompt="$t('dialog.changeMoveStep.prompt')" :preset="moveStepDialog.preset" is-numeric-value
					 @confirmed="moveStepDialogConfirmed" />

		<v-alert v-if="unhomedAxes.length > 0" type="warning" class="mb-0">
			{{ $t("panel.movement.axesNotHomed", unhomedAxes.length) }}
			<strong>{{ unhomedAxes.map(axis => axis.letter).join(", ") }}</strong>
		</v-alert>

		<v-alert v-if="visibleAxes.length === 0" type="info">
			{{ $t("panel.movement.noAxes") }}
		</v-alert>
	</v-card>
</template>

<style scoped>
/* Strip the default v-btn horizontal padding so the step labels fit in narrow cells. Don't
   reset min-width - Vuetify's `.v-btn--block` rule (`min-width: 100%`) loses to `min-width: 0`
   here in the cascade, which leaves the button at its intrinsic width and produces visible
   gaps between the buttons and the edges of their flex cells */
.move-btn {
	padding-left: 0 !important;
	padding-right: 0 !important;
}
</style>

<script setup lang="ts">
import { Axis, AxisLetter, KinematicsName, MachineStatus, MoveCompensationType } from "@duet3d/objectmodel";
import { useDisplay } from "vuetify";

import CodeButton from "@/components/buttons/CodeButton.vue";
import InputDialog from "@/components/dialogs/InputDialog.vue";
import MeshEditDialog from "@/components/dialogs/MeshEditDialog.vue";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const { xs: isXs } = useDisplay();
const uiStore = useUiStore();

const showMeshEditDialog = ref(false);
const moveStepDialog = reactive({
	shown: false,
	axis: AxisLetter.X as AxisLetter,
	index: 0,
	preset: 0,
});

const visibleAxes = computed<Array<Axis>>(() => machineStore.model.move.axes.filter(axis => axis.visible));
const unhomedAxes = computed(() => visibleAxes.value.filter(axis => !axis.homed));
const isDelta = computed(() => [KinematicsName.linearDelta, KinematicsName.rotaryDelta].includes(machineStore.model.move.kinematics.name));
const isCompensationEnabled = computed(() => machineStore.model.move.compensation.type !== MoveCompensationType.none);
const compensationType = computed(() => machineStore.model.move.compensation.type);
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
	const isWorkplace = /[a-z]/.test(axis.letter);
	const prefix = isWorkplace ? "'" : "";
	const sign = decrementing ? "-" : "";
	const step = moveSteps(axis.letter)[index];
	return `M120\nG91\nG1 ${prefix}${axis.letter}${sign}${step} F${settingsStore.moveFeedrate}\nM121`;
}

// Progressive disclosure tuned for Vuetify 4's breakpoint defaults (md 840 / lg 1145 / xl 1545 /
// xxl 2138). Most desktops land in xl (1545-2137 px) and get 4 visible step buttons per direction;
// xxl reveals the outermost extra-large step, narrower screens drop down to 3 per direction
// Use d-{bp}-block (not d-{bp}-flex): d-flex on a single-child v-col makes the button shrink to its
// intrinsic width and leaves gaps; d-block matches v-col's natural display so `block` fills the cell
function getMoveCellClass(index: number): string {
	if (index === 0 || index === 5) {
		return "d-none d-xxl-block";
	}
	if (index > 1 && index < 4 && index % 2 === 1) {
		return "d-none d-sm-block";
	}
	return "";
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

// Drop dialogs when the connection breaks so we don't end up with a hanging modal on top of a stale page
watch(() => machineStore.isConnected, (connected) => {
	if (!connected) {
		showMeshEditDialog.value = false;
		moveStepDialog.shown = false;
	}
});
</script>
