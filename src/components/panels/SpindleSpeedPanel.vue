<template>
    <v-card>
        <v-card-title><v-icon>mdi-45hammer-screwdriver</v-icon> Spindles</v-card-title>
        <v-card-text>
            <v-simple-table>
                <thead>
                    <th>Spindle Name</th>
                    <th>Active</th>
                    <th>Current RPM</th>
					<th>Set RPM</th>
                </thead>
                <tbody>
                    <tr v-for="(spindle, index) in spindles" :key="index" :class="{'spindle-active' : spindle.current > 0 }">
                        <td>{{getName(spindle)}}</td>
                        <td>
								<v-btn v-if="spindle.current <= 0"  :value="1"  block @click="spindleOn(spindle, index)">On</v-btn>
								<v-btn v-else :value="0" block @click="spindleOff(index)">Off</v-btn>
						</td>
                        <td>{{spindle.current}}</td>
						<td>
							<v-combobox :items="rpmInRange(spindle)" :value="spindle.active" @input="setActiveRPM($event, index)">
							</v-combobox>
							</td>
                    </tr>
                </tbody>
            </v-simple-table>
        </v-card-text>
    </v-card>
</template>

<style scoped>
td {
	text-align: center;
	vertical-align: middle;
}

.spindle-active { 
	background-color : #00BB00;
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
		background-color: #00AA00;
	}
	50% {
		background-color: #00FF00;
	}
	100% {
		background-color: #00AA00;
	}
}
</style>

<script>
import { mapActions, mapState } from 'vuex';
//import store from '../../store'
export default {
	computed: {
		...mapState('machine/model', {
			spindles: state => state.spindles.filter(spindle => spindle.tool >= 0),
			currentTool: state => state.state.currentTool,
		}),
		...mapState('machine',{
			spindleRPMs: state => state.settings.spindleRPM
		}),
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		getName(spindle) {
			return `Spindle ${spindle.tool}`;
		},
		spindleState(spindle) {
			return spindle.active;
		},
		async setActiveRPM(value, index){
			let code = `M3 P${index} S${value}`;
			await this.sendCode(code);
		},
		async spindleOn(spindle, index) {
			let code = `M3 P${index} S${spindle.active}`;
			await this.sendCode(code);
		},
		async spindleOff( index) {
			this.sendCode(`M5 P${index}`);
		},
			rpmInRange(spindle){
				let rpms =  this.spindleRPMs.filter(rpm => rpm >= spindle.min && rpm <= spindle.max).reverse();
				if(!rpms.includes(0)){
					rpms.unshift(0);
				}
			return rpms;
		}
	},
};
</script>

