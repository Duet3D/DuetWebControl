<style>
.simple-keyboard {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 9999;
}

.simple-keyboard.dark {
	background-color: #1E1E1E;
	border-radius: 0;
	border-bottom-right-radius: 5px;
	border-bottom-left-radius: 5px;
}

.simple-keyboard.dark .hg-button {
	height: 50px;
	display: flex;
	justify-content: center;
	align-items: center;
	background: #1E1E1E;
	color: white;
}

.simple-keyboard.dark .hg-button:active {
	background: #1c4995;
	color: white;
}

.simple-keyboard .hg-button.hg-osk-disable {
	flex: 0 0 calc((100% - 55px) / 12);
}
</style>

<template>
	<div>
		<div ref="keyboard" v-if="oskGenerallyEnabled && input" class="simple-keyboard" @click.stop.prevent=""></div>
		<confirm-dialog :shown.sync="confirmDialogShown"
		                :title="$t('plugins.onScreenKeyboard.confirmTitle')"
		                :prompt="$t('plugins.onScreenKeyboard.confirmDisable')"
		                @confirmed="applyDisable" />
	</div>
</template>

<script lang="ts">
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";
import Vue from "vue";

import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import store from "@/store";
import { getLocalSetting, setLocalSetting, removeLocalSetting } from "@/utils/localStorage";

const localStorageKey = "OnScreenKeyboard.enabled";

export default Vue.extend({
	components: { ConfirmDialog },
	data() {
		return {
			input: null as HTMLInputElement | HTMLTextAreaElement | null,
			keyboard: null as any,
			oskGenerallyEnabled: getLocalSetting(localStorageKey) !== false,
			confirmDialogShown: false,
			unwatchPlugins: null as (() => void) | null
		}
	},
	mounted() {
		store.commit("oskEnabled", this.oskGenerallyEnabled);
		window.addEventListener("focusin", this.inputFocused);
		window.addEventListener("click", this.globalClick);

		// Clear the localStorage key when this plugin is removed from the enabled plugins list
		this.unwatchPlugins = store.watch(
			(state: any) => state.settings.enabledPlugins as string[],
			(plugins: string[], oldPlugins: string[]) => {
				if (oldPlugins.includes("OnScreenKeyboard") && !plugins.includes("OnScreenKeyboard")) {
					removeLocalSetting(localStorageKey);
				}
			}
		);
	},
	beforeDestroy() {
		window.removeEventListener("focusin", this.inputFocused);
		window.removeEventListener("click", this.globalClick);
		if (this.unwatchPlugins) {
			this.unwatchPlugins();
		}
	},
	methods: {
		inputFocused(e: Event) {
			if (this.oskGenerallyEnabled &&
				e.target !== this.input &&
				(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
				this.input = e.target;
				this.$nextTick(() => {
					this.initKeyboard(e.target as HTMLInputElement | HTMLTextAreaElement);
				});
			}
		},
		initKeyboard(target: HTMLInputElement | HTMLTextAreaElement) {
			const disableLabel = this.$t("plugins.onScreenKeyboard.disable") as string;
			if (!this.keyboard) {
				this.keyboard = new Keyboard({
					mergeDisplay: true,
					display: {
						"{enter}": "enter",
						"{oskDisable}": disableLabel
					},
					buttonTheme: [
						{ class: "hg-osk-disable", buttons: "{oskDisable}" }
					],
					layout: {
						default: [
							"` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
							"{tab} q w e r t y u i o p [ ] \\",
							"{lock} a s d f g h j k l ; ' {enter}",
							"{shift} z x c v b n m , . / {shift}",
							".com @ {space} {oskDisable}"
						],
						shift: [
							"~ ! @ # $ % ^ & * ( ) _ + {bksp}",
							"{tab} Q W E R T Y U I O P { } |",
							"{lock} A S D F G H J K L : \" {enter}",
							"{shift} Z X C V B N M < > ? {shift}",
							".com @ {space} {oskDisable}"
						]
					},
					onChange: this.updateValue,
					onKeyPress: this.onKeyPress,
					newLineOnEnter: target instanceof HTMLTextAreaElement,
					tabCharOnTab: target instanceof HTMLTextAreaElement,
					theme: store.state.settings.darkTheme ? "hg-theme-default dark" : "hg-theme-default"
				});
			}
			this.keyboard.setInput(target.value);

			if (target instanceof HTMLInputElement && target.type === "number") {
				// Show numpad for numeric inputs and clear previous input
				this.keyboard.setOptions({
					layout: {
						default: [
							"{numpad1} {numpad2} {numpad3}",
							"{numpad4} {numpad5} {numpad6}",
							"{numpad7} {numpad8} {numpad9}",
							"{bksp} . {numpad0} , {enter}"
						]
					}
				});
				this.keyboard.setInput("");
			}

			// Add some space at the bottom so the keyboard does not cover inputs
			store.commit("setBottomMargin", (this.$refs.keyboard as HTMLElement).offsetHeight);
		},
		globalClick() {
			if (!this.confirmDialogShown && document.activeElement !== this.input) {
				// Hide the keyboard when a user clicks/taps outside the keyboard and selected input
				this.hide();
			}
		},
		hide() {
			this.input = null;
			this.keyboard = null;
			store.commit("setBottomMargin", 0);
		},
		onInput(e: Event) {
			this.keyboard.setInput((e.target as HTMLInputElement | HTMLTextAreaElement).value);
		},
		updateValue(value: string) {
			if (this.input != null) {
				this.input.value = value;
				const ie = new Event("input", {
					bubbles: true,
					cancelable: true,
				});
				this.input.dispatchEvent(ie);
				const ce = new Event("change", {
					bubbles: true,
					cancelable: true,
				});
				this.input.dispatchEvent(ce);
			}
		},
		applyDisable() {
			this.oskGenerallyEnabled = false;
			setLocalSetting(localStorageKey, false);
			this.confirmDialogShown = false;
			this.keyboard = null;
			this.input = null;
			store.commit("setBottomMargin", 0);
			store.commit("oskEnabled", false);
		},
		onKeyPress(button: string) {
			if (button === "{oskDisable}") {
				this.confirmDialogShown = true;
			} else if (button === "{shift}" || button === "{lock}") {
				// Deal with shift/caps lock
				const currentLayout = this.keyboard.options.layoutName;
				this.keyboard.setOptions({
					layoutName: (currentLayout === "default") ? "shift" : "default"
				});
			} else if (button === "{enter}") {
				if (this.input instanceof HTMLInputElement) {
					// Emulate keydown, keypress, keyup in the right order
					const kde = new KeyboardEvent("keydown", {
						bubbles: true,
						cancelable: true,
						keyCode: 13
					});
					this.input.dispatchEvent(kde);

					const kpe = new KeyboardEvent("keypress", {
						bubbles: true,
						cancelable: true,
						keyCode: 13
					});
					this.input.dispatchEvent(kpe);

					const kue = new KeyboardEvent("keyup", {
						bubbles: true,
						cancelable: true,
						keyCode: 13
					});
					this.input.dispatchEvent(kue);

					// Wait a moment before closing the keyboard, else bad touch events may be invoked
					setTimeout(this.hide.bind(this), 500);
				} else if (this.input instanceof HTMLTextAreaElement) {
					// Focus textarea again to keep the cursor visible
					this.input.focus();
				}
			}
		}
	}
});
</script>
