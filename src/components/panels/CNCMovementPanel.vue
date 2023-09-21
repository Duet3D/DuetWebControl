<style scoped>
.move-btn {
	padding-left: 0px !important;
	padding-right: 0px !important;
	min-width: 0;
	height: 65px !important;
}

.wcs-selection {
	max-width: 200px;
}
</style>

<template>
	<v-card>
		<v-card-title class="pt-0">
			<v-icon small class="mr-1">mdi-swap-horizontal</v-icon>
			{{ $t("panel.movement.caption") }}
			<v-spacer />
			<v-select v-model="currentWorkplace" :items="workCoordinates" class="wcs-selection"
					  hint="Work Coordinate System" @change="updateWorkplaceCoordinate" persistent-hint />
		</v-card-title>
		<v-card-text v-show="visibleAxes.length">
			<v-row dense>
				<v-col cols="6" order="1" md="2" order-md="1">
					<code-btn block v-show="visibleAxes.length" color="primary" code="G28"
							  :title="$t('button.home.titleAll')" class="ml-0 move-btn">
						{{ $t("button.home.captionAll") }}
					</code-btn>
				</v-col>
				<v-col cols="6" order="2" md="8" order-md="2">
					<v-menu offset-y left :disabled="uiFrozen">
						<template #activator="{ on }">
							<v-btn v-show="visibleAxes.length" color="primary" block class="mx-0 move-btn"
								   :disabled="uiFrozen" v-on="on">
								{{ $t("panel.movement.compensation") }}
								<v-icon>mdi-menu-down</v-icon>
							</v-btn>
						</template>

						<v-card>
							<v-list>
								<div v-show="isCompensationEnabled">
									<v-list-item>
										<v-spacer />
										{{ $t("panel.movement.compensationInUse", [compensationType]) }}
										<v-spacer />
									</v-list-item>

									<v-divider />
								</div>

								<v-list-item @click="sendCode('G32')">
									<v-icon class="mr-1">mdi-format-vertical-align-center</v-icon>
									{{ $t(isDelta ? "panel.movement.runDelta" : "panel.movement.runBed") }}
								</v-list-item>
								<v-list-item :disabled="!isCompensationEnabled" @click="sendCode('M561')">
									<v-icon class="mr-1">mdi-border-none</v-icon>
									{{ $t("panel.movement.disableBedCompensation") }}
								</v-list-item>

								<v-divider />

								<v-list-item @click="sendCode('G29')">
									<v-icon class="mr-1">mdi-grid</v-icon>
									{{ $t("panel.movement.runMesh") }}
								</v-list-item>
								<v-list-item @click="showMeshEditDialog = true">
									<v-icon class="mr-1">mdi-pencil</v-icon>
									{{ $t("panel.movement.editMesh") }}
								</v-list-item>
								<v-list-item @click="sendCode('G29 S1')">
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
				</v-col>
				<v-col cols="12" order="3" md="2" order-md="3">
					<v-btn @click="setWorkplaceZero" block class="move-btn">
						{{ $t("panel.movement.setWorkXYZ") }}
					</v-btn>
				</v-col>
			</v-row>

			<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" dense>
				<!-- Regular home buttons -->
				<v-col cols="2" order="1" sm="4" md="1" order-md="1">
					<v-row dense>
						<v-col>
							<code-btn tile block :color="axis.homed ? 'primary' : 'warning'" :disabled="uiFrozen"
									  :title="$t('button.home.title', [/[a-z]/.test(axis.letter) ? `'${axis.letter}` : axis.letter])"
									  :code="`G28 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter}`" class="move-btn">
								{{ $t("button.home.caption", [axis.letter]) }}
							</code-btn>
						</v-col>
					</v-row>
				</v-col>

				<!-- Decreasing movements -->
				<v-col cols="6" order="3" md="5" order-md="2">
					<v-row dense>
						<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(index - 1)">
							<code-btn :code="getMoveCode(axis, index - 1, true)" no-wait
									  @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)" block tile
									  class="move-btn">
								<v-icon>mdi-chevron-left</v-icon>
								{{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
							</code-btn>
						</v-col>
					</v-row>
				</v-col>

				<!-- Increasing movements -->
				<v-col cols="6" order="4" md="5" order-md="3">
					<v-row dense>
						<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(numMoveSteps - index)">
							<code-btn :code="getMoveCode(axis, numMoveSteps - index, false)" no-wait
									  @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)" block
									  tile class="move-btn">
								{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
								<v-icon>mdi-chevron-right</v-icon>
							</code-btn>
						</v-col>
					</v-row>
				</v-col>

				<!-- Set axis-->
				<v-col cols="2" order="2" offset="8" sm="4" offset-sm="4" md="1" order-md="4" offset-md="0">
					<v-row dense>
						<v-col>
							<code-btn color="warning" tile block :code="`G10 L20 P${currentWorkplace} ${axis.letter}0`"
									  class="move-btn">
								{{ $t("panel.movement.set", [axis.letter]) }}
							</code-btn>
						</v-col>
					</v-row>
				</v-col>
			</v-row>

			<v-row dense>
				<v-col>
					<v-btn color="warning" @click="goToWorkplaceZero" tile block class="move-btn">
						{{ $t("panel.movement.workzero") }}
					</v-btn>
				</v-col>
			</v-row>
		</v-card-text>

		<v-alert :value="unhomedAxes.length !== 0" type="warning" class="mb-0">
			{{ $tc("panel.movement.axesNotHomed", unhomedAxes.length) }}
			<strong>
				{{ unhomedAxes.map(axis => axis.letter).join(", ") }}
			</strong>
		</v-alert>
		<v-alert :value="visibleAxes.length === 0" type="info">
			{{ $t("panel.movement.noAxes") }}
		</v-alert>

		<mesh-edit-dialog :shown.sync="showMeshEditDialog" />
		<input-dialog :shown.sync="moveStepDialog.shown" :title="$t('dialog.changeMoveStep.title')"
					  :prompt="$t('dialog.changeMoveStep.prompt')" :preset="moveStepDialog.preset" is-numeric-value
					  @confirmed="moveStepDialogConfirmed" />
	</v-card>
</template>

<script lang="ts">
import { Axis, AxisLetter, KinematicsName, MoveCompensationType } from "@duet3d/objectmodel";
import Vue from "vue";

import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";
import { useSettingsStore } from "@/store/settings";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return useUiStore().uiFrozen; },
		moveSteps(): (axisLetter: AxisLetter) => Array<number> { return ((axisLetter: AxisLetter) => useSettingsStore().moveSteps[axisLetter]); },
		numMoveSteps(): number { return useSettingsStore().moveSteps.default.length; },
		isCompensationEnabled(): boolean { return useMachineStore().model.move.compensation.type !== MoveCompensationType.none; },
		compensationType(): MoveCompensationType { return useMachineStore().model.move.compensation.type; },
		visibleAxes(): Array<Axis> { return useMachineStore().model.move.axes.filter(axis => axis.visible); },
		isDelta(): boolean { return [KinematicsName.delta, KinematicsName.rotaryDelta].includes(useMachineStore().model.move.kinematics.name); },
		unhomedAxes(): Array<Axis> { return useMachineStore().model.move.axes.filter(axis => axis.visible && !axis.homed); },
		workCoordinates(): Array<number> { return [...Array(9).keys()].map(i => i + 1); },
		workplaceNumber(): number { return useMachineStore().model.move.workplaceNumber; }
	},
	data() {
		return {
			showMeshEditDialog: false,
			moveStepDialog: {
				shown: false,
				axis: AxisLetter.X,
				index: 0,
				preset: 0
			},
			currentWorkplace: 0
		};
	},
	methods: {
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
			return `M120\nG91\nG1 ${/[a-z]/.test(axis.letter) ? '\'' : ""}${axis.letter}${decrementing ? '-' : ""}${this.moveSteps(axis.letter)[index]} F${useSettingsStore().moveFeedrate}\nM121`;
		},
		showSign: (value: number) => (value > 0 ? `+${value}` : value),
		showMoveStepDialog(axis: AxisLetter, index: number) {
			this.moveStepDialog.axis = axis;
			this.moveStepDialog.index = index;
			this.moveStepDialog.preset = this.moveSteps(this.moveStepDialog.axis)[this.moveStepDialog.index];
			this.moveStepDialog.shown = true;
		},
		moveStepDialogConfirmed(value: number) {
			useSettingsStore().moveSteps[this.moveStepDialog.axis][this.moveStepDialog.index] = value;
		},
		async sendCode(code: string) {
			await useMachineStore().sendCode(code);
		},
		async setWorkplaceZero() {
			let code = `G10 L20 P${this.currentWorkplace}`;
			this.visibleAxes.forEach(axis => (code += ` ${axis.letter}0`));
			await useMachineStore().sendCode(`${code}\nG10 L20 P${this.currentWorkplace}`);
		},
		async goToWorkplaceZero() {
			await useMachineStore().sendCode('M98 P"workzero.g"');
		},
		async updateWorkplaceCoordinate() {
			let code;
			if (this.currentWorkplace < 7) {
				code = `G${53 + this.currentWorkplace}`;
			} else {
				code = `G59.${this.currentWorkplace - 6}`;
			}

			if (code) {
				await useMachineStore().sendCode(`${code}\nG10 L20 P${this.currentWorkplace}`);
			}
		},
	},
	mounted() {
		this.currentWorkplace = this.workplaceNumber + 1;
	},
	watch: {
		isConnected() {
			// Hide dialogs when the connection is interrupted
			this.showMeshEditDialog = false;
			this.moveStepDialog.shown = false;
		},
		workplaceNumber(to: number) {
			this.currentWorkplace = to + 1;
		}
	},
});
</script>
