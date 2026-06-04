<style scoped>
input[readonly] {
	background: transparent;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
	padding: 2px 6px;
	flex: 1 1 8rem;
	min-width: 0;
	max-width: 100%;
}

.deprecated-label {
	text-decoration: line-through;
	color: rgb(var(--v-theme-warning));
}

@media (min-width: 840px) {
	.om-column {
		min-height: 0;
		overflow-y: auto;
	}
}

@media (min-width: 600px) and (max-width: 839.98px) {
	.om-description {
		position: sticky;
		top: calc(var(--v-layout-top, 64px) + 12px);
		align-self: flex-start;
	}
}
</style>

<template>
	<v-row class="ma-0 pt-3 pt-md-0 pe-3 pe-md-0" :class="{ 'dwc-page-fill overflow-hidden flex-nowrap': mdAndUp }">
		<v-col ref="leftContainer" cols="12" :sm="active.length === 0 ? 12 : 6" class="om-column">
			<v-text-field v-model="search" prepend-inner-icon="mdi-magnify"
						  :placeholder="$t('plugins.objectModelBrowser.search')" clearable
						  density="compact" variant="outlined" hide-details class="mb-3" />

			<v-treeview v-model:activated="active" :items="modelTree" :search="search"
						:custom-filter="filterItem" :load-children="loadChildren"
						item-title="label" item-value="id" item-children="children"
						activatable open-on-click density="compact" return-object>
				<template #title="{ item }">
					<span :class="{ 'deprecated-label': isDeprecated(item as ModelTreeItem) }">
						{{ liveLabel(item as ModelTreeItem) }}
					</span>
					<v-chip v-if="indexChipLabel(item as ModelTreeItem) !== null"
							size="x-small" class="ml-2">
						{{ indexChipLabel(item as ModelTreeItem) }}
					</v-chip>
					<v-icon v-if="isDeprecated(item as ModelTreeItem)" color="warning"
							icon="mdi-alert" size="small" class="ml-1"
							:title="$t('plugins.objectModelBrowser.deprecated')" />
				</template>
				<template #append="{ item }">
					<v-chip v-if="(item as ModelTreeItem).type" size="x-small" class="ml-2">
						{{ (item as ModelTreeItem).type }}
					</v-chip>
				</template>
			</v-treeview>
		</v-col>

		<v-col v-show="active.length !== 0" ref="rightContainer" cols="12" sm="6"
			   class="om-column om-description">
			<div class="d-flex align-center flex-wrap ga-2 mb-3">
				<span>{{ $t("plugins.objectModelBrowser.selectedNode") }}</span>
				<template v-if="activeId">
					<input ref="activeInput" type="text" :value="activeId" readonly
						   :class="['text-center', settingsStore.darkTheme ? 'text-white' : '']"
						   @click="selectInput" />
					<v-icon size="small" @click="copyPath">mdi-content-copy</v-icon>
				</template>
				<span v-else>{{ $t("plugins.objectModelBrowser.none") }}</span>
			</div>

			<div v-if="activeValueDisplay !== null" class="d-flex align-center ga-2 mb-3">
				<span class="text-medium-emphasis">{{ $t("plugins.objectModelBrowser.value") }}:</span>
				<code class="text-body-medium">{{ activeValueDisplay }}</code>
			</div>

			<v-alert v-if="apiFileError !== null" type="warning" variant="outlined" class="mb-3">
				{{ $t("plugins.objectModelBrowser.documentationNotAvailable") }}
			</v-alert>

			<v-card v-if="apiDocumentation !== null || deprecationNotice !== null"
					variant="outlined" class="pa-3">
				<template v-if="apiDocumentationSummary !== null">
					<div class="text-title-medium mb-1">{{ $t("plugins.objectModelBrowser.summary") }}</div>
					<div v-html="apiDocumentationSummary" />
				</template>

				<template v-if="apiDocumentationRemarks !== null">
					<div :class="['text-title-medium', 'mb-1', apiDocumentationSummary !== null ? 'mt-3' : '']">
						{{ $t("plugins.objectModelBrowser.remarks") }}
					</div>
					<div v-html="apiDocumentationRemarks" />
				</template>

				<template v-if="deprecationNotice !== null">
					<div :class="['text-title-medium text-warning mb-1', (apiDocumentationSummary !== null || apiDocumentationRemarks !== null) ? 'mt-3' : '']">
						<v-icon icon="mdi-alert" size="small" class="me-1" />
						{{ $t("plugins.objectModelBrowser.deprecated") }}
					</div>
					<div>{{ deprecationNotice }}</div>
				</template>
			</v-card>
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { isDriverId } from "@duet3d/objectmodel";
import deprecations from "@duet3d/objectmodel/deprecations.json";
import { useDisplay } from "vuetify";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import {
	extractTag, getDuetApiDocument, getDuetApiError, loadDuetApi, lookupApiMember
} from "@/utils/duetApi";

