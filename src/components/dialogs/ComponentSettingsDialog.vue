<template>
	<v-dialog v-model="shown" width="480" scrollable>
		<v-card>
			<v-card-title>
				<v-icon class="mr-1">mdi-cog</v-icon>
				{{ panelTitle ? $t("dialog.componentSettings.titleFor", [panelTitle]) : $t("dialog.componentSettings.title") }}
			</v-card-title>
			<v-card-text>
				<EntityVisibilityList v-for="(descriptor, field) in (schema ?? {})" :key="field"
									  :kind="descriptor.kind" :label="descriptor.label" class="mb-3"
									  :model-value="data[field] as Array<number> | null"
									  @update:model-value="(value: Array<number> | null) => data[field] = value" />
				<slot name="settings" />
			</v-card-text>
			<v-card-actions>
				<v-btn v-if="id" color="warning" variant="text" @click="resetSettings">
					{{ $t("dialog.componentSettings.reset") }}
				</v-btn>
				<v-spacer />
				<v-btn variant="text" @click="shown = false">
					{{ $t("generic.close") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import type { ComponentSettingDescriptor } from "@/composables/useComponentSettings";
import { useSettingsStore } from "@/stores/settings";

const props = defineProps<{
	id?: string;
	schema?: Record<string, ComponentSettingDescriptor>;
	panelTitle?: string;
}>();

const shown = defineModel<boolean>("shown", { required: true });

const settingsStore = useSettingsStore();

function resetSettings() {
	if (props.id !== undefined) {
		settingsStore.resetComponentSetting(props.id);
	}
}

// Backing record for the dynamic schema fields; absent when the panel only contributes static
// controls through the settings slot, in which case the schema loop renders nothing
const data = computed<Record<string, unknown>>(() => {
	if (props.id === undefined) {
		return {};
	}
	return (settingsStore.componentSettings[props.id]?.data ?? {}) as Record<string, unknown>;
});
</script>
