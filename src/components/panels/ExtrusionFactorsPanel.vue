<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-texture</v-icon> {{ $t('panel.extrusionFactors.caption') }}
			<v-spacer></v-spacer>
			<v-menu offset-y right auto>
				<template #activator="{ on }">
					<a v-show="!uiFrozen && move.extruders.length" v-on="on" href="javascript:void(0)" class="subtitle-2">
						{{ $t('panel.extrusionFactors.changeVisibility') }}
					</a>
				</template>

				<v-list>
					<v-list-item v-for="(extruder, index) in move.extruders" :key="index" @click.stop="toggleExtruderVisibility(index)">
						<v-icon class="mr-1">
							{{ (displayedExtruders.indexOf(index) !== -1) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank' }}
						</v-icon>
						{{ $t('panel.extrusionFactors.extruder', [index]) }}
					</v-list-item>
				</v-list>
			</v-menu>
		</v-card-title>
		
		<v-card-text v-if="visibleExtruders.length" class="d-flex flex-column pb-0">
			<div v-for="(extruder, index) in visibleExtruders" :key="index" class="d-flex flex-column pt-2">
				<div class="d-inline-flex">
					{{ $t('panel.extrusionFactors.extruder', [index]) }}
					<v-spacer></v-spacer>
					<a v-show="extruder.factor !== 1.0" href="javascript:void(0)" :disabled="uiFrozen" @click.prevent="setExtrusionFactor(index, 100)" class="subtitle-2">
						<v-icon small class="mr-1">mdi-backup-restore</v-icon> {{ $t('generic.reset') }}
					</a>
				</div>

				<percentage-input :value="getExtrusionFactor(extruder)" @input="setExtrusionFactor(index, $event)" :max="getMax(extruder)" :step="1" :disabled="uiFrozen"></percentage-input>
			</div>
		</v-card-text>

		<v-alert type="info" :value="!visibleExtruders.length" class="mb-0">
			{{ $t('panel.extrusionFactors.noExtruders') }}
		</v-alert>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['move']),
		...mapState('machine/settings', ['displayedExtruders']),
		visibleExtruders() {
			return this.move.extruders.filter((extruder, index) => this.displayedExtruders.indexOf(index) !== -1, this);
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		...mapMutations('machine/settings', ['toggleExtruderVisibility']),
		getMax(extruder) { return Math.max(150, extruder.factor * 100 + 50); },
		getExtrusionFactor(extruder) {
			return Math.round(extruder.factor * 100);
		},
		setExtrusionFactor(extruderIndex, value) {
			this.sendCode(`M221 D${extruderIndex} S${value}`);
		}
	}
}
</script>
