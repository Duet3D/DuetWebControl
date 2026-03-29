<!-- Two-button Z babystep ±babystepAmount. Reads the current babystep value off the Z axis and posts
	 M290 R1 with the configured amount. The amount lives in settings -->
<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-0">
			<v-icon size="small" class="mr-1">mdi-format-vertical-align-center</v-icon>
			{{ $t("panel.babystepping.caption") }}
		</v-card-title>

		<v-card-text class="pt-1">
			{{ $t("panel.babystepping.current", [displayZ(babystepping)]) }}
			<v-row class="mt-1" dense>
				<v-col>
					<CodeButton :code="`M290 R1 Z${-settingsStore.babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-collapse-vertical</v-icon>
						{{ displayZ(-settingsStore.babystepAmount) }}
					</CodeButton>
				</v-col>
				<v-col>
					<CodeButton :code="`M290 R1 Z${settingsStore.babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-split-horizontal</v-icon>
						+{{ displayZ(settingsStore.babystepAmount) }}
					</CodeButton>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { AxisLetter } from "@duet3d/objectmodel";

import CodeButton from "@/components/buttons/CodeButton.vue";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { displayZ } from "@/utils/display";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

const babystepping = computed(() => machineStore.model.move.axes.find(a => a.letter === AxisLetter.Z)?.babystep ?? 0);
</script>
