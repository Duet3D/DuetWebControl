<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-opacity</v-icon> {{ $t("panel.extrude.caption") }}
		</v-card-title>

		<v-card-text class="pb-0">
			<v-row class="pb-1" align="center" justify="center">
				<v-col v-if="currentTool && currentTool.extruders.length > 1" cols="auto">
					<p class="mb-1">
						{{ $t("panel.extrude.mixRatio") }}
					</p>
					<v-btn-toggle v-model="mix" mandatory multiple>
						<v-btn variant="text" value="mix" :disabled="uiFrozen" color="primary">
							{{ $t("panel.extrude.mix") }}
						</v-btn>
						<v-btn v-for="extruder in currentTool.extruders" :key="extruder" variant="text" :value="extruder"
							   :disabled="uiFrozen" color="primary">
							{{ `E${extruder}` }}
						</v-btn>
					</v-btn-toggle>
				</v-col>
				<v-col>
					<p class="mb-1">
						{{ $t("panel.extrude.amount", ["mm"]) }}
					</p>
					<v-btn-toggle v-model="amount" mandatory class="d-flex">
						<v-btn v-for="(savedAmount, index) in extruderAmounts" :key="index" :value="savedAmount"
							   :disabled="uiFrozen" @contextmenu.prevent="editAmount(index)" class="flex-grow-1">
							{{ savedAmount }}
						</v-btn>
					</v-btn-toggle>
				</v-col>
				<v-col>
					<p class="mb-1">
						{{ $t("panel.extrude.feedrate", ["mm/s"]) }}
					</p>
					<v-btn-toggle v-model="feedrate" mandatory class="d-flex">
						<v-btn v-for="(savedFeedrate, index) in extruderFeedrates" :key="index" :value="savedFeedrate"
							   :disabled="uiFrozen" @contextmenu.prevent="editFeedrate(index)" class="flex-grow-1">
							{{ savedFeedrate }}
						</v-btn>
					</v-btn-toggle>
				</v-col>
				<v-col cols="auto" class="flex-shrink-1">
					<v-btn block tile :disabled="uiFrozen || !canRetract" :elevation="1" :loading="busy"
						   @click="buttonClicked(false)">
						<v-icon>mdi-arrow-up-bold</v-icon> {{ $t("panel.extrude.retract") }}
					</v-btn>
					<v-btn block tile :disabled="uiFrozen || !canExtrude" :elevation="1" :loading="busy"
						   @click="buttonClicked(true)">
						<v-icon>mdi-arrow-down-bold</v-icon> {{ $t("panel.extrude.extrude") }}
					</v-btn>
				</v-col>
			</v-row>
		</v-card-text>

		<input-dialog :shown.sync="editAmountDialog.shown" :title="$t('dialog.editExtrusionAmount.title')"
					  :prompt="$t('dialog.editExtrusionAmount.prompt')" :preset="editAmountDialog.preset" is-numeric-value
					  @confirmed="setAmount" />
		<input-dialog :shown.sync="editFeedrateDialog.shown" :title="$t('dialog.editExtrusionFeedrate.title')"
					  :prompt="$t('dialog.editExtrusionFeedrate.prompt')" :preset="editFeedrateDialog.preset"
					  is-numeric-value @confirmed="setFeedrate" />
	</v-card>
</template>

<script lang="ts">
import { MachineStatus, Tool } from "@duet3d/objectmodel";
import { defineComponent } from "vue";

import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";
import { useSettingsStore } from "@/store/settings";

