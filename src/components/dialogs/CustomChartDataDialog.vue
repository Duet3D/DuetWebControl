<template>
	<v-dialog v-model="shown" max-width="600" persistent no-click-animation>
		<v-card>
			<v-form ref="form" @submit.prevent="apply">
				<v-card-title>
					<span class="text-headline-small">
						{{ editId ? $t("chart.temperature.custom.editTitle") : $t("chart.temperature.custom.addTitle") }}
					</span>
				</v-card-title>

				<v-card-text>
					<v-text-field v-model="name" :label="$t('chart.temperature.custom.name')"
								  :rules="nameRules" autofocus required class="mb-1" />
					<v-text-field v-model="value" :label="$t('chart.temperature.custom.value')"
								  :rules="valueRules" :hint="$t('chart.temperature.custom.valueHint')"
								  persistent-hint required class="mb-2" />
					<v-row no-gutters class="align-center">
						<v-col cols="12" sm="6">
							<v-select v-model="axis" :items="axisItems" item-value="value" item-title="title"
									  :label="$t('chart.temperature.custom.axis')" hide-details />
						</v-col>
						<v-col cols="12" sm="6" class="ps-sm-5">
							<v-switch v-model="visible" color="primary" density="compact" hide-details
									  :label="$t('chart.temperature.custom.visible')" />
						</v-col>
					</v-row>
				</v-card-text>

				<v-card-actions>
					<v-spacer />
					<v-btn variant="text" @click="hide">
						{{ $t("generic.cancel") }}
					</v-btn>
					<v-btn variant="text" type="submit">
						{{ $t("generic.ok") }}
					</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { VForm } from "vuetify/components";

import i18n from "@/i18n";
import { type CustomChartAxis, useSettingsStore } from "@/stores/settings";
import { validateExpression } from "@/utils/expression";
import { generateUuid } from "@/utils/uuid";

const props = defineProps<{
	editId?: string | null;
}>();

const shown = defineModel<boolean>("shown", { required: true });
const settingsStore = useSettingsStore();

const form = ref<InstanceType<typeof VForm> | null>(null);

const name = ref("");
const value = ref("");
const visible = ref(true);
const axis = ref<CustomChartAxis>("left");

const axisItems = computed(() => [
	{ value: "left", title: i18n.global.t("chart.temperature.custom.axisLeft") },
	{ value: "right", title: i18n.global.t("chart.temperature.custom.axisRight") }
]);

const nameRules = [(v: string) => !!v || i18n.global.t("dialog.inputRequired")];
const valueRules = [(v: string) => validateExpression(v)];

async function apply() {
	if (!form.value) {
		return;
	}
	const { valid } = await form.value.validate();
	if (!valid) {
		return;
	}

	const data = { name: name.value, value: value.value, visible: visible.value, axis: axis.value };
	if (props.editId) {
		settingsStore.updateCustomChartItem(props.editId, data);
	} else {
		settingsStore.addCustomChartItem({ id: generateUuid(), ...data });
	}
	hide();
}

function hide() {
	shown.value = false;
}

watch(shown, (to) => {
	if (!to) {
		return;
	}
	const item = props.editId ? settingsStore.customChartData.find(entry => entry.id === props.editId) : null;
	name.value = item?.name ?? "";
	value.value = item?.value ?? "";
	visible.value = item?.visible ?? true;
	axis.value = item?.axis ?? "left";
});
</script>
