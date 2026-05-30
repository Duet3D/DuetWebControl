<template>
	<v-card class="event-log elevation-3">
		<v-toolbar density="compact" color="surface" class="event-log-header">
			<v-toolbar-title class="text-body-large">
				{{ $t("list.eventLog.title") }}
			</v-toolbar-title>
			<v-spacer />
			<v-btn icon variant="text" :title="sortTitle" @click="toggleSort">
				<v-icon>{{ settings.sortNewestFirst ? "mdi-sort-clock-descending" : "mdi-sort-clock-ascending" }}</v-icon>
			</v-btn>
			<v-menu location="bottom end">
				<template #activator="{ props }">
					<v-btn v-bind="props" icon variant="text" :title="$t('list.eventLog.menu')">
						<v-icon>mdi-menu</v-icon>
					</v-btn>
				</template>
				<v-list :density="controlDensity">
					<v-list-item prepend-icon="mdi-notification-clear-all" :title="$t('list.eventLog.clear')"
								 @click="uiStore.clearLog()" />
					<v-list-item prepend-icon="mdi-file-download" :title="$t('list.eventLog.downloadText')"
								 :disabled="!entries.length" @click="downloadText" />
					<v-list-item prepend-icon="mdi-cloud-download" :title="$t('list.eventLog.downloadCSV')"
								 :disabled="!entries.length" @click="downloadCsv" />
				</v-list>
			</v-menu>
		</v-toolbar>

		<v-alert v-if="!entries.length" type="info" class="ma-0" density="compact" variant="tonal" tile>
			{{ $t("list.eventLog.noEvents") }}
		</v-alert>
		<ul v-else class="event-log-list">
			<li v-for="entry in entries" :key="entry.key" class="event-log-row" :class="rowClass(entry.type)"
				v-context-menu="(x: number, y: number) => openContextMenu(entry, x, y)">
				<div class="event-log-time">
					<time :datetime="entry.time.toISOString()">{{ entry.time.toLocaleString() }}</time>
				</div>
				<div class="event-log-content">
					<strong v-if="entry.title">{{ entry.title }}</strong>
					<br v-if="entry.title && entry.message">
					<span v-if="entry.message" class="event-log-message" v-html="formatMessage(entry.message)" />
				</div>
			</li>
		</ul>

		<v-menu v-model="contextMenu.shown" :target="[contextMenu.x, contextMenu.y]">
			<v-list :density="controlDensity">
				<v-list-item prepend-icon="mdi-content-copy" :title="$t('list.eventLog.copy')"
							 @click="copyEntry(contextMenu.entry)" />
				<v-list-item prepend-icon="mdi-content-copy" :title="$t('list.eventLog.copyAll')"
							 :disabled="!entries.length" @click="copyAll" />
				<v-list-item prepend-icon="mdi-clipboard-text-clock-outline" :title="$t('list.eventLog.copyLog')"
							 :disabled="!entries.length" @click="copyLog" />
			</v-list>
		</v-menu>
	</v-card>
</template>

<style scoped>
.event-log {
	/* Establishes a containment context so the rows below can switch layout via @container queries */
	container-type: inline-size;
}

