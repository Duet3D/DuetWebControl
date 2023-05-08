<style>
.editor-monaco {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
}

.editor-monaco > div {
	display: flex;
	flex-grow: 1;
}

.editor-textarea {
	align-items: stretch !important;
}

.editor-textarea > div > div {
	align-items: stretch;
	flex-grow: 1;
	padding-left: 0 !important;
}

.editor-textarea > div > div > div {
	align-items: stretch !important;
}

.editor-textarea textarea {
	display: flex;
	flex-grow: 1;
	font-family: monospace;
	padding-left: 12px !important;
	margin-top: 0 !important;
	resize: none;
	-moz-tab-size: 4;
	-o-tab-size: 4;
	tab-size: 4;
}
</style>

<template>
	<v-dialog :value="shown" @input="$emit('update:shown', $event)" fullscreen hide-overlay persistent no-click-animation
			  transition="dialog-bottom-transition">
		<v-card class="d-flex flex-column">
			<v-app-bar flat dark color="primary" class="flex-grow-0 flex-shrink-1">
				<v-btn icon dark @click="close(false)">
					<v-icon>mdi-close</v-icon>
				</v-btn>
				<v-toolbar-title>{{ filename }}</v-toolbar-title>

				<v-spacer />

				<v-btn v-if="language === 'gcode'" class="hidden-xs-only" dark text
					   href="https://docs.duet3d.com/en/User_manual/Reference/Gcodes" target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon>
					{{ $t("dialog.fileEdit.gcodeReference") }}
				</v-btn>
				<v-btn v-if="isMenu" class="hidden-xs-only" dark text
					   href="https://docs.duet3d.com/en/User_manual/Connecting_hardware/Display_12864_menu#menu-files"
					   target="_blank">
					<v-icon class="mr-1">mdi-help</v-icon>
					{{ $t("dialog.fileEdit.menuReference") }}
				</v-btn>
				<v-btn dark text @click="save">
					<v-icon class="mr-1">mdi-floppy</v-icon>
					{{ $t("dialog.fileEdit.save") }}
				</v-btn>
			</v-app-bar>

			<div ref="editor" class="editor-monaco"></div>
			<v-textarea v-if="!useEditor" ref="textarea" hide-details solo :rows="null" class="editor-textarea"
						autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" :value="innerValue"
						@input.passive="valueChanged = true" @blur="innerValue = $event.target.value"
						@keydown.tab.exact.prevent="onTextareaTab" @keydown.esc.prevent.stop="close(false)" />
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import Vue from "vue";

import store from "@/store";
import "@/utils/monaco-editor";
import "@/utils/monaco-gcode";
import "@/utils/monaco-menu";
import "@/utils/monaco-STM32";
import Path from "@/utils/path";

