<template>
	<v-dialog v-model="shown" max-width="600px" persistent no-click-animation>
		<v-card>
			<v-form ref="form" @submit.prevent="apply">
				<v-card-title>
					<span class="headline">{{ $t('dialog.meshEdit.title') }}</span>
				</v-card-title>

				<v-card-text>
					<v-row v-if="isDelta">
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.radius')" v-model.number="radius" required hide-details></v-text-field>
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.spacing')" v-model.number="spacingX" required hide-details></v-text-field>
						</v-col>
					</v-row>
					<v-row v-else>
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.startCoordinate', [xAxis])" v-model.number="minX" required hide-details></v-text-field>
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.endCoordinate', [xAxis])" v-model.number="maxX" required hide-details></v-text-field>
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.startCoordinate', [yAxis])" v-model.number="minY" required hide-details></v-text-field>
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.endCoordinate', [yAxis])" v-model.number="maxY" required hide-details></v-text-field>
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.spacingDirection', [xAxis])" v-model.number="spacingX" required hide-details></v-text-field>
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field type="number" :label="$t('dialog.meshEdit.spacingDirection', [yAxis])" v-model.number="spacingY" required hide-details></v-text-field>
						</v-col>
					</v-row>
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="blue darken-1" text @click="hide">{{ $t('generic.cancel') }}</v-btn>
					<v-btn color="blue darken-1" text type="submit">{{ $t('generic.ok') }}</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'

import { KinematicsName } from '../../store/machine/modelEnums.js'

export default {
	computed: {
		...mapState('machine/model', {
			kinematicsName: state => state.move.kinematics.name,
			probeGrid: state => state.move.compensation.probeGrid
		}),
		isDelta() {
			return (this.kinematicsName === KinematicsName.delta) || (this.kinematicsName === KinematicsName.rotaryDelta);
		}
	},
	data() {
		return {
			xAxis: 'X',
			yAxis: 'Y',
			maxX: 200,
			maxY: 200,
			minX: 0,
			minY: 0,
			radius: 150,
			spacingX: 20,
			spacingY: 20
		}
	},
	props: {
		shown: {
			type: Boolean,
			required: true
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		apply() {
			if (this.$refs.form.validate()) {
				this.hide();

				if (this.isDelta) {
					this.sendCode(`M557 R${this.radius} S${this.spacingX}`);
				} else {
					this.sendCode(`M557 X${this.minX}:${this.maxX} Y${this.minY}:${this.maxY} S${this.spacingX}:${this.spacingY}`);
				}
			}
		},
		hide() {
			this.$emit('update:shown', false);
		}
	},
	watch: {
		shown(to) {
			if (to) {
				this.xAxis = (this.probeGrid.axes.length > 0) ? this.probeGrid.axes[0] : 'X';
				this.yAxis = (this.probeGrid.axes.length > 1) ? this.probeGrid.axes[1] : 'Y';
				this.maxX = (this.probeGrid.maxs.length > 0) ? this.probeGrid.maxs[0] : 0;
				this.maxY = (this.probeGrid.maxs.length > 1) ? this.probeGrid.maxs[1] : 0;
				this.minX = (this.probeGrid.mins.length > 0) ? this.probeGrid.mins[0] : 0;
				this.minY = (this.probeGrid.mins.length > 1) ? this.probeGrid.mins[1] : 0;
				this.radius = this.probeGrid.radius;
				this.spacingX = (this.probeGrid.spacings.length > 0) ? this.probeGrid.spacings[0] : 0;
				this.spacingY = (this.probeGrid.spacings.length > 1) ? this.probeGrid.spacings[1] : 0;
			}
		}
	}
}
</script>