interface ModelTreeItem {
	id: string;
	path: Array<PathStep>;
	label: string;
	type: "array" | "object" | "value" | "";
	children?: Array<ModelTreeItem>;
}

interface PathStep {
	kind: "key" | "index" | "mapKey";
	name: string;
}

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const display = useDisplay();
const mdAndUp = display.mdAndUp;

const active = ref<Array<ModelTreeItem>>([]);
const search = ref("");
const modelTree = ref<Array<ModelTreeItem>>([]);

const apiFile = ref<Document | null>(null);
const apiFileError = ref<string | null>(null);

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

// #region Tree building

// Skip framework / private fields that aren't part of the documented object model, plus
// transient collections that DWC consumes on the fly (e.g. `messages` is drained into the
// console log before merge so the live model only ever holds an empty placeholder)
const HIDDEN_KEY = /^[_$]/;
const HIDDEN_TOP_LEVEL_KEYS = new Set(["messages"]);

function visibleKeys(obj: object, isRoot: boolean): Array<string> {
	return Object.keys(obj)
		.filter((k) => !HIDDEN_KEY.test(k) && !(isRoot && HIDDEN_TOP_LEVEL_KEYS.has(k)))
		.sort();
}

function getItemType(value: unknown): ModelTreeItem["type"] {
	if (value instanceof Array) {
		return "array";
	}
	if (value !== null && !isDriverId(value) && value instanceof Object && !(value instanceof Function)) {
		return "object";
	}
	return "value";
}

function hasChildren(value: unknown): boolean {
	if (value instanceof Array) {
		return value.length > 0;
	}
	if (value instanceof Map) {
		return value.size > 0;
	}
	if (value !== null && !isDriverId(value) && value instanceof Object && !(value instanceof Function)) {
		return visibleKeys(value, false).length > 0;
	}
	return false;
}

