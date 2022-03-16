<template>
	<v-card>
		<v-card-title>
			<v-icon>mdi-45hammer-screwdriver</v-icon>{{$t('panel.spindle.title')}}
		</v-card-title>
		<v-card-text>
			<v-simple-table>
				<thead>
					<th>{{$t('panel.spindle.spindle')}}</th>
					<th>{{$t('panel.spindle.active')}}</th>
					<th v-show="hasReverseableSpindle">{{$t('panel.spindle.direction')}}</th>
					<th>{{$t('panel.spindle.currentRPM')}}</th>
					<th>{{$t('panel.spindle.setRPM')}}</th>
				</thead>
				<tbody>
					<tr :class="{'spindle-active' : spindle.current > 0 && spindle.active > 0 }" :key="index" v-for="(spindle, index) in spindles" v-show="spindleIsConfigured(index)">
						<td>{{getName(index)}}</td>
						<td>
							<v-btn @click="spindleOff(index)" block v-if="spindleActive(index)">On</v-btn>
							<v-btn @click="spindleOn(index)" block v-else>Off</v-btn>
						</td>
						<td v-show="hasReverseableSpindle">
							<v-btn-toggle mandatory v-model="spindleDir[index]" v-show="hasReverseableSpindle && spindle.canReverse">
								<v-btn>{{$t('panel.spindle.forward')}}</v-btn>
								<v-btn>{{$t('panel.spindle.reverse')}}</v-btn>
							</v-btn-toggle>
						</td>
						<td>{{spindle.current}}</td>
						<td>
							<v-combobox :items="rpmInRange(spindle)" :value="spindle.active" @input="setActiveRPM($event, index)"></v-combobox>
						</td>
					</tr>
				</tbody>
			</v-simple-table>
		</v-card-text>
	</v-card>
</template>

<style scoped lang="scss">
tbody {
	tr:hover {
		background-color: transparent !important;
	}
}

td {
	text-align: center;
	vertical-align: middle;
}

.spindle-active {
	background-color: #00bb00;
}

.spindle-on {
	animation: spindle-on-pulse 5s infinite;
}

.show {
	visibility: visible;
}

.hide {
	visibility: hidden;
}

@keyframes spindle-on-pulse {
	0% {
		background-color: #00aa00;
	}
	50% {
		background-color: #00ff00;
	}
	100% {
		background-color: #00aa00;
	}
}
</style>

<script>
import {mapActions, mapState} from 'vuex';
import {SpindleState} from '../../store/machine/modelEnums.js';
import Vue from 'vue';

export default {
	data: function () {
		return {
			spindleDir: [0, 0, 0, 0],
		};
	},
	mounted() {
		this.updateSpindleDirection();
	},
	computed: {
		...mapState('machine/model', {
			spindles: (state) => state.spindles,
		}),
		...mapState('machine', {
			spindleRPMs: (state) => state.settings.spindleRPM,
		}),
		hasReverseableSpindle() {
			return this.spindles.some((spindle) => spindle.canReverse);
		},
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		getName(index) {
			return `${this.$t('panel.spindle.spindle')} ${index}`;
		},
		spindleIsConfigured(index) {
			return this.spindles[index].state !== SpindleState.unconfigured;
		},
		spindleActive(index) {
			return this.spindles[index].state == SpindleState.forward || this.spindles[index].state == SpindleState.reverse;
		},
		async setActiveRPM(value, index) {
			let code = `${this.spindleDir[index] ? 'M4' : 'M3'} P${index} S${value}`;
			await this.sendCode(code);
		},
		async spindleOn(index) {
			let code = `${this.spindleDir[index] ? 'M4' : 'M3'} P${index} S${this.spindles[index].active}`;
			await this.sendCode(code);
		},
		async spindleOff(index) {
			this.sendCode(`M5 P${index}`);
		},
		rpmInRange(spindle) {
			let rpms = this.spindleRPMs.filter((rpm) => rpm >= spindle.min && rpm <= spindle.max).reverse();
			if (!rpms.includes(0)) {
				rpms.unshift(0);
			}
			return rpms;
		},
		updateSpindleDirection() {
			for (let spindleIdx = 0; spindleIdx < 4; spindleIdx++) {
				if (this.spindles[spindleIdx].state) {
					switch (this.spindles[spindleIdx].state) {
						case SpindleState.forward:
							Vue.set(this.spindleDir, spindleIdx, 0);
							break;
						case SpindleState.reverse:
							Vue.set(this.spindleDir, spindleIdx, 1);
							break;
					}
				}
			}
		},
	},
	watch: {
		spindles: {
			deep: true,
			handler() {
				this.updateSpindleDirection();
			},
		},
	},
};
</script>