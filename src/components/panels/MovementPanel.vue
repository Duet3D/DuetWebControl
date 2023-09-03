<style>
.move-btn {
	padding-left: 0 !important;
	padding-right: 0 !important;
	min-width: 0;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<code-btn v-show="visibleAxes.length" color="primary" small code="G28" :disabled="!canHome"
					  :title="$t('button.home.titleAll')" class="ml-0 hidden-sm-and-down">
				{{ $t("button.home.captionAll") }}
			</code-btn>

			<v-spacer class="hidden-sm-and-down" />

			<v-icon small class="mr-1">mdi-swap-horizontal</v-icon>
			{{ $t("panel.movement.caption") }}

			<v-spacer />

			<v-menu offset-y left>
				<template #activator="{ on }">
					<v-btn v-show="visibleAxes.length" color="primary" small class="mx-0" :elevation="1" v-on="on">
						{{ $t("panel.movement.compensation") }}
						<v-icon>mdi-menu-down</v-icon>
					</v-btn>
				</template>

				<v-card>
					<v-list>
						<template v-show="isCompensationEnabled">
							<v-list-item>
								<v-spacer />
								{{ $t("panel.movement.compensationInUse", [$t(`panel.movement.compensationType.${compensationType}`)]) }}
								<v-spacer />
							</v-list-item>

							<v-divider />
						</template>

						<v-list-item :disabled="!canHome" @click="sendCode('G32')">
							<v-icon class="mr-1">mdi-format-vertical-align-center</v-icon>
							{{ isDelta ? $t("panel.movement.runDelta") : $t("panel.movement.runBed") }}
						</v-list-item>

						<v-divider />

						<v-list-item :disabled="!canHome" @click="sendCode('G29')">
							<v-icon class="mr-1">mdi-grid</v-icon>
							{{ $t("panel.movement.runMesh") }}
						</v-list-item>
						<v-list-item :disabled="uiFrozen" @click="showMeshEditDialog = true">
							<v-icon class="mr-1">mdi-pencil</v-icon>
							{{ $t("panel.movement.editMesh") }}
						</v-list-item>
						<v-list-item :disabled="uiFrozen" @click="sendCode('G29 S1')">
							<v-icon class="mr-1">mdi-content-save</v-icon>
							{{ $t("panel.movement.loadMesh") }}
						</v-list-item>
						<v-list-item :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
							<v-icon class="mr-1">mdi-grid-off</v-icon>
							{{ $t("panel.movement.disableMeshCompensation") }}
						</v-list-item>
					</v-list>
				</v-card>
			</v-menu>
		</v-card-title>

		<v-card-text v-show="visibleAxes.length !== 0">
			<!-- Mobile home buttons -->
			<v-row class="hidden-md-and-up py-2" no-gutters>
				<v-col>
					<code-btn color="primary" code="G28" :disabled="!canHome" :title="$t('button.home.titleAll')" block
							  tile>
						{{ $t("button.home.captionAll") }}
					</code-btn>
				</v-col>
				<template v-if="!isDelta">
					<v-col v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex">
						<code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="!canHome"
								  :title="$t('button.home.title', [axis.letter])" :code="getHomeCode(axis)" block tile>
							{{ $t("button.home.caption", [axis.letter]) }}
						</code-btn>
					</v-col>
				</template>
			</v-row>

			<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" dense>
				<!-- Regular home buttons -->
				<v-col v-if="!isDelta" cols="auto" class="flex-shrink-1 hidden-sm-and-down">
					<code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="!canHome"
							  :title="$t('button.home.title', [axis.letter])" :code="getHomeCode(axis)" class="ml-0">
						{{ $t("button.home.caption", [axis.letter]) }}
					</code-btn>
				</v-col>

				<!-- Decreasing movements -->
				<v-col>
					<v-row no-gutters>
						<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(index - 1)">
							<code-btn :code="getMoveCode(axis, index - 1, true)" :disabled="!canMove(axis)" no-wait
									  @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)" block tile
									  class="move-btn">
								<v-icon>mdi-chevron-left</v-icon>
								{{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
							</code-btn>
						</v-col>
					</v-row>
				</v-col>

				<!-- Increasing movements -->
				<v-col>
					<v-row no-gutters>
						<v-col v-for="index in numMoveSteps" :key="index"
							   :class="getMoveCellClass(numMoveSteps - index)">
							<code-btn :code="getMoveCode(axis, numMoveSteps - index, false)" :disabled="!canMove(axis)"
									  no-wait
									  @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)" block
									  tile class="move-btn">
								{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
								<v-icon>mdi-chevron-right</v-icon>
							</code-btn>
						</v-col>
					</v-row>
				</v-col>
			</v-row>
		</v-card-text>

		<mesh-edit-dialog :shown.sync="showMeshEditDialog"></mesh-edit-dialog>
		<input-dialog :shown.sync="moveStepDialog.shown" :title="$t('dialog.changeMoveStep.title')"
					  :prompt="$t('dialog.changeMoveStep.prompt')" :preset="moveStepDialog.preset" is-numeric-value
					  @confirmed="moveStepDialogConfirmed"></input-dialog>

		<v-alert :value="unhomedAxes.length !== 0" type="warning" class="mb-0">
			{{ $tc("panel.movement.axesNotHomed", unhomedAxes.length) }}
			<strong>
				{{ unhomedAxes.map(axis => axis.letter).join(", ") }}
			</strong>
		</v-alert>

		<v-alert :value="visibleAxes.length === 0" type="info">
			{{ $t("panel.movement.noAxes") }}
		</v-alert>
	</v-card>
</template>

<script lang="ts">
import { Axis, AxisLetter, KinematicsName, MachineStatus, MoveCompensationType } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		isConnected(): boolean { return store.getters["isConnected"]; },
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		moveSteps(): (axisLetter: AxisLetter) => Array<number> { return ((axisLetter: AxisLetter) => store.getters["machine/settings/moveSteps"](axisLetter)); },
			moveSteps: state => function(axis: AxisLetter) {
				return (state.moveSteps[axis] !== undefined) ? state.moveSteps[axis] : state.moveSteps.default;
			},
		numMoveSteps(): number { return store.getters["machine/settings/numMoveSteps"]; },
		numMoveSteps: (state) => state.moveSteps.default.length,
		isCompensationEnabled(): boolean { return store.state.machine.model.move.compensation.type !== MoveCompensationType.none; },
		compensationType(): MoveCompensationType { return store.state.machine.model.move.compensation.type; },
		visibleAxes(): Array<Axis> { return store.state.machine.model.move.axes.filter(axis => axis.visible); },
		isDelta(): boolean { return [KinematicsName.delta, KinematicsName.rotaryDelta].includes(store.state.machine.model.move.kinematics.name); },
		canHome(): boolean {
			return !this.uiFrozen && (
				store.state.machine.model.state.status !== MachineStatus.pausing &&
				store.state.machine.model.state.status !== MachineStatus.processing &&
				store.state.machine.model.state.status !== MachineStatus.resuming);
		},
		unhomedAxes(): Array<Axis> { return store.state.machine.model.move.axes.filter(axis => axis.visible && !axis.homed); }
	},
	data() {
		return {
			showMeshEditDialog: false,
			moveStepDialog: {
				shown: false,
				axis: AxisLetter.X,
				index: 0,
				preset: 0
			}
		}
	},
	methods: {
		async sendCode(code: string) {
			await store.dispatch("machine/sendCode", code);
		},
		canMove(axis: Axis) {
			return (axis.homed || !store.state.machine.model.move.noMovesBeforeHoming) && this.canHome;
		},
		getHomeCode(axis: Axis) {
			return `G28 ${/[a-z]/.test(axis.letter) ? '\'' : ""}${axis.letter}`;
		},
		getMoveCellClass(index: number) {
			let classes = "";
			if (index === 0 || index === 5) {
				classes += "hidden-lg-and-down";
			}
			if (index > 1 && index < 4 && index % 2 === 1) {
				classes += "hidden-md-and-down";
			}
			return classes;
		},
		getMoveCode(axis: Axis, index: number, decrementing: boolean) {
			return `M120\nG91\nG1 ${/[a-z]/.test(axis.letter) ? '\'' : ""}${axis.letter}${decrementing ? '-' : ""}${this.moveSteps(axis.letter)[index]} F${store.state.machine.settings.moveFeedrate}\nM121`;
		},
		showSign: (value: number) => (value > 0) ? `+${value}` : value,
		showMoveStepDialog(axis: AxisLetter, index: number) {
			this.moveStepDialog.axis = axis;
			this.moveStepDialog.index = index;
			this.moveStepDialog.preset = this.moveSteps(this.moveStepDialog.axis)[this.moveStepDialog.index];
			this.moveStepDialog.shown = true;
		},
		moveStepDialogConfirmed(value: number) {
			store.commit("machine/settings/setMoveStep", {
				axis: this.moveStepDialog.axis,
				index: this.moveStepDialog.index,
				value
			});
		}
	},
	watch: {
		isConnected() {
			// Hide dialogs when the connection is interrupted
			this.showMeshEditDialog = false;
			this.moveStepDialog.shown = false;
		}
	}
});
</script>
