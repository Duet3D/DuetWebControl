<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-fan</v-icon> {{ $t('panel.fans.caption') }}
			<v-spacer></v-spacer>
			<v-menu offset-y right auto>
				<template #activator="{ on }">
					<a v-show="!uiFrozen && fans.some(fan => fan && fan.thermostatic.heaters.length === 0)" v-on="on" href="javascript:void(0)" class="subtitle-2">
						{{ $t('panel.fans.changeVisibility') }}
					</a>
				</template>

				<v-list>
					<v-list-item v-show="currentTool && currentTool.fans.length > 0" @click="toggleFanVisibility(-1)">
						<v-icon class="mr-1">
							{{ (displayedFans.indexOf(-1) !== -1) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank' }}
						</v-icon>
						{{ $t('panel.fans.toolFan') }}
					</v-list-item>

					<template v-for="(fan, index) in fans" >
						<v-list-item v-if="fan && fan.thermostatic.heaters.length === 0" :key="index" @click="toggleFanVisibility(index)">
							<v-icon class="mr-1">
								{{ (displayedFans.indexOf(index) !== -1) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank' }}
							</v-icon>
							{{ fan.name ? fan.name :$t('panel.fans.fan', [index]) }}
						</v-list-item>
					</template>
				</v-list>
			</v-menu>
		</v-card-title>
		
		<v-card-text class="d-flex flex-column pb-0">
			<div v-for="fan in visibleFans" :key="fan" class="d-flex flex-column pt-2">
				{{ (fan === -1) ? $t('panel.fans.toolFan') : (fans[fan].name ? fans[fan].name : $t('panel.fans.fan', [fan])) }}
				<slider :value="getFanValue(fan)" @input="setFanValue(fan, $event)" :disabled="uiFrozen"></slider>
			</div>
		</v-card-text>

		<v-alert type="info" :value="!visibleFans.length" class="mb-0">
			{{ $t('panel.fans.noFans') }}
		</v-alert>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['fans']),
		...mapGetters('machine/model', ['currentTool']),
		...mapState('machine/settings', ['displayedFans']),
		visibleFans() {
			return this.displayedFans.filter(function(fan) {
				if (fan === -1) {
					return this.currentTool && this.currentTool.fans.length > 0;
				}
				return fan < this.fans.length && this.fans[fan] && this.fans[fan].thermostatic.heaters.length === 0;
			}, this);
		},
		toolFan() {
			if (this.currentTool && this.currentTool.fans.length) {
				return this.currentTool.fans[0];
			}
			return 0;
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		...mapMutations('machine/settings', ['toggleFanVisibility']),
		getFanValue(fan) {
			if (fan === -1) {
				fan = this.toolFan;
			}
			return (fan >= 0 && fan < this.fans.length && this.fans[fan]) ? Math.round(this.fans[fan].requestedValue * 100) : 0;
		},
		setFanValue(fan, value) {
			if (fan === -1) {
				this.sendCode(`M106 S${value / 100}`);
			} else {
				this.sendCode(`M106 P${fan} S${value / 100}`);
			}
		}
	}
}
</script>