.event-log-header {
	border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.event-log-list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.event-log-row {
	display: grid;
	grid-template-columns: 1fr;
	gap: 0.125rem;
	padding: 0.5rem 0.75rem;
	border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.event-log-row:last-child {
	border-bottom: none;
}

.event-log-time {
	font-size: 0.875rem;
	opacity: 0.75;
}

.event-log-message {
	white-space: pre-wrap;
}

/* Switch to a date | message two-column layout once the card is wide enough to fit it comfortably */
@container (min-width: 600px) {
	.event-log-row {
		grid-template-columns: 11rem 1fr;
		gap: 0.75rem;
		align-items: baseline;
	}
}

/* Row tinting per log level - light themes use accent tints, dark gets darker ones */
.event-log-row.level-success { background-color: rgba(76, 175, 80, 0.18); }
.event-log-row.level-warning { background-color: rgba(255, 193, 7, 0.20); }
.event-log-row.level-error { background-color: rgba(244, 67, 54, 0.20); }
.event-log-row.level-primary { background-color: rgba(33, 150, 243, 0.18); }
</style>

<script setup lang="ts">
import { useComponentSettings } from "@/composables/useComponentSettings";
import { useLargeButtons } from "@/composables/useLargeButtons";
import i18n from "@/i18n";
import { LogLevel, type LogMessage, useUiStore } from "@/stores/ui";
import { copyToClipboard } from "@/utils/clipboard";
import { saveBlob } from "@/utils/download";

const uiStore = useUiStore();

const settings = useComponentSettings({ sortNewestFirst: true });
const { controlDensity } = useLargeButtons();

interface DisplayEntry extends LogMessage {
	key: string;
}

// Sort + project into stable-keyed entries so v-for keys stay unique even for messages with the same timestamp
const entries = computed<Array<DisplayEntry>>(() => {
	const sorted = uiStore.logMessages.slice().sort((a, b) => a.time.getTime() - b.time.getTime());
	if (settings.value.sortNewestFirst) {
		sorted.reverse();
	}
	return sorted.map((entry, index) => ({ ...entry, key: `${entry.time.getTime()}-${index}` }));
});

const sortTitle = computed(() =>
	settings.value.sortNewestFirst ? i18n.global.t("list.eventLog.sortOldestFirst") : i18n.global.t("list.eventLog.sortNewestFirst")
);

function toggleSort() {
	settings.value.sortNewestFirst = !settings.value.sortNewestFirst;
}

function rowClass(type: LogLevel): string {
	switch (type) {
		case LogLevel.success: return "level-success";
		case LogLevel.warning: return "level-warning";
		case LogLevel.error: return "level-error";
		// info + primary share the blue tint - only success/warning/error get their own colour
		case LogLevel.info:
		case LogLevel.primary:
		default: return "level-primary";
	}
}

// Highlight Error:/Warning: prefixes, opportunistically pretty-print plain JSON responses
// The prefix patterns are deliberately English: RepRapFirmware emits these strings literally
// regardless of the UI locale, so localising the regex would stop matching real firmware
// responses
function formatMessage(message: string): string {
	const escaped = message
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	let result = escaped.replace(/Error:/g, "<strong>Error:</strong>").replace(/Warning:/g, "<strong>Warning:</strong>");
	if (message.startsWith("{") && message.endsWith("}")) {
		try {
			const json = JSON.parse(message);
			result = JSON.stringify(json, null, 4).replace(/\n/g, "<br>").replace(/ /g, "&nbsp;");
		} catch {
			// fall through with the escaped + highlighted version
		}
	}
	return result;
}

// Plain-text content of an entry ("title: message", dropping an empty half); formatWithTime
// prepends the timestamp for the full-log copy
function formatContent(entry: LogMessage): string {
	return entry.message ? (entry.title ? `${entry.title}: ${entry.message}` : entry.message) : (entry.title ?? "");
}

function formatWithTime(entry: LogMessage): string {
	return `${entry.time.toLocaleString()}: ${formatContent(entry)}`;
}

const contextMenu = reactive({ shown: false, x: 0, y: 0, entry: null as LogMessage | null });

function openContextMenu(entry: LogMessage, x: number, y: number) {
	contextMenu.entry = entry;
	contextMenu.x = x;
	contextMenu.y = y;
	// Toggle off first so an already-open menu repositions to the new row instead of staying put
	contextMenu.shown = false;
	nextTick(() => { contextMenu.shown = true; });
}

async function copyText(text: string) {
	try {
		await copyToClipboard(text);
	} catch (e) {
		console.warn(e);
	}
}

function copyEntry(entry: LogMessage | null) {
	if (entry) {
		copyText(formatContent(entry));
	}
}

function copyAll() {
	copyText(entries.value.map(formatContent).join("\n"));
}

function copyLog() {
	copyText(entries.value.map(formatWithTime).join("\n"));
}

function downloadText() {
	let textContent = "";
	for (const entry of uiStore.logMessages) {
		const title = entry.title?.replace(/\n/g, "\r\n") ?? "";
		const message = entry.message ? entry.message.replace(/\n/g, "\r\n") : "";
		textContent += `${entry.time.toLocaleString()}: ${message ? `${title}: ${message}` : title}\r\n`;
	}
	saveBlob("console.txt", new Blob([textContent], { type: "text/plain;charset=utf-8" }));
}

function downloadCsv() {
	let csv = '"date","time","title","message"\r\n';
	for (const entry of uiStore.logMessages) {
		const title = entry.title?.replace(/"/g, '""').replace(/\n/g, "\r\n") ?? "";
		const message = entry.message ? entry.message.replace(/"/g, '""').replace(/\n/g, "\r\n") : "";
		csv += `"${entry.time.toLocaleDateString()}","${entry.time.toLocaleTimeString()}","${title}","${message}"\r\n`;
	}
	saveBlob("console.csv", new Blob([csv], { type: "text/csv;charset=utf-8" }));
}
</script>
