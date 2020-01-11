<template>
	<v-layout row justify-center>
		<v-dialog v-model="shown" max-width="600px">
			<v-card>
				<v-form ref="form" @submit.prevent="apply">
					<v-card-title>
						<span class="headline">{{ $t('dialog.meshEdit.title') }}</span>
					</v-card-title>

					<v-card-text>
						<v-row v-if="geometry === 'delta'">
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.radius')" v-model.number="radius" required hide-details></v-text-field>
							</v-col>
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.spacing')" v-model.number="spacing" required hide-details></v-text-field>
							</v-col>
						</v-row>
						<v-row v-else>
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.startCoordinate', ['X'])" v-model.number="minX" required hide-details></v-text-field>
							</v-col>
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.endCoordinate', ['X'])" v-model.number="maxX" required hide-details></v-text-field>
							</v-col>
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.startCoordinate', ['Y'])" v-model.number="minY" required hide-details></v-text-field>
							</v-col>
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.endCoordinate', ['Y'])" v-model.number="maxY" required hide-details></v-text-field>
							</v-col>
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.spacingDirection', ['X'])" v-model.number="spacingX" required hide-details></v-text-field>
							</v-col>
							<v-col cols="12" sm="6">
								<v-text-field type="number" :label="$t('dialog.meshEdit.spacingDirection', ['Y'])" v-model.number="spacingY" required hide-details></v-text-field>
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
	</v-layout>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'

export default {
	computed: mapState('machine/model', {
		geometry: state => state.move.geometry,
		probeGrid: state => state.move.probeGrid
	}),
	data() {
		return {
			radius: 150,
			spacing: 15,

			minX: 0,
			maxX: 200,
			minY: 0,
			maxY: 200,
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

				if (this.geometry === 'delta') {
					this.sendCode(`M557 R${this.radius} S${this.spacing}`);
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
				// FIXME: This can be enabled once probeGrid is populated
				/*
				this.radius = this.probeGrid.radius;
				this.spacing = this.probeGrid.spacing;
				this.minX = this.probeGrid.xMin;
				this.maxX = this.probeGrid.xMax;
				this.spacingX = this.probeGrid.xSpacing;
				this.minY = this.probeGrid.yMin;
				this.maxY = this.probeGrid.yMax;
				this.spacingY = this.probeGrid.ySpacing;
				*/
			}
		}
	}
}
</script>
