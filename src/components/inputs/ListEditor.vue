<!-- Chip-list editor for temperature presets + spindle RPM presets. Two shapes:
	 - `{ active: number[], standby: number[] }` for tool / bed temperatures
	 - `number[]` for chamber temperatures and spindleRPM
	 The component reads/writes settingsStore directly; the parent picks which preset list to
	 edit via the `itemKey` prop -->
<template>
	<div>
		<template v-if="!isFlatList && pairItems">
			<v-row dense>
				<v-col cols="6">
					<h3 class="text-center mt-1">{{ $t("generic.active") }}</h3>
				</v-col>
				<v-col cols="6">
					<h3 class="text-center mt-1">{{ $t("generic.standby") }}</h3>
				</v-col>

				<v-col cols="6">
					<v-chip v-for="(temp, index) in pairItems.active" :key="`a-${temp}-${index}`"
							closable size="small" class="ma-1"
							@click:close="removeFrom('active', index)"
							@keyup.delete="removeFrom('active', index)">
						{{ temp }} {{ unit }}
					</v-chip>
				</v-col>
				<v-col cols="6">
					<v-chip v-for="(temp, index) in pairItems.standby" :key="`s-${temp}-${index}`"
							closable size="small" class="ma-1"
							@click:close="removeFrom('standby', index)"
							@keyup.delete="removeFrom('standby', index)">
						{{ temp }} {{ unit }}
					</v-chip>
				</v-col>

				<v-col cols="6">
					<v-row align="center" dense>
						<v-col>
							<v-text-field v-model.number="activeValue" type="number" min="-273" max="1999"
										  :label="$t('input.addTemperature')" density="compact"
										  variant="outlined" hide-details
										  @keyup.enter="addToActive" />
						</v-col>
						<v-col cols="auto">
							<v-btn color="primary" size="small" :disabled="!canAddActive" @click="addToActive">
								<v-icon class="mr-1">mdi-plus</v-icon> {{ $t("button.add.caption") }}
							</v-btn>
						</v-col>
					</v-row>
				</v-col>
				<v-col cols="6">
					<v-row align="center" dense>
						<v-col>
							<v-text-field v-model.number="standbyValue" type="number" min="-273" max="1999"
										  :label="$t('input.addTemperature')" density="compact"
										  variant="outlined" hide-details
										  @keyup.enter="addToStandby" />
						</v-col>
						<v-col cols="auto">
							<v-btn color="primary" size="small" :disabled="!canAddStandby" @click="addToStandby">
								<v-icon class="mr-1">mdi-plus</v-icon> {{ $t("button.add.caption") }}
							</v-btn>
						</v-col>
					</v-row>
				</v-col>
			</v-row>
		</template>

		<template v-else-if="flatList">
			<v-row dense>
				<v-col cols="12">
					<v-chip v-for="(value, index) in flatList" :key="`f-${value}-${index}`"
							closable size="small" class="ma-1"
							@click:close="removeFromFlat(index)"
							@keyup.delete="removeFromFlat(index)">
						{{ value }} {{ unit }}
					</v-chip>
				</v-col>
				<v-col cols="12">
					<v-row align="center" dense>
						<v-col>
							<v-text-field v-if="temperature" v-model.number="flatValue" type="number"
										  min="-273" max="1999" :label="$t('input.addTemperature')"
										  density="compact" variant="outlined" hide-details
										  @keyup.enter="addToFlat" />
							<v-text-field v-else v-model.number="flatValue" type="number" min="0"
										  :label="$t('input.addRPM')" density="compact" variant="outlined"
										  hide-details @keyup.enter="addToFlat" />
						</v-col>
						<v-col cols="auto">
							<v-btn color="primary" size="small" :disabled="!canAddFlat" @click="addToFlat">
								<v-icon class="mr-1">mdi-plus</v-icon> {{ $t("button.add.caption") }}
							</v-btn>
						</v-col>
					</v-row>
				</v-col>
			</v-row>
		</template>
	</div>
</template>

<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";

type TemperatureKey = "tool" | "bed" | "chamber";
type ItemKey = TemperatureKey | "spindleRPM";

const props = defineProps<{
	itemKey: ItemKey;
	temperature?: boolean;
}>();

const settingsStore = useSettingsStore();

const unit = computed(() => (props.temperature ? "°C" : "RPM"));

// Resolves to either a { active, standby } pair (tool, bed) or a flat number[] (chamber,
// spindleRPM). Two computed splits keep the template's v-if/v-else clean
const items = computed(() => {
	if (props.itemKey === "spindleRPM") {
		return settingsStore.spindleRPM;
	}
	return settingsStore.temperatures[props.itemKey];
});

const isFlatList = computed(() => Array.isArray(items.value));
const pairItems = computed(() => isFlatList.value ? null : items.value as { active: number[]; standby: number[] });
const flatList = computed(() => isFlatList.value ? items.value as number[] : null);

// #region Pair (active / standby) editor

const activeValue = ref(0);
const standbyValue = ref(0);

const canAddActive = computed(() => Number.isFinite(activeValue.value)
	&& !!pairItems.value && !pairItems.value.active.includes(activeValue.value));
const canAddStandby = computed(() => Number.isFinite(standbyValue.value)
	&& !!pairItems.value && !pairItems.value.standby.includes(standbyValue.value));

function addToActive() {
	if (!canAddActive.value || !pairItems.value) return;
	pairItems.value.active = [...pairItems.value.active, activeValue.value].sort((a, b) => b - a);
}

function addToStandby() {
	if (!canAddStandby.value || !pairItems.value) return;
	pairItems.value.standby = [...pairItems.value.standby, standbyValue.value].sort((a, b) => b - a);
}

function removeFrom(side: "active" | "standby", index: number) {
	if (!pairItems.value) return;
	pairItems.value[side] = pairItems.value[side].filter((_, i) => i !== index);
}

// #endregion

// #region Flat list editor (chamber, spindleRPM)

const flatValue = ref(0);

const canAddFlat = computed(() => Number.isFinite(flatValue.value)
	&& !!flatList.value && !flatList.value.includes(flatValue.value));

function addToFlat() {
	if (!canAddFlat.value || !flatList.value) return;
	const next = [...flatList.value, flatValue.value].sort((a, b) => b - a);
	writeFlatList(next);
}

function removeFromFlat(index: number) {
	if (!flatList.value) return;
	writeFlatList(flatList.value.filter((_, i) => i !== index));
}

function writeFlatList(values: number[]) {
	if (props.itemKey === "spindleRPM") {
		settingsStore.spindleRPM = values;
	} else {
		// TypeScript can't narrow itemKey to a chamber-style key here without an explicit cast
		(settingsStore.temperatures as Record<string, number[] | { active: number[]; standby: number[] }>)[props.itemKey] = values;
	}
}

// #endregion
</script>
