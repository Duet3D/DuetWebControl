<template>
	<v-row>
		<template v-if="!(items instanceof Array)">
			<v-col cols="6">
				<h3 class="text-center mt-3">
					{{ $t("generic.active") }}
				</h3>
			</v-col>
			<v-col cols="6">
				<h3 class="text-center mt-3">
					{{ $t("generic.standby") }}
				</h3>
			</v-col>
			<v-col cols="6">
				<v-chip close v-for="(temp, index) in items.active" :key="temp" @click:close="removeActive(index)"
						@keyup.delete="removeActive(index)">
					{{ temp }} {{ unit }}
				</v-chip>
			</v-col>
			<v-col cols="6">
				<v-chip close v-for="(temp, index) in items.standby" :key="temp" @click:close="removeStandby(index)"
						@keyup.delete="removeStandby(index)">
					{{ temp }} {{ unit }}
				</v-chip>
			</v-col>
			<v-col cols="6">
				<v-row align="baseline">
					<v-col>
						<v-text-field v-model.number="activeValue" type="number" min="-273" max="1999"
									  :label="$t('input.addTemperature')" @keyup.enter="addActive" hide-details />
					</v-col>
					<v-col cols="auto">
						<v-btn color="primary" :disabled="!canAddActive" @click="addActive">
							<v-icon class="mr-1">mdi-plus</v-icon> {{ $t("button.add.caption") }}
						</v-btn>
					</v-col>
				</v-row>
			</v-col>
			<v-col cols="6">
				<v-row align="baseline">
					<v-col>
						<v-text-field v-model.number="standbyValue" type="number" min="-273" max="1999"
									  :label="$t('input.addTemperature')" @keyup.enter="canAddStandby && addStandby"
									  hide-details />
					</v-col>
					<v-col cols="auto">
						<v-btn color="primary" :disabled="!canAddStandby" @click="addStandby">
							<v-icon class="mr-1">mdi-plus</v-icon> {{ $t("button.add.caption") }}
						</v-btn>
					</v-col>
				</v-row>
			</v-col>
		</template>
		<template v-else>
			<v-col cols="12" class="mt-3">
				<v-chip close v-for="(temp, index) in items" :key="temp" @click:close="remove(index)"
						@keyup.delete="remove(index)">
					{{ temp }} {{ unit }}
				</v-chip>
			</v-col>
			<v-col cols="12">
				<v-row align="baseline">
					<v-col>
						<v-text-field v-if="temperature" v-model.number="value" type="number" min="-273" max="1999"
									  :label="$t('input.addTemperature')" @keyup.enter="canAdd && add" hide-details />
						<v-text-field v-else v-model.number="value" type="number" min="0" :label="$t('input.addRPM')"
									  @keyup.enter="canAdd && add" hide-details />
					</v-col>
					<v-col cols="auto">
						<v-btn color="primary" :disabled="!canAdd" @click="add">
							<v-icon class="mr-1">mdi-plus</v-icon> {{ $t("button.add.caption") }}
						</v-btn>
					</v-col>
				</v-row>
			</v-col>
		</template>
	</v-row>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

import { useSettingsStore } from "@/store/settings";

export default defineComponent({
	props: {
		itemKey: String as PropType<"tool" | "bed" | "chamber" | "spindleRPM">,
		temperature: Boolean
	},
	computed: {
		items(): Array<number> | { active: Array<number>, standby: Array<number> } {
			const settingsStore = useSettingsStore();
			return (this.itemKey === "spindleRPM") ? settingsStore.spindleRPM : settingsStore.temperatures[this.itemKey!];
		},
		unit(): string { return this.temperature ? "°C" : "RPM"; },

		canAddActive(): boolean { return isFinite(this.activeValue) && !(this.items instanceof Array) && !this.items.active.includes(this.activeValue); },
		canAddStandby(): boolean { return isFinite(this.standbyValue) && !(this.items instanceof Array) && !this.items.standby.includes(this.standbyValue); },
		canAdd(): boolean { return isFinite(this.value) && (this.items instanceof Array) && !this.items.includes(this.value); }
	},
	data() {
		return {
			activeValue: 0,
			standbyValue: 0,
			value: 0
		}
	},
	methods: {
		addActive() {
			if (this.itemKey === "chamber" || this.itemKey === "spindleRPM" || this.items instanceof Array) {
				return;
			}

			if (this.canAddActive) {
				const settingsStore = useSettingsStore();
				settingsStore.temperatures[this.itemKey!].active.push(this.activeValue);
				settingsStore.temperatures[this.itemKey!].active.sort((a, b) => b - a);
			}
		},
		removeActive(index: number) {
			if (this.itemKey === "chamber" || this.itemKey === "spindleRPM" || this.items instanceof Array) {
				return;
			}

			const settingsStore = useSettingsStore();
			settingsStore.temperatures[this.itemKey!].active = this.items.active.filter((_, i) => i !== index);
		},
		addStandby() {
			if (this.itemKey === "chamber" || this.itemKey === "spindleRPM" || this.items instanceof Array) {
				return;
			}

			if (this.canAddStandby) {
				const settingsStore = useSettingsStore();
				settingsStore.temperatures[this.itemKey!].standby.push(this.activeValue);
				settingsStore.temperatures[this.itemKey!].standby.sort((a, b) => b - a);
			}
		},
		removeStandby(index: number) {
			if (this.itemKey === "chamber" || this.itemKey === "spindleRPM" || this.items instanceof Array) {
				return;
			}

			const settingsStore = useSettingsStore();
			settingsStore.temperatures[this.itemKey!].standby.splice(index, 1);
		},
		remove(index: number) {
			if (this.items instanceof Array) {
				const settingsStore = useSettingsStore();
				if (this.itemKey === "spindleRPM") {
					settingsStore.spindleRPM.splice(index, 1);
				} else if (this.itemKey === "chamber") {
					settingsStore.temperatures[this.itemKey].splice(1);
				}
			}
		},
		add() {
			if (this.items instanceof Array && this.canAdd) {
				const settingsStore = useSettingsStore();
				if (this.itemKey === "spindleRPM") {
					settingsStore.spindleRPM.push(this.value);
					settingsStore.spindleRPM.sort((a, b) => b - a);
				} else if (this.itemKey === "chamber") {
					settingsStore.temperatures.chamber.push(this.value);
					settingsStore.temperatures.chamber.sort((a, b) => b - a);
				}
			}
		}
	}
});
</script>
