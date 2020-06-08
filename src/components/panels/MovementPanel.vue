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
			<code-btn v-show="visibleAxes.length" color="primary" small code="G28" :title="$t('button.home.titleAll')" class="ml-0 hidden-sm-and-down">
				{{ $t('button.home.captionAll') }}
			</code-btn>

			<v-spacer class="hidden-sm-and-down"></v-spacer>

			<v-icon small class="mr-1">mdi-swap-horizontal</v-icon> {{ $t('panel.movement.caption') }}

			<v-spacer></v-spacer>

			<v-menu offset-y left :disabled="uiFrozen">
				<template #activator="{ on }">
					<v-btn v-show="visibleAxes.length" color="primary" small class="mx-0" :disabled="uiFrozen" v-on="on">
						{{ $t('panel.movement.compensation') }} <v-icon>mdi-menu-down</v-icon>
					</v-btn>
				</template>

				<v-card>
					<v-list>
						<template v-show="move.compensation">
							<v-list-item>
								<v-spacer></v-spacer>
								{{ $t('panel.movement.compensationInUse', [move.compensation.type]) }}
								<v-spacer></v-spacer>
							</v-list-item>

							<v-divider></v-divider>
						</template>

						<v-list-item @click="sendCode('G32')">
							<v-icon class="mr-1">mdi-format-vertical-align-center</v-icon> {{ $t(isDelta ? 'panel.movement.runDelta' : 'panel.movement.runBed') }}
						</v-list-item>
						<v-list-item :disabled="!move.compensation.type || move.compensation.type.indexOf('Point') === -1" @click="sendCode('M561')">
							<v-icon class="mr-1">mdi-border-none</v-icon> {{ $t('panel.movement.disableBedCompensation') }} 
						</v-list-item>

						<v-divider></v-divider>

						<v-list-item @click="sendCode('G29')">
							<v-icon class="mr-1">mdi-grid</v-icon> {{ $t('panel.movement.runMesh') }}
						</v-list-item>
						<v-list-item @click="showMeshEditDialog = true">
							<v-icon class="mr-1">mdi-pencil</v-icon> {{ $t('panel.movement.editMesh') }}
						</v-list-item>
						<v-list-item @click="sendCode('G29 S1')">
							<v-icon class="mr-1">mdi-content-save</v-icon> {{ $t('panel.movement.loadMesh') }}
						</v-list-item>
						<v-list-item :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
							<v-icon class="mr-1">mdi-grid-off</v-icon> {{ $t('panel.movement.disableMeshCompensation') }}
						</v-list-item>
					</v-list>
				</v-card>
			</v-menu>
		</v-card-title>

		<v-card-text v-show="visibleAxes.length">
			<!-- Mobile home buttons -->
			<v-row class="hidden-md-and-up py-2" no-gutters>
				<v-col>
					<code-btn color="primary" code="G28" :title="$t('button.home.titleAll')" block tile>
						{{ $t('button.home.captionAll') }}
					</code-btn>
				</v-col>
				<template v-if="!isDelta">
					<v-col v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex">
						<code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="uiFrozen" :title="$t('button.home.title', [axis.letter])" :code="`G28 ${axis.letter}`" block tile>

							{{ $t('button.home.caption', [axis.letter]) }}
						</code-btn>
					</v-col>
				</template>
			</v-row>

			<v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" dense>
				<!-- Regular home buttons -->
				<v-col v-if="!isDelta" cols="auto" class="flex-shrink-1 hidden-sm-and-down">
					<code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="uiFrozen" :title="$t('button.home.title', [axis.letter])" :code="`G28 ${axis.letter}`" class="ml-0">

						{{ $t('button.home.caption', [axis.letter]) }}
					</code-btn>
				</v-col>

				<!-- Decreasing movements -->
				<v-col>
					<v-row no-gutters>
						<v-col v-for="index in numMoveSteps" :key="-index"  :class="getMoveCellClass(index - 1)">
							<code-btn :code="`M120\nG91\nG1 ${axis.letter}${-moveSteps(axis.letter)[index - 1]} F${moveFeedrate}\nG90\nM121`" no-wait @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)" block tile class="move-btn">
								<v-icon>mdi-chevron-left</v-icon> {{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
							</code-btn>
						</v-col>
					</v-row>
				</v-col>

				<!-- Increasing movements -->
				<v-col>
					<v-row no-gutters>
						<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(numMoveSteps - index)">
							<code-btn :code="`M120\nG91\nG1 ${axis.letter}${moveSteps(axis.letter)[numMoveSteps - index]} F${moveFeedrate}\nG90\nM121`" no-wait @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)" block tile class="move-btn">
								{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }} <v-icon>mdi-chevron-right</v-icon>
							</code-btn>
						</v-col>
					</v-row>
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

export default {
	computed: {
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapState('machine/model', ['move']),
		...mapState('machine/settings', ['moveFeedrate']),
		...mapGetters('machine/settings', ['moveSteps', 'numMoveSteps']),
		isCompensationEnabled() { return this.move.compensation.type.toLowerCase() !== 'none' },
		visibleAxes() { return this.move.axes.filter(axis => axis.visible); },
		isDelta() {
			return ((this.move.kinematics.name === KinematicsName.delta) ||
					(this.move.kinematics.name === KinematicsName.rotaryDelta));
		},
		unhomedAxes() { return this.move.axes.filter(axis => axis.visible && !axis.homed); }
	},
	data() {
		return {
			showMeshEditDialog: false,
			moveStepDialog: {
				shown: false,
				axis: 'X',
				index: 0,
				preset: 0
			}
		}
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
		showSign: (value) => (value > 0) ? `+${value}` : value,
		showMoveStepDialog(axis, index) {
			this.moveStepDialog.axis = axis;
			this.moveStepDialog.index = index;
			this.moveStepDialog.preset = this.moveSteps(this.moveStepDialog.axis)[this.moveStepDialog.index];
			this.moveStepDialog.shown = true;
		},
		moveStepDialogConfirmed(value) {
			this.setMoveStep({ axis: this.moveStepDialog.axis, index: this.moveStepDialog.index, value });
		}
	},
	watch: {
		isConnected() {
			// Hide dialogs when the connection is interrupted
			this.showMeshEditDialog = false;
			this.moveStepDialog.shown = false;
		}
	}
}
</script>