export default defineComponent({
	computed: {
		uiFrozen(): boolean { return useUiStore().uiFrozen; },
		currentTool(): Tool | null { return useMachineStore().currentTool; },
		canExtrude(): boolean {
			const machineStore = useMachineStore();
			return (machineStore.model.state.status !== MachineStatus.off &&
				machineStore.model.state.status !== MachineStatus.pausing &&
				machineStore.model.state.status !== MachineStatus.processing &&
				machineStore.model.state.status !== MachineStatus.resuming &&
				(this.currentTool !== null) && (this.currentTool.extruders.length > 0) &&
				!this.currentTool.heaters.some(heaterNumber => {
					if (heaterNumber >= 0 && heaterNumber < machineStore.model.heat.heaters.length && machineStore.model.heat.heaters[heaterNumber] !== null) {
						const heaterSensor = machineStore.model.heat.heaters[heaterNumber]!.sensor;
						if (heaterSensor >= 0 && heaterSensor < machineStore.model.sensors.analog.length) {
							const sensor = machineStore.model.sensors.analog[heaterSensor];
							return (sensor === null) || ((sensor.lastReading !== null) && (sensor.lastReading < machineStore.model.heat.coldExtrudeTemperature));
						}
					}
					return true;
				}, this));
		},
		canRetract(): boolean {
			const machineStore = useMachineStore();
			return (machineStore.model.state.status !== MachineStatus.off &&
				machineStore.model.state.status !== MachineStatus.pausing &&
				machineStore.model.state.status !== MachineStatus.processing &&
				machineStore.model.state.status !== MachineStatus.resuming &&
				(this.currentTool !== null) && this.currentTool.extruders.length > 0 &&
				!this.currentTool.heaters.some(heaterNumber => {
					if (heaterNumber >= 0 && heaterNumber < machineStore.model.heat.heaters.length && machineStore.model.heat.heaters[heaterNumber] !== null) {
						const heaterSensor = machineStore.model.heat.heaters[heaterNumber]!.sensor;
						if (heaterSensor >= 0 && heaterSensor < machineStore.model.sensors.analog.length) {
							const sensor = machineStore.model.sensors.analog[heaterSensor];
							return (sensor === null) || ((sensor.lastReading !== null) && (sensor.lastReading < machineStore.model.heat.coldRetractTemperature));
						}
					}
					return true;
				}, this));
		},
		mix: {
			get(): Array<number | "mix"> { return this.mixValue; },
			set(value: Array<number | "mix">) {
				if (value.length > 1) {
					if (this.mixValue.indexOf("mix") !== value.indexOf("mix")) {
						// Mix is being toggled
						if (value.indexOf("mix") !== -1) {
							this.mixValue = ["mix"];
						} else {
							this.mixValue = value.filter(item => item !== "mix");
						}
					} else {
						// Selecting another E drive
						this.mixValue = value.filter(item => item !== "mix");
					}
				} else {
					// One value - OK
					this.mixValue = value;
				}
			}
		},
		extruderAmounts() { return useSettingsStore().extruderAmounts; },
		extruderFeedrates() { return useSettingsStore().extruderFeedrates; }
	},
	data() {
		return {
			busy: false,
			mixValue: ["mix"] as Array<number | "mix">,
			amount: 10,
			feedrate: 5,
			editAmountDialog: {
				shown: false,
				index: 0,
				preset: 0
			},
			editFeedrateDialog: {
				shown: false,
				index: 0,
				preset: 0
			}
		}
	},
	methods: {
		async buttonClicked(extrude: boolean) {
			if (!this.currentTool || this.currentTool.extruders.length === 0) {
				return;
			}

			let amounts;
			if (this.mixValue[0] === "mix") {
				// Split total amount to extrude evenly
				amounts = [this.amount];
			} else {
				// Extrude given amount via each selected extruder drive
				amounts = this.currentTool.extruders.map(extruder => this.mix.includes(extruder) ? this.amount : 0);
			}

			this.busy = true;
			try {
				const amount = amounts.map(amount => extrude ? amount : -amount).join(":");
				await useMachineStore().sendCode(`M120\nM83\nG1 E${amount} F${this.feedrate * 60}\nM121`);
			} catch (e) {
				// handled before we get here
			}
			this.busy = false;
		},
		editAmount(index: number) {
			this.editAmountDialog.index = index;
			this.editAmountDialog.preset = this.extruderAmounts[index];
			this.editAmountDialog.shown = true;
		},
		setAmount(value: number) {
			useSettingsStore().extruderAmounts[this.editAmountDialog.index] = value;
			this.amount = value;
		},
		editFeedrate(index: number) {
			this.editFeedrateDialog.index = index;
			this.editFeedrateDialog.preset = this.extruderFeedrates[index];
			this.editFeedrateDialog.shown = true;
		},
		setFeedrate(value: number) {
			useSettingsStore().extruderFeedrates[this.editFeedrateDialog.index] = value;
			this.feedrate = value;
		}
	},
	mounted() {
		const settingsStore = useSettingsStore();
		this.amount = settingsStore.extruderAmounts[3];
		this.feedrate = settingsStore.extruderFeedrates[3];
	},
	watch: {
		currentTool(to: Tool | null) {
			if (!to || to.extruders.length <= 1) {
				// Switch back to mixing mode if the selection panel is hidden
				this.mix = ["mix"];
			}
		},
		extruderAmounts() {
			this.amount = this.extruderAmounts[3];
		},
		extruderFeedrates() {
			this.feedrate = this.extruderFeedrates[3];
		}
	}
});
</script>
