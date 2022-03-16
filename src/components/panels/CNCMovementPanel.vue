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
			{{ $t('panel.movement.caption') }}
			<v-spacer></v-spacer>
			<v-select v-model="currentWorkspace" :items="workCoordinates" class="wcs-selection" hint="Work Coordinate System" @change="updateWorkspaceCoordinate" persistent-hint></v-select>
		</v-card-title>
		<v-card-text v-show="visibleAxes.length">
			<v-row dense>
				<v-col cols="6" order="1" md="2" order-md="1">
					<code-btn block v-show="visibleAxes.length" color="primary" code="G28" :title="$t('button.home.titleAll')" class="ml-0 move-btn">
						{{ $t('button.home.captionAll') }}
					</code-btn>
				</v-col>
				<v-col cols="6" order="2" md="8" order-md="2">
					<v-menu offset-y left :disabled="uiFrozen">
						<template #activator="{ on }">
							<v-btn v-show="visibleAxes.length" color="primary" block class="mx-0 move-btn" :disabled="uiFrozen" v-on="on">
								{{ $t('panel.movement.compensation') }}
								<v-icon>mdi-menu-down</v-icon>
							</v-btn>
						</template>

						<v-card>
							<v-list>
								<div v-show="move.compensation">
									<v-list-item>
										<v-spacer></v-spacer>
										{{ $t('panel.movement.compensationInUse', [move.compensation.type]) }}
										<v-spacer></v-spacer>
									</v-list-item>

									<v-divider></v-divider>
								</div>

								<v-list-item @click="sendCode('G32')">
									<v-icon class="mr-1">mdi-format-vertical-align-center</v-icon>
									{{ $t(isDelta ? 'panel.movement.runDelta' : 'panel.movement.runBed') }}
								</v-list-item>
								<v-list-item :disabled="!move.compensation.type || move.compensation.type.indexOf('Point') === -1" @click="sendCode('M561')">
									<v-icon class="mr-1">mdi-border-none</v-icon>
									{{ $t('panel.movement.disableBedCompensation') }}
								</v-list-item>

								<v-divider></v-divider>

								<v-list-item @click="sendCode('G29')">
									<v-icon class="mr-1">mdi-grid</v-icon>
									{{ $t('panel.movement.runMesh') }}
								</v-list-item>
								<v-list-item @click="showMeshEditDialog = true">
									<v-icon class="mr-1">mdi-pencil</v-icon>
									{{ $t('panel.movement.editMesh') }}
								</v-list-item>
								<v-list-item @click="sendCode('G29 S1')">
									<v-icon class="mr-1">mdi-content-save</v-icon>
									{{ $t('panel.movement.loadMesh') }}
								</v-list-item>
								<v-list-item :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
									<v-icon class="mr-1">mdi-grid-off</v-icon>
									{{ $t('panel.movement.disableMeshCompensation') }}
								</v-list-item>
							</v-list>
						</v-card>
					</v-menu>
				</v-col>
				<v-col cols="12" order="3" md="2" order-md="3">
					<v-btn @click="setWorkspaceZero" block class="move-btn">Set Work XYZ</v-btn >
				</v-col>
			</v-row>

			<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" dense >
				<!-- Regular home buttons -->
				<v-col cols="2" order="1" sm="4"  md="1" order-md="1">
					<v-row dense>
						<v-col>
							<code-btn tile block :color="axis.homed ? 'primary' : 'warning'" :disabled="uiFrozen" :title="$t('button.home.title', [axis.letter])" :code="`G28 ${axis.letter}`" class="move-btn">
								{{ $t('button.home.caption', [axis.letter]) }}
							</code-btn>
						</v-col>
					</v-row>
				</v-col>

				<!-- Decreasing movements -->
				<v-col cols="6" order="3" md="5" order-md="2">
					<v-row dense>
						<v-col v-for="index in numMoveSteps" :key="-index" :class="getMoveCellClass(index - 1)">
							<code-btn :code="`M120\nG91\nG1 ${axis.letter}${-moveSteps(axis.letter)[index - 1]} F${moveFeedrate}\nG90\nM121`" no-wait @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)" block tile class="move-btn">
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
							<code-btn :code="`M120\nG91\nG1 ${axis.letter}${moveSteps(axis.letter)[numMoveSteps - index]} F${moveFeedrate}\nG90\nM121`" no-wait @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)" block tile class="move-btn">
								{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
								<v-icon>mdi-chevron-right</v-icon>
							</code-btn>
						</v-col>
					</v-row>
				</v-col>
				<!--  Set axis-->
				<v-col cols="2" order="2" offset="8"  sm="4" offset-sm="4" md="1" order-md="4" offset-md="0">
					<v-row dense>
						<v-col>
							<code-btn color="warning" tile block :code="`G10 L20 P${currentWorkspace} ${axis.letter}0`" class="move-btn">Set {{ axis.letter }}</code-btn>
						</v-col>
					</v-row>
				</v-col>
			</v-row>

			<v-row dense>
				<v-col>
					<v-btn color="warning" @click="gotoWorkspaceZero" tile block class="move-btn">{{$t('panel.movement.workzero')}}</v-btn>
				</v-col>
			</v-row>
		</v-card-text>

		<mesh-edit-dialog :shown.sync="showMeshEditDialog"></mesh-edit-dialog>
		<input-dialog :shown.sync="moveStepDialog.shown" :title="$t('dialog.changeMoveStep.title')" :prompt="$t('dialog.changeMoveStep.prompt')" :preset="moveStepDialog.preset" is-numeric-value @confirmed="moveStepDialogConfirmed"></input-dialog>

		<v-alert :value="unhomedAxes.length !== 0" type="warning" class="mb-0">
			{{ $tc('panel.movement.axesNotHomed', unhomedAxes.length) }}
			<strong>
				{{ unhomedAxes.map(axis => axis.letter).join(', ') }}
			</strong>
		</v-alert>

		<v-alert :value="visibleAxes.length === 0" type="info">
			{{ $t('panel.movement.noAxes') }}
		</v-alert>
	</v-card>
</template>


<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'
import { KinematicsName } from '../../store/machine/modelEnums.js'
import { combine } from '../../utils/path'

export default {
	computed: {
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapState('machine/model', {
			move: state => state.move,
			workspaceNumber: state => state.move.workplaceNumber,
			systemDir : state => state.directories.system
		}),
		...mapState('machine/settings', ['moveFeedrate']),
		...mapGetters('machine/settings', ['moveSteps', 'numMoveSteps']),
		isCompensationEnabled() {
			return this.move.compensation.type.toLowerCase() !== 'none';
		},
		visibleAxes() {
			return this.move.axes.filter(axis => axis.visible);
		},
		isDelta() {
			return this.move.kinematics.name === KinematicsName.delta || this.move.kinematics.name === KinematicsName.rotaryDelta;
		},
		unhomedAxes() {
			return this.move.axes.filter(axis => axis.visible && !axis.homed);
		},
		workCoordinates() {
			return [...Array(9).keys()].map(i => i + 1);
		},
	},
	data() {
		return {
			showMeshEditDialog: false,
			moveStepDialog: {
				shown: false,
				axis: 'X',
				index: 0,
				preset: 0,
			},
			currentWorkspace: 1,
		};
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		...mapMutations('machine/settings', ['setMoveStep']),
		getMoveCellClass(index) {
			let classes = '';
			if (index === 0 || index === 5) {
				classes += 'hidden-lg-and-down';
			}
			if (index > 1 && index < 4 && index % 2 === 1) {
				classes += 'hidden-md-and-down';
			}
			return classes;
		},
		showSign: value => (value > 0 ? `+${value}` : value),
		showMoveStepDialog(axis, index) {
			this.moveStepDialog.axis = axis;
			this.moveStepDialog.index = index;
			this.moveStepDialog.preset = this.moveSteps(this.moveStepDialog.axis)[this.moveStepDialog.index];
			this.moveStepDialog.shown = true;
		},
		moveStepDialogConfirmed(value) {
			this.setMoveStep({ axis: this.moveStepDialog.axis, index: this.moveStepDialog.index, value });
		},

		async setWorkspaceZero() {
			let code = `G10 L20 P${this.currentWorkspace}`;
			this.visibleAxes.forEach(axis => (code += ` ${axis.letter}0`));
			console.log(code);
			await this.sendCode(code);
			await this.sendCode(`G10 L20 P${this.currentWorkspace}`);
		},
		async gotoWorkspaceZero() {
			var gotoZeroPath = combine(this.systemDir, 'workzero.g');
			await this.sendCode({code : `M98 P"${gotoZeroPath}"`});
		},
		async updateWorkspaceCoordinate() {
			let code;
			if (this.currentWorkspace < 7) {
				code = `G${53 + this.currentWorkspace}`;
			} else {
				code = `G59.${this.currentWorkspace - 6}`;
			}
			if (code) {
				console.log(code);
				await this.sendCode(code);
				this.sendCode(`G10 L20 P${this.currentWorkspace}`);
			}
		},
	},
	mounted() {
		this.currentWorkspace = this.workspaceNumber + 1;
	},
	watch: {
		isConnected() {
			// Hide dialogs when the connection is interrupted
			this.showMeshEditDialog = false;
			this.moveStepDialog.shown = false;
		},
		workspaceNumber: function (to) {
			this.currentWorkspace = to + 1;
		},
	},
};
</script>
