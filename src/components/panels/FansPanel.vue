<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-fan</v-icon>
			{{ $t("panel.fans.caption") }}

			<v-spacer />

			<v-menu offset-y right auto>
				<template #activator="{ on }">
					<a v-show="!uiFrozen && fans.some(fan => (fan !== null) && (fan.thermostatic.sensors.length === 0))"
					   v-on="on" href="javascript:void(0)" class="subtitle-2">
						{{ $t("panel.fans.changeVisibility") }}
					</a>
				</template>

				<v-list>
					<v-list-item @click="toggleFanVisibility(-1)">
						<v-icon class="mr-1">
							{{ displayedFans.includes(-1) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}
						</v-icon>
						{{ $t("panel.fans.toolFan") }}
					</v-list-item>

					<template v-for="(fan, index) in fans">
						<v-list-item v-if="(fan !== null) && (fan.thermostatic.sensors.length === 0)" :key="index"
									 @click="toggleFanVisibility(index)">
							<v-icon class="mr-1">
								{{ displayedFans.includes(index) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}
							</v-icon>
							{{ fan.name ? fan.name : $t("panel.fans.fan", [index]) }}
						</v-list-item>
					</template>
				</v-list>
			</v-menu>
		</v-card-title>

		<v-card-text v-if="hasVisibleFans" class="d-flex flex-column pb-0">
			<div v-if="displayedFans.includes(-1) && (toolFanValue >= 0)"
				 class="d-flex flex-column pt-2">
				{{ $t("panel.fans.toolFan") }}
				<percentage-input :value="toolFanValue" @input="setFanValue(-1, $event)" :disabled="uiFrozen" />
			</div>

			<template v-for="(fan, index) in fans">
				<div v-if="displayedFans.includes(index) && (fan !== null) && (fan.thermostatic.sensors.length === 0)"
					 :key="index" class="d-flex flex-column pt-2">
					{{ (fan.name ? fan.name : $t("panel.fans.fan", [index])) }}
					<percentage-input :value="fan.requestedValue * 100" @input="setFanValue(index, $event)"
									  :disabled="uiFrozen" />
				</div>
			</template>
		</v-card-text>

		<v-alert type="info" :value="!hasVisibleFans" class="mb-0">
			{{ $t("panel.fans.noFans") }}
		</v-alert>
	</v-card>
</template>

<script lang="ts">
import { Fan, Tool } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		currentTool(): Tool | null { return store.getters["machine/model/currentTool"]; },
		displayedFans(): Array<number> { return store.state.machine.settings.displayedFans; },
		fans(): Array<Fan | null> { return store.state.machine.model.fans; },
		hasVisibleFans(): boolean {
			if (this.fans.some((fan, index) => this.displayedFans.includes(index) && (fan !== null) && (fan.thermostatic.sensors.length === 0))) {
				return true;
			}
			return (this.displayedFans.includes(-1) && (this.toolFan >= 0) && (this.toolFan < this.fans.length) &&
				(this.fans[this.toolFan] !== null) && (this.fans[this.toolFan]!.thermostatic.sensors.length === 0));
		},
		toolFan(): number {
			if ((this.currentTool !== null) && (this.currentTool.fans.length > 0)) {
				return this.currentTool.fans[0];
			}
			return -1;
		},
		toolFanValue(): number {
			if ((this.toolFan >= 0) && (this.toolFan < this.fans.length) && (this.fans[this.toolFan] !== null)) {
				return this.fans[this.toolFan]!.requestedValue;
			}
			return 0;
		}
	},
	methods: {
		isFanVisible(fanIndex: number) {
			if (fanIndex <= -1) {
				return (this.currentTool !== null) && (this.currentTool.fans.length > 0);
			}
			return (fanIndex < this.fans.length) && (this.fans[fanIndex] !== null) && (this.fans[fanIndex]!.thermostatic.sensors.length === 0);
		},
		getFanValue(fanIndex: number) {
			if (fanIndex <= -1) {
				fanIndex = this.toolFan;
			}
			return (fanIndex >= 0) && (fanIndex < this.fans.length) && (this.fans[fanIndex] !== null) ? Math.round(this.fans[fanIndex]!.requestedValue * 100) : 0;
		},
		async setFanValue(fanIndex: number, value: number) {
			if (fanIndex === -1) {
				await store.dispatch("machine/sendCode", `M106 S${value / 100}`);
			} else {
				await store.dispatch("machine/sendCode", `M106 P${fanIndex} S${value / 100}`);
			}
		},
		toggleFanVisibility(fanIndex: number) {
			store.commit("machine/settings/toggleFanVisibility", fanIndex);
		}
	}
});
</script>