function formatLabel(name: string | number, value: unknown): string {
	try {
		if (value === null) {
			return `${name} = null`;
		}
		if (typeof value === "string") {
			return `${name} = "${value}"`;
		}
		if (isDriverId(value)) {
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

function buildId(path: Array<PathStep>): string {
	let id = "";
	for (const step of path) {
		if (step.kind === "index") {
			id += `[${step.name}]`;
		} else if (id.length === 0) {
			id = step.name;
		} else {
			id += `.${step.name}`;
		}
	}
	return id;
}

function buildLevel(obj: unknown, path: Array<PathStep>): Array<ModelTreeItem> {
	if (obj instanceof Array) {
		return obj.map((item, index) => {
			const childPath: Array<PathStep> = [...path, { kind: "index", name: String(index) }];
			return makeItem(childPath, formatLabel(index, item), item);
		});
	}
	if (obj instanceof Map) {
		return Array.from(obj.keys()).sort().map((key) => {
			const childPath: Array<PathStep> = [...path, { kind: "mapKey", name: key }];
			const value = obj.get(key);
			return makeItem(childPath, formatLabel(key, value), value);
		});
	}
	if (obj !== null && !isDriverId(obj) && obj instanceof Object && !(obj instanceof Function)) {
		return visibleKeys(obj, path.length === 0).map((key) => {
			const childPath: Array<PathStep> = [...path, { kind: "key", name: key }];
			const value = (obj as Record<string, unknown>)[key];
			return makeItem(childPath, formatLabel(key, value), value);
		});
	}
	return [];
}

function makeItem(path: Array<PathStep>, label: string, value: unknown): ModelTreeItem {
	const type = getItemType(value);
	// VTreeview shows a disclosure caret whenever `children` is an array (even empty), so
	// leave it undefined for true leaves and use [] as a marker for "expand to load"
	const item: ModelTreeItem = {
		id: buildId(path),
		path,
		label,
		type,
	};
	if (hasChildren(value)) {
		item.children = [];
	}
	return item;
}

function lookupNode(path: Array<PathStep>): unknown {
	// Re-walk the live model so each lazy expansion reflects the current state
	let current: unknown = machineStore.model;
	for (const step of path) {
		if (current === null || current === undefined) {
			return undefined;
		}
		if (step.kind === "index") {
			if (current instanceof Array) {
				current = current[Number(step.name)];
			} else {
				return undefined;
			}
		} else if (step.kind === "mapKey") {
			if (current instanceof Map) {
				current = current.get(step.name);
			} else {
				return undefined;
			}
		} else {
			current = (current as Record<string, unknown>)[step.name];
		}
	}
	return current;
}

async function loadChildren(item: unknown): Promise<void> {
	const node = item as ModelTreeItem;
	const value = lookupNode(node.path);
	node.children = buildLevel(value, node.path);
}

function liveLabel(item: ModelTreeItem): string {
	// Re-read the value from the live model so primitive values stay current without us having
	// to rebuild the surrounding tree on every poll
	const value = lookupNode(item.path);
	const tail = item.path[item.path.length - 1];
	if (!tail) {
		return item.label;
	}
	const name: string | number = tail.kind === "index" ? Number(tail.name) : tail.name;
	// Drop the `= value` suffix at xs; the row gets too cramped, and the value is shown
	// in the doc panel below the tree
	if (display.xs.value && getItemType(value) === "value") {
		return String(name);
	}
	return formatLabel(name, value);
}

// The deprecations table keys arrays as `name[]` regardless of index, so normalise the live
// path before lookup (e.g. `move.extruders[2].pressureAdvance` -> `move.extruders[].pressureAdvance`)
function lookupDeprecation(path: string): string | null {
	const normalized = path.replace(/\[\d+\]/g, "[]");
	return (deprecations as Record<string, string>)[normalized] ?? null;
}

function isDeprecated(item: ModelTreeItem): boolean {
	return lookupDeprecation(item.id) !== null;
}

// For array indices whose item carries a discriminating string (inputs/boards/tools have a
// `name`; move.axes has a `letter`), surface that value as a chip so the user can tell at a
// glance which input/board/tool/axis a row stands for
function indexChipLabel(item: ModelTreeItem): string | null {
	const tail = item.path[item.path.length - 1];
	if (!tail || tail.kind !== "index") {
		return null;
	}
	const value = lookupNode(item.path) as { name?: unknown; letter?: unknown } | null;
	for (const key of ["name", "letter"] as const) {
		const candidate = value?.[key];
		if (typeof candidate === "string" && candidate.length > 0) {
			return candidate;
		}
	}
	return null;
}

const deprecationNotice = computed<string | null>(() => {
	if (activeId.value === null) {
		return null;
	}
	return lookupDeprecation(activeId.value);
});

const activeValueDisplay = computed<string | null>(() => {
	if (!display.xs.value || activeId.value === null) {
		return null;
	}
	const item = active.value[0];
	const value = lookupNode(item.path);
	if (getItemType(value) !== "value") {
		return null;
	}
	if (value === null) {
		return "null";
	}
	if (typeof value === "string") {
		return `"${value}"`;
	}
	if (isDriverId(value)) {
		return `"${value.toString()}"`;
	}
	return String(value);
});

// #endregion

// #region Search

function filterItem(_value: unknown, query: string, item: unknown): boolean {
	const raw = (item as { raw?: ModelTreeItem } | undefined)?.raw;
	if (!raw) {
		return false;
	}
	const term = query.toLowerCase();
	return raw.id.toLowerCase().includes(term) || raw.label.toLowerCase().includes(term);
}

// #endregion

// #region Selected-node helpers

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
		activeInput.value?.focus();
		activeInput.value?.select();
		document.execCommand("copy");
	}
}

// #endregion

// Rebuild the root level whenever the set of top-level keys changes. Lower levels are kept
// stable to preserve expansion state; users can collapse + re-expand to refresh a subtree
watch(
	() => {
		const model = machineStore.model;
		return model ? visibleKeys(model, true).join("|") : "";
	},
	() => {
		modelTree.value = buildLevel(machineStore.model, []);
	},
	{ immediate: true }
);

onMounted(async () => {
	if (apiFile.value === null && apiFileError.value === null) {
		apiFile.value = await loadDuetApi();
		apiFileError.value = getDuetApiError();
		if (apiFile.value === null && apiFileError.value === null) {
			apiFile.value = getDuetApiDocument();
		}
	}
});
</script>
