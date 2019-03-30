<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">ac_unit</v-icon> {{ $t('panel.fans.caption') }}
			<v-spacer></v-spacer>
			<v-menu offset-y right auto>
				<template slot="activator">
					<a v-show="!uiFrozen && fans.some(fan => !fan.thermostatic.control)" href="#" @click.prevent="">
						{{ $t('panel.fans.changeVisibility') }}
					</a>
				</template>

				<v-list>
					<v-list-tile @click="toggleFanVisibility(-1)">
						<v-icon class="mr-1">
							{{ (displayedFans.indexOf(-1) !== -1) ? 'check_box' : 'check_box_outline_blank' }}
						</v-icon>
						{{ $t('panel.fans.toolFan') }}
					</v-list-tile>

					<template v-for="(fan, index) in fans">
						<v-list-tile v-if="!fan.thermostatic.control" :key="index" @click="toggleFanVisibility(index)">
							<v-icon class="mr-1">
								{{ (displayedFans.indexOf(index) !== -1) ? 'check_box' : 'check_box_outline_blank' }}
							</v-icon>
							{{ fan.name ? fan.name :$t('panel.fans.fan', [index]) }}
						</v-list-tile>
					</template>
				</v-list>
			</v-menu>
		</v-card-title>
		
		<v-layout v-if="visibleFans.length" column class="px-3">
			<v-flex v-for="fan in visibleFans" :key="fan" class="pt-2">
				<span>
					{{ (fan === -1) ? $t('panel.fans.toolFan') : (fans[fan].name ? fans[fan].name : $t('panel.fans.fan', [fan])) }}
				</span>
				<slider :value="getFanValue(fan)" @input="setFanValue(fan, $event)" :disabled="uiFrozen"></slider>
			</v-flex>
		</v-layout>

		<v-alert type="info" :value="!visibleFans.length">
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
			return this.displayedFans.filter(fan => (fan === -1) || (fan < this.fans.length && !this.fans[fan].thermostatic.control), this);
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
			return this.fans.length ? Math.round(this.fans[(fan === -1) ? this.toolFan : fan].value * 100) : 0;
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
