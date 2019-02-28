<template>
	<v-layout row justify-center>
		<v-dialog v-model="shown" max-width="600px">
			<v-card>
				<v-form ref="form" @submit.prevent="apply">
					<v-card-title>
						<span class="headline">{{ $t('dialog.meshEdit.title') }}</span>
					</v-card-title>
					<v-card-text>
						<v-container grid-list-md>
							<v-layout wrap v-if="geometry === 'delta'">
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.radius')" v-model.number="radius" required></v-text-field>
								</v-flex>
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.spacing')" v-model.number="spacing" required></v-text-field>
								</v-flex>
							</v-layout>
							<v-layout wrap v-else>
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.startCoordinate', ['X'])" v-model.number="minX" required></v-text-field>
								</v-flex>
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.endCoordinate', ['X'])" v-model.number="maxX" required></v-text-field>
								</v-flex>
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.startCoordinate', ['Y'])" v-model.number="minY" required></v-text-field>
								</v-flex>
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.endCoordinate', ['Y'])" v-model.number="maxY" required></v-text-field>
								</v-flex>
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.spacingDirection', ['X'])" v-model.number="spacingX" required></v-text-field>
								</v-flex>
								<v-flex xs12 sm6 md6>
									<v-text-field type="number" :label="$t('dialog.meshEdit.spacingDirection', ['Y'])" v-model.number="spacingY" required></v-text-field>
								</v-flex>
							</v-layout>
						</v-container>
					</v-card-text>
					<v-card-actions>
						<v-spacer></v-spacer>
						<v-btn color="blue darken-1" flat @click="hide">{{ $t('generic.cancel') }}</v-btn>
						<v-btn color="blue darken-1" flat type="submit">{{ $t('generic.ok') }}</v-btn>
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
		geometry: state => state.move.geometry
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
	}
}
</script>