const mediumFileThreshold = 4194304;	// 4 MiB
const bigFileThreshold = 33554432;		// 32 MiB

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		filename: {
			type: String,
			required: true
		},
		value: String
	},
	computed: {
		gCodesDirectory(): string { return store.state.machine.model.directories.gCodes; },
		macrosDirectory(): string { return store.state.machine.model.directories.macros; },
		menuDirectory(): string { return store.state.machine.model.directories.menu; },
		darkTheme(): boolean { return store.state.settings.darkTheme; },
		language(): string {
			if (Path.startsWith(this.filename, this.macrosDirectory) || /(\.g|\.gcode|\.gc|\.gco|\.nc|\.ngc|\.tap)$/i.test(this.filename)) {
				return "gcode";
			}
			if (/\.json/i.test(this.filename)) {
				return "json";
			}
			if (Path.startsWith(this.filename, this.menuDirectory)) {
				return "menu";
			}
			if (Path.equals(this.filename, Path.boardFile)) {
				return "STM32";
			}
			return "";
		},
		isMenu(): boolean {
			return Path.startsWith(this.filename, this.menuDirectory);
		},
		isMobile(): boolean {
			return /(Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone)/i.test(navigator.userAgent);
		}
	},
	data() {
		return {
			editor: null as monaco.editor.IStandaloneCodeEditor | null,
			innerValue: "",
			valueChanged: false,
			useEditor: false
		}
	},
	methods: {
		close(fileSaved: boolean) {
			if (this.valueChanged && !fileSaved && !confirm(this.$t("dialog.fileEdit.confirmClose"))) {
				return;
			}

			this.$emit("input", "");
			this.$emit("update:shown", false);
			this.$root.$emit("dialog-closing")
		},
		async save() {
			if (this.editor !== null) {
				this.innerValue = this.editor.getValue();
			}

			if (!this.innerValue.length && !confirm(this.$t("dialog.fileEdit.confirmSaveEmpty"))) {
				return;
			}

			const content = new Blob([this.innerValue]);
			this.close(true);

			try {
				await store.dispatch("machine/upload", { filename: this.filename, content });
				this.$emit("editComplete", this.filename);
			} catch (e) {
				// TODO Optionally ask user to save file somewhere else
			}
		},
		onBeforeLeave(e: Event) {
			if (this.valueChanged) {
				// Cancel the event. Chrome also requires returnValue to be set
				e.preventDefault();
				e.returnValue = false;
			}
		},
		onTextareaTab(e: Event) {
			const textArea = e.target as HTMLTextAreaElement, originalSelectionStart = textArea.selectionStart;
			const textStart = textArea.value.slice(0, originalSelectionStart), textEnd = textArea.value.slice(originalSelectionStart);

			let spacesInserted = 1;
			if (textStart.endsWith(" ")) {
				let numSpaces = 0;
				for (let i = textStart.length - 1; i >= 0; i--) {
					if (textStart[i] === " ") {
						numSpaces++;
					} else {
						break;
					}
				}

				spacesInserted = 4 - numSpaces % 4;
				let spaces = "";
				for (let i = 0; i < spacesInserted; i++) {
					spaces += " ";
				}
				this.innerValue = textStart + spaces + textEnd;
			} else {
				this.innerValue = textStart + "\t" + textEnd;
			}

			textArea.value = this.innerValue;
			textArea.selectionEnd = textArea.selectionStart = originalSelectionStart + spacesInserted;
		}
	},
	beforeDestroy() {
		if (this.editor !== null) {
			this.editor.dispose();
			this.editor = null;
		}
	},
	watch: {
		shown(to) {
			// Update textarea
			this.innerValue = this.value || "";
			this.useEditor = !window.disableCodeMirror && !this.isMobile;
			this.$nextTick(() => this.valueChanged = false);

			if (to) {
				// Create Monaco editor if necessary
				if (this.useEditor) {
					this.$nextTick(() => {
						const isBigFile = this.innerValue.length > bigFileThreshold, isMediumFile = this.innerValue.length > mediumFileThreshold;
						this.editor = monaco.editor.create(this.$refs.editor as HTMLElement, {
							automaticLayout: true,
							matchBrackets: isBigFile ? "near" : "always",
							language: this.language,
							lineNumbersMinChars: isMediumFile ? 10 : 5,
							occurrencesHighlight: !isBigFile,
							rulers: [255],
							scrollBeyondLastLine: false,
							theme: store.state.settings.darkTheme ? "vs-dark" : "vs",
							value: this.innerValue,
							wordBasedSuggestions: false
						});
						this.editor.focus();
					});
				}

				// Add notification for users in case changes have not been saved yet
				window.addEventListener("beforeunload", this.onBeforeLeave);
			} else {
				// ... and turn it off again when the dialog is hidden
				window.removeEventListener("beforeunload", this.onBeforeLeave);

				// Clean up again
				if (this.editor !== null) {
					this.editor.dispose();
					this.editor = null;
				} else if (this.$refs.textarea !== null) {
					(this.$refs.textarea as HTMLTextAreaElement).blur();
				}
			}
		}
	}
});
</script>