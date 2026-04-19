<!-- Object Model Browser - tree view over the live ObjectModel with API documentation lookup
	 against DuetAPI.xml from the connected machine. The left column hosts the search-filtered
	 tree; selecting a node reveals the right column with documentation + the dotted path
	 ready to copy. The XML doc loads on first mount and is cached for the session -->
<template>
	<v-row class="ma-0">
		<v-col ref="leftContainer" :cols="active.length === 0 ? 12 : 6">
			<v-text-field v-model="search" prepend-inner-icon="mdi-magnify"
						  :placeholder="$t('plugins.objectModelBrowser.search')" clearable
						  density="compact" variant="outlined" hide-details class="mb-3" />

			<v-treeview v-model:activated="active" :items="modelTree" :search="search"
						:custom-filter="filterItem" item-title="label" item-value="id"
						item-children="children" activatable open-on-click density="compact"
						return-object>
				<template #append="{ item }">
					<v-chip v-if="(item as ModelTreeItem).type" size="x-small" class="ml-2">
						{{ (item as ModelTreeItem).type }}
					</v-chip>
				</template>
			</v-treeview>

			<div class="d-flex justify-center">
				<v-btn v-show="active.length === 0" color="info" class="mt-3" :disabled="uiStore.uiFrozen"
					   variant="elevated" @click="refresh">
					<v-icon class="mr-1">mdi-refresh</v-icon>
					{{ $t("button.refresh.caption") }}
				</v-btn>
			</div>
		</v-col>

		<v-col v-show="active.length !== 0" ref="rightContainer" cols="6">
			<v-row class="my-1 align-center">
				<v-col class="pt-4">
					{{ $t("plugins.objectModelBrowser.selectedNode") }}
					<template v-if="activeId">
						<input ref="activeInput" type="text" :value="activeId" readonly
							   :class="['text-center', 'mx-2', settingsStore.darkTheme ? 'text-white' : '']"
							   @click="selectInput" />
						<v-icon size="small" class="ml-1" @click="copyPath">mdi-content-copy</v-icon>
					</template>
					<template v-else>
						{{ $t("plugins.objectModelBrowser.none") }}
					</template>
				</v-col>
				<v-col cols="auto">
					<v-btn color="info" :disabled="uiStore.uiFrozen" variant="elevated" @click="refresh">
						<v-icon class="mr-1">mdi-refresh</v-icon>
						{{ $t("button.refresh.caption") }}
					</v-btn>
				</v-col>
			</v-row>

			<v-alert v-if="apiFileError !== null" type="warning" variant="outlined" class="mb-3">
				{{ $t("plugins.objectModelBrowser.documentationNotAvailable") }}
			</v-alert>

			<v-card v-if="apiDocumentation !== null" variant="outlined" class="pa-3">
				<template v-if="apiDocumentationSummary !== null">
					<h4>{{ $t("plugins.objectModelBrowser.summary") }}</h4>
					<span v-html="apiDocumentationSummary" />
				</template>

				<template v-if="apiDocumentationRemarks !== null">
					<br v-if="apiDocumentationSummary !== null" />
					<h4>{{ $t("plugins.objectModelBrowser.remarks") }}</h4>
					<span v-html="apiDocumentationRemarks" />
				</template>
			</v-card>
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { isDriverId } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import {
	extractTag, getDuetApiDocument, getDuetApiError, loadDuetApi, lookupApiMember
} from "@/utils/duetApi";

interface ModelTreeItem {
	id: string;
	label: string;
	type: "array" | "object" | "value" | "";
	children?: Array<ModelTreeItem>;
}

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const active = ref<Array<ModelTreeItem>>([]);
const search = ref("");
const modelTree = ref<Array<ModelTreeItem>>([]);

const apiFile = ref<Document | null>(null);
const apiFileError = ref<string | null>(null);

// Single-select; VTreeview emits an array because activatable is multi-capable, but the legacy
// plugin only ever pinned one node so we keep the first entry's id around
const activeId = computed(() => active.value.length > 0 ? active.value[0].id : null);

const apiDocumentation = computed<Element | null>(() => {
	if (apiFile.value === null || activeId.value === null) {
		return null;
	}
	return lookupApiMember(apiFile.value, activeId.value);
});

const apiDocumentationSummary = computed<string | null>(() => {
	return apiDocumentation.value !== null ? extractTag(apiDocumentation.value, "summary") : null;
});

