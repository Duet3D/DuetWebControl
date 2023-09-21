import { useUiStore } from "@/store/ui";
import OnScreenKeyboard from "./OnScreenKeyboard.vue"

useUiStore().injectComponent("on-screen-keyboard", OnScreenKeyboard);
