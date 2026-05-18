<template>
	<v-dialog v-model="shown" max-width="600" persistent no-click-animation>
		<v-card>
			<v-form ref="form" @submit.prevent="apply">
				<v-card-title>
					<span class="text-headline-small">{{ $t("dialog.meshEdit.title") }}</span>
				</v-card-title>

				<v-card-text>
					<v-row v-if="isDelta">
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="radius" type="number"
										  :label="$t('dialog.meshEdit.radius')" required hide-details />
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="spacingX" type="number"
										  :label="$t('dialog.meshEdit.spacing')" required hide-details />
						</v-col>
					</v-row>
					<v-row v-else>
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="minX" type="number"
										  :label="$t('dialog.meshEdit.startCoordinate', [xAxis])" required hide-details />
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="maxX" type="number"
										  :label="$t('dialog.meshEdit.endCoordinate', [xAxis])" required hide-details />
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="minY" type="number"
										  :label="$t('dialog.meshEdit.startCoordinate', [yAxis])" required hide-details />
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="maxY" type="number"
										  :label="$t('dialog.meshEdit.endCoordinate', [yAxis])" required hide-details />
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="spacingX" type="number"
										  :label="$t('dialog.meshEdit.spacingDirection', [xAxis])" required hide-details />
						</v-col>
						<v-col cols="12" sm="6">
							<v-text-field v-model.number="spacingY" type="number"
										  :label="$t('dialog.meshEdit.spacingDirection', [yAxis])" required hide-details />
						</v-col>
					</v-row>
				</v-card-text>

				<v-card-actions>
					<v-spacer />
					<v-btn color="blue-darken-1" variant="text" @click="hide">
						{{ $t("generic.cancel") }}
					</v-btn>
					<v-btn color="blue-darken-1" variant="text" type="submit">
						{{ $t("generic.ok") }}
					</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { KinematicsName } from "@duet3d/objectmodel";
import { VForm } from "vuetify/components";

import { useMachineStore } from "@/stores/machine";

const shown = defineModel<boolean>("shown", { required: true });
const machineStore = useMachineStore();

const form = ref<InstanceType<typeof VForm> | null>(null);

const xAxis = ref("X");
const yAxis = ref("Y");
const minX = ref(0);
const minY = ref(0);
const maxX = ref(200);
const maxY = ref(200);
const radius = ref(150);
const spacingX = ref(20);
const spacingY = ref(20);

const isDelta = computed(() => [KinematicsName.linearDelta, KinematicsName.rotaryDelta].includes(machineStore.model.move.kinematics.name));

async function apply() {
	if (!form.value) {
		return;
	}
	const { valid } = await form.value.validate();
	if (!valid) {
		return;
	}
	hide();

	if (isDelta.value) {
		await machineStore.sendCode(`M557 R${radius.value} S${spacingX.value}`);
	} else {
		await machineStore.sendCode(`M557 X${minX.value}:${maxX.value} Y${minY.value}:${maxY.value} S${spacingX.value}:${spacingY.value}`);
	}
}

function hide() {
	shown.value = false;
}

watch(shown, (to) => {
	if (to) {
		// Pre-fill from the current probe grid so the dialog reflects what the machine already has
		const grid = machineStore.model.move.compensation.probeGrid;
		xAxis.value = (grid.axes.length > 0) ? grid.axes[0] : "X";
		yAxis.value = (grid.axes.length > 1) ? grid.axes[1] : "Y";
		maxX.value = (grid.maxs.length > 0) ? grid.maxs[0] : 0;
		maxY.value = (grid.maxs.length > 1) ? grid.maxs[1] : 0;
		minX.value = (grid.mins.length > 0) ? grid.mins[0] : 0;
		minY.value = (grid.mins.length > 1) ? grid.mins[1] : 0;
		radius.value = grid.radius;
		spacingX.value = (grid.spacings.length > 0) ? grid.spacings[0] : 0;
		spacingY.value = (grid.spacings.length > 1) ? grid.spacings[1] : 0;
	}
});
</script>