const apiDocumentationRemarks = computed<string | null>(() => {
	return apiDocumentation.value !== null ? extractTag(apiDocumentation.value, "remarks") : null;
});

// VTreeview customFilter signature: (value, query, item) -> boolean. `item.raw` is the
// original tree node when present; older internal-item shapes don't expose it, hence the guard
function filterItem(_value: unknown, query: string, item: unknown): boolean {
	const raw = (item as { raw?: ModelTreeItem } | undefined)?.raw;
	if (!raw) {
		return false;
	}
	const term = query.toLowerCase();
	return raw.id.toLowerCase().includes(term) || raw.label.toLowerCase().includes(term);
}

function getItemLabel(name: string | number, value: unknown): string {
	try {
		if (value === null) {
			return `${name} = null`;
		}
		if (typeof value === "string") {
			return `${name} = "${value}"`;
		}
		if (isDriverId(value)) {
			// v3.7-dev needed a fresh DriverId because Vue 2's reactivity proxy stripped methods
			// off persisted instances. Vue 3 preserves the prototype, so toString() works directly
			return `${name} = "${value.toString()}"`;
		}
		if (value instanceof Object) {
			return String(name);
		}
		return `${name} = ${value}`;
	} catch {
		return `${name} = ${i18n.global.t("generic.noValue")}`;
	}
}

function getItemType(value: unknown): ModelTreeItem["type"] {
	if (value instanceof Array) {
		return "array";
	}
	if (value !== null && !isDriverId(value) && value instanceof Object) {
		return "object";
	}
	return "value";
}

// Recursive tree builder: handles plain objects, arrays, and ModelDictionary Maps. The
// per-node `id` is the dotted OM path used both for activation tracking and for the API
// documentation lookup
function makeModelTree(obj: unknown, path: Array<string>): Array<ModelTreeItem> {
	if (obj instanceof Array) {
		return obj.map((item, index) => {
			const itemPath = path.slice();
			const tail = itemPath.length > 0 ? itemPath[itemPath.length - 1] : "";
			if (itemPath.length > 0) {
				itemPath[itemPath.length - 1] = `${tail}[${index}]`;
			}
			const id = itemPath.join(".");
			const labelName = tail.includes("[") ? String(item) : index;
			return {
				id,
				label: getItemLabel(labelName, item),
				type: getItemType(item),
				children: makeModelTree(item, itemPath),
			};
		});
	}

	if (obj instanceof Map) {
		return Array.from(obj.keys())
			.sort()
			.map((key) => {
				const itemPath = path.slice();
				itemPath.push(key);
				const value = obj.get(key);
				return {
					id: itemPath.join("."),
					label: getItemLabel(key, value),
					type: getItemType(value),
					children: makeModelTree(value, itemPath),
				};
			});
	}

	if (obj !== null && !isDriverId(obj) && obj instanceof Object) {
		return Object.keys(obj)
			.sort()
			.map((key) => {
				const itemPath = path.slice();
				itemPath.push(key);
				const value = (obj as Record<string, unknown>)[key];
				return {
					id: itemPath.join("."),
					label: getItemLabel(key, value),
					type: getItemType(value),
					children: makeModelTree(value, itemPath),
				};
			});
	}

	return [];
}

function refresh() {
	modelTree.value = makeModelTree(machineStore.model, []);
}

const activeInput = ref<HTMLInputElement | null>(null);

function selectInput(event: Event) {
	(event.target as HTMLInputElement).select();
}

async function copyPath() {
	if (!activeId.value) {
		return;
	}
	try {
		await navigator.clipboard.writeText(activeId.value);
	} catch {
		// Older browsers fall back to the selection-based copy path used by v3.7-dev
		activeInput.value?.focus();
		activeInput.value?.select();
		document.execCommand("copy");
	}
}

onMounted(async () => {
	if (apiFile.value === null && apiFileError.value === null) {
		apiFile.value = await loadDuetApi();
		apiFileError.value = getDuetApiError();
		if (apiFile.value === null && apiFileError.value === null) {
			// Another caller resolved the load between our check and the await; pick up the cache
			apiFile.value = getDuetApiDocument();
		}
	}
	refresh();
});
</script>

<style scoped>
input[readonly] {
	background: transparent;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
	padding: 2px 6px;
	min-width: 8rem;
}
</style>
