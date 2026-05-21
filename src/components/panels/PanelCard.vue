<template>
	<v-card>
		<v-card-title class="py-2 d-flex align-center">
			<template v-for="(entry, index) in resolvedTitles" :key="index">
				<v-hover>
					<template #default="{ isHovering, props: hoverProps }">
						<span v-bind="hoverProps" class="d-flex align-center"
							  :class="{ 'me-2': index < resolvedTitles.length - 1 }"
							  @touchstart="onTouchStart(index)" @touchend="cancelLongPress"
							  @touchmove="cancelLongPress" @touchcancel="cancelLongPress">
							<PanelLink :active="activeTitle === index" @click="activeTitle = index">
								<v-icon size="small" class="mr-1">{{ entry.icon }}</v-icon>
								{{ entry.title }}
							</PanelLink>
							<span v-if="slots['title-action-' + index]" class="d-flex align-center"
								  :style="{ visibility: (isTouch || isHovering) ? 'visible' : 'hidden' }">
								<slot :name="'title-action-' + index" />
							</span>
							<v-btn v-if="hasDialog(index) && !isTouch && settingsStore.enablePanelEditing"
								   icon="mdi-pencil" variant="text" size="small" density="comfortable" class="ms-1"
								   :style="{ visibility: isHovering ? 'visible' : 'hidden' }"
								   :title="$t('dialog.componentSettings.edit')" @click="openDialog(index)" />
						</span>
					</template>
				</v-hover>
			</template>

			<slot name="title-append" />
		</v-card-title>

		<slot />

		<ComponentSettingsDialog v-if="hasAnyDialog" v-model:shown="shown" :id="handle?.id"
								 :schema="dialogIndex === 0 ? handle?.schema : undefined">
			<template #settings>
				<slot :name="settingsSlotName(dialogIndex) ?? 'settings'" />
			</template>
		</ComponentSettingsDialog>
	</v-card>
</template>

<script setup lang="ts">
import { COMPONENT_SETTINGS_KEY } from "@/composables/useComponentSettings";
import { useSettingsStore } from "@/stores/settings";

const settingsStore = useSettingsStore();

interface PanelCardTitle {
	icon: string;
	title: string;
}

// A panel either passes a single `icon` + `title` (the common case) or a `titles` array for a
// multi-title (tabbed) panel; every title carries its own icon
const props = defineProps<{
	icon?: string;
	title?: string;
	titles?: Array<PanelCardTitle>;
}>();

const resolvedTitles = computed<Array<PanelCardTitle>>(() =>
	props.titles ?? [{ icon: props.icon ?? "", title: props.title ?? "" }]);

// Index of the active title - only meaningful for multi-title panels
const activeTitle = defineModel<number>("activeTitle", { default: 0 });

const slots = useSlots();

// Present only when the owning component opted in via useComponentSettings
const handle = inject(COMPONENT_SETTINGS_KEY, undefined);

const handleHasSchema = computed(() => handle !== undefined && Object.keys(handle.schema).length > 0);

// Settings slot feeding title `index`: a multi-title panel names them `settings-<index>`, a
// single-title panel uses the plain `settings` slot
function settingsSlotName(index: number): string | undefined {
	const indexed = `settings-${index}`;
	if (slots[indexed]) {
		return indexed;
	}
	if (index === 0 && slots.settings) {
		return "settings";
	}
	return undefined;
}

// A title has its own settings editor when it has a settings slot; title 0 additionally hosts
// any dynamic schema declared through useComponentSettings
function hasDialog(index: number): boolean {
	return settingsSlotName(index) !== undefined || (index === 0 && handleHasSchema.value);
}

const hasAnyDialog = computed(() => resolvedTitles.value.some((_, index) => hasDialog(index)));

const shown = ref(false);
const dialogIndex = ref(0);

function openDialog(index: number) {
	dialogIndex.value = index;
	shown.value = true;
}

// Touch devices have no hover, so the pencil is never shown there; a long-press on the title
// opens that title's dialog instead
const isTouch = window.matchMedia?.("(hover: none)").matches ?? false;

let longPressTimer: number | undefined;

function onTouchStart(index: number) {
	if (!hasDialog(index) || !settingsStore.enablePanelEditing) {
		return;
	}
	longPressTimer = window.setTimeout(() => openDialog(index), 500);
}

function cancelLongPress() {
	if (longPressTimer !== undefined) {
		clearTimeout(longPressTimer);
		longPressTimer = undefined;
	}
}

onBeforeUnmount(cancelLongPress);
</script>
