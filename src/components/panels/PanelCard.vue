<style scoped>
.panel-title {
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;
}

.panel-title-area {
	position: relative;
	min-width: 0;
}

.panel-titles {
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
}

.panel-titles > .panel-title {
	flex: 0 0 auto;
}

.panel-titles--measuring {
	position: absolute;
	visibility: hidden;
	pointer-events: none;
	overflow: visible;
}
</style>

<template>
	<v-card>
		<v-card-title class="py-2 d-flex align-center">
			<div ref="titleArea" class="panel-title-area d-flex align-center flex-grow-1">
				<div ref="expandedEl" class="panel-titles d-flex align-center" :class="{ 'panel-titles--measuring': collapsed }">
					<template v-for="(entry, index) in resolvedTitles" :key="index">
						<v-hover>
							<template #default="{ isHovering, props: hoverProps }">
								<span v-bind="hoverProps" class="panel-title d-flex align-center"
									  :class="titleSpacingClass(index)"
									  @touchstart="onTouchStart(index, $event)" @touchend="cancelLongPress"
									  @touchmove="onTouchMove" @touchcancel="cancelLongPress"
									  @contextmenu="onContextMenu(index, $event)">
									<PanelLink :active="activeTitle === index" @click="activeTitle = index">
										<v-icon size="small" class="mr-1">{{ entry.icon }}</v-icon>
										{{ entry.title }}
									</PanelLink>
									<v-btn v-if="showsEditPencil(index)"
										   icon="mdi-pencil" variant="text" size="small" density="comfortable" class="ms-1"
										   :style="{ visibility: isHovering ? 'visible' : 'hidden' }"
										   :title="$t('dialog.componentSettings.edit')" @click="openDialog(index)" />
									<span v-if="slots['title-action-' + index]" class="d-flex align-center"
										  :style="{ visibility: (isTouch || isHovering) ? 'visible' : 'hidden' }">
										<slot :name="'title-action-' + index" />
									</span>
								</span>
							</template>
						</v-hover>
					</template>
				</div>

				<v-menu v-if="collapsed" location="bottom start">
					<template #activator="{ props: menuProps }">
						<a v-bind="menuProps" href="javascript:void(0)" class="panel-title d-flex align-center">
							<v-icon size="small" class="mr-1">{{ resolvedTitles[activeTitle]?.icon }}</v-icon>
							{{ resolvedTitles[activeTitle]?.title }}
							<v-icon size="small" class="ms-1">mdi-menu-down</v-icon>
						</a>
					</template>
					<v-list>
						<v-list-item v-for="(entry, index) in resolvedTitles" :key="index"
									 :active="index === activeTitle" @click="activeTitle = index">
							<v-icon size="small" class="mr-1">{{ entry.icon }}</v-icon>
							{{ entry.title }}
						</v-list-item>
					</v-list>
				</v-menu>
			</div>

			<slot name="title-append" />
		</v-card-title>

		<slot />

		<ComponentSettingsDialog v-if="hasAnyDialog" v-model:shown="shown"
								 :id="resolvedTitles[dialogIndex]?.settingsId ?? handle?.id"
								 :schema="dialogIndex === 0 ? handle?.schema : undefined"
								 :panel-title="resolvedTitles[dialogIndex]?.title">
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
	// Component-settings id backing this title, used to target the dialog's Reset at the right
	// record. Needed when a tabbed panel hosts more than one settings-bearing tab, since the single
	// injected handle can only carry one id; single-handle panels leave it unset and use that handle
	settingsId?: string;
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

// When the inline tab list is wider than the space left for it, the whole list collapses into a
// single link plus caret that opens a dropdown of all titles
const collapsed = ref(false);
const titleArea = ref<HTMLElement>();
const expandedEl = ref<HTMLElement>();

// The expanded list keeps rendering (off-flow) while collapsed so its natural width stays
// measurable; comparing that against the area's available width never changes when collapse
// toggles, which avoids the expand/collapse oscillation a naive scrollWidth check would cause
function updateCollapsed() {
	if (resolvedTitles.value.length <= 1) {
		collapsed.value = false;
		return;
	}
	const area = titleArea.value, expanded = expandedEl.value;
	if (area && expanded) {
		collapsed.value = expanded.scrollWidth > area.clientWidth + 1;
	}
}

let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
	resizeObserver = new ResizeObserver(() => updateCollapsed());
	if (titleArea.value) {
		resizeObserver.observe(titleArea.value);
	}
	if (expandedEl.value) {
		resizeObserver.observe(expandedEl.value);
	}
	updateCollapsed();
});

watch(resolvedTitles, () => nextTick(updateCollapsed));

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

// The edit pencil shows only when the title has settings, panel editing is on, and the device has
// hover (touch uses long-press instead)
function showsEditPencil(index: number): boolean {
	return hasDialog(index) && !isTouch && settingsStore.enablePanelEditing;
}

// Inter-title spacing: a title with its own pencil needs only a small margin since the pencil
// already separates it; a pencil-less title gets the wider me-8 to line up when any pencil is
// shown, or me-3 when no title has one
const anyEditPencil = computed(() => resolvedTitles.value.some((_, index) => showsEditPencil(index)));
function titleSpacingClass(index: number): string {
	if (showsEditPencil(index)) {
		return "me-1";
	}
	return anyEditPencil.value ? "me-8" : "me-3";
}

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
let longPressStartX = 0, longPressStartY = 0;

// Past this much finger travel the gesture is a scroll/swipe rather than a press. Touchscreens
// emit touchmove events for sub-pixel jitter while the finger is held still, so cancelling on
// any movement at all would kill every long-press before the 500 ms timer elapses
const LONG_PRESS_MOVE_TOLERANCE = 10;

function onTouchStart(index: number, event: TouchEvent) {
	if (!hasDialog(index) || !settingsStore.enablePanelEditing) {
		return;
	}
	const touch = event.touches[0];
	longPressStartX = touch?.clientX ?? 0;
	longPressStartY = touch?.clientY ?? 0;
	longPressTimer = window.setTimeout(() => openDialog(index), 500);
}

function onTouchMove(event: TouchEvent) {
	const touch = event.touches[0];
	if (longPressTimer !== undefined && touch
		&& (Math.abs(touch.clientX - longPressStartX) > LONG_PRESS_MOVE_TOLERANCE
			|| Math.abs(touch.clientY - longPressStartY) > LONG_PRESS_MOVE_TOLERANCE)) {
		cancelLongPress();
	}
}

function cancelLongPress() {
	if (longPressTimer !== undefined) {
		clearTimeout(longPressTimer);
		longPressTimer = undefined;
	}
}

// Firefox/Android raise the native context menu on long-press and hijack the gesture with a
// touchcancel, so the press never reaches our timer. Suppress it on touch wherever a long-press
// would open a dialog; elsewhere the native menu is left intact
function onContextMenu(index: number, event: Event) {
	if (isTouch && hasDialog(index) && settingsStore.enablePanelEditing) {
		event.preventDefault();
	}
}

onBeforeUnmount(() => {
	cancelLongPress();
	resizeObserver?.disconnect();
});
</script>
