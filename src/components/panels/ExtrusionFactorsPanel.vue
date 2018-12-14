<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">texture</v-icon> Extrusion Factors
			<v-spacer></v-spacer>
			<v-menu offset-y right auto>
				<template slot="activator">
					<a v-show="!frozen && move.extruders.length" href="#" @click.prevent="">
						Change Visibility
					</a>
				</template>

				<v-list>
					<v-list-tile v-for="(extruder, index) in move.extruders" :key="index" @click="toggleExtruderVisibility({ machine: selectedMachine, extruder: index })">
						<v-icon class="mr-1">
							{{ (machineUI.displayedExtruders.indexOf(index) !== -1) ? 'check_box' : 'check_box_outline_blank' }}
						</v-icon>
						{{ `Extruder ${index}` }}
					</v-list-tile>
				</v-list>
			</v-menu>
		</v-card-title>
		
		<v-card-text class="py-0" v-show="!!visibleExtruders.length">
			<v-layout column>
				<v-flex v-for="extruder in visibleExtruders" :key="extruder">
					<v-flex>
						<v-layout row>
							<v-flex tag="span">
								{{ `Extruder ${extruder}` }}
							</v-flex>
							<v-spacer></v-spacer>
							<v-flex shrink>
								<a href="#" v-show="move.extruders[extruder].factor !== 1.0" flat small color="primary" @click.prevent="setExtrusionFactor(extruder, 100)">
									<v-icon small class="mr-1">settings_backup_restore</v-icon> {{ $t('generic.reset') }}
								</a>
							</v-flex>
						</v-layout>
					</v-flex>
					<v-flex>
						<slider :value="getExtrusionFactor(extruder)" @input="setExtrusionFactor(extruder, $event)" :max="getMax(extruder)" :disabled="frozen" class="pt-4"></slider>
					</v-flex>
				</v-flex>
			</v-layout>
		</v-card-text>

		<v-alert type="info" :value="!visibleExtruders.length">
			No Extruders Configured
		</v-alert>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine', ['move']),
		...mapGetters('ui', ['frozen', 'machineUI']),
		visibleExtruders() {
			return this.machineUI.displayedExtruders.filter(drive => drive < this.move.extruders.length, this);
		}
	},
	methods: {
		...mapActions(['sendCode']),
		...mapMutations('ui', ['toggleExtruderVisibility']),
		getMax(extruder) { return Math.max(150, this.move.extruders[extruder].factor * 100 + 50); },
		getExtrusionFactor(extruder) {
			return Math.round(this.move.extruders[extruder].factor * 100);
		},
		setExtrusionFactor(extruder, value) {
			this.sendCode(`M221 D${extruder} S${value}`);
		}
	}
}
</script>
