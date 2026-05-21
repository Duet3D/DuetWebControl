<template>
	<v-dialog v-model="shown" width="480" scrollable>
		<v-card v-if="item">
			<v-card-title class="d-flex align-center">
				<v-icon class="mr-2">mdi-information</v-icon>
				<span class="text-truncate">{{ item.name }}</span>
			</v-card-title>
			<v-card-text>
				<v-table v-if="infoRows.length > 0" density="compact">
					<tbody>
						<tr v-for="row in infoRows" :key="row.label">
							<td class="font-weight-medium">{{ row.label }}</td>
							<td class="text-right">{{ row.value }}</td>
						</tr>
					</tbody>
				</v-table>
				<v-alert v-else type="info" variant="tonal" density="compact">
					{{ $t("dialog.fileInfo.noInfo") }}
				</v-alert>

				<template v-if="customRows.length > 0">
					<div class="font-weight-medium mt-4 mb-1">{{ $t("dialog.fileInfo.customInfo") }}</div>
					<v-table density="compact">
						<tbody>
							<tr v-for="row in customRows" :key="row.label">
								<td class="font-weight-medium">{{ row.label }}</td>
								<td class="text-right">{{ row.value }}</td>
							</tr>
						</tbody>
					</v-table>
				</template>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn color="blue-darken-1" variant="text" @click="shown = false">
					{{ $t("generic.close") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import type { GcodeThumbnailItem } from "@/composables/useGcodeThumbnails";
import i18n from "@/i18n";
import { display, displaySize, displayTime } from "@/utils/display";

const props = defineProps<{
	item: GcodeThumbnailItem | null;
}>();

const shown = defineModel<boolean>("shown", { required: true });

interface InfoRow {
	label: string;
	value: string;
}

function toNumber(value: number | bigint | null | undefined): number | null {
	if (value === null || value === undefined) {
		return null;
	}
	return typeof value === "bigint" ? Number(value) : value;
}

const infoRows = computed<Array<InfoRow>>(() => {
	const item = props.item;
	if (item === null) {
		return [];
	}
	const rows: Array<InfoRow> = [];

	const size = toNumber(item.size);
	if (size !== null && size > 0) {
		rows.push({ label: i18n.global.t("list.baseFileList.size"), value: displaySize(size) });
	}
	if (item.lastModified) {
		rows.push({ label: i18n.global.t("list.baseFileList.lastModified"), value: item.lastModified.toLocaleString() });
	}
	if (typeof item.height === "number" && item.height > 0) {
		rows.push({ label: i18n.global.t("list.jobs.height"), value: display(item.height, 2, "mm") });
	}
	if (typeof item.layerHeight === "number" && item.layerHeight > 0) {
		rows.push({ label: i18n.global.t("list.jobs.layerHeight"), value: display(item.layerHeight, 2, "mm") });
	}
	if (typeof item.numLayers === "number" && item.numLayers > 0) {
		rows.push({ label: i18n.global.t("dialog.fileInfo.numLayers"), value: String(item.numLayers) });
	}
	if (item.filament && item.filament.length > 0) {
		rows.push({
			label: i18n.global.t("list.jobs.filament"),
			value: item.filament.map(value => display(value, 1, "mm")).join(", ")
		});
	}
	const printTime = toNumber(item.printTime);
	if (printTime !== null && printTime > 0) {
		rows.push({ label: i18n.global.t("list.jobs.printTime"), value: displayTime(printTime) });
	}
	const simulatedTime = toNumber(item.simulatedTime);
	if (simulatedTime !== null && simulatedTime > 0) {
		rows.push({ label: i18n.global.t("list.jobs.simulatedTime"), value: displayTime(simulatedTime) });
	}
	if (item.generatedBy) {
		rows.push({ label: i18n.global.t("list.jobs.generatedBy"), value: item.generatedBy });
	}
	return rows;
});

const customRows = computed<Array<InfoRow>>(() => {
	const customInfo = props.item?.customInfo;
	if (!customInfo) {
		return [];
	}
	return Object.entries(customInfo).map(([label, value]) => ({
		label,
		value: (value === null || value === undefined) ? "" : String(value)
	}));
});
</script>
