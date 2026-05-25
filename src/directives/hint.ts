import type { Directive } from "vue";

/**
 * Sets the native `title` hover tooltip on the host element.
 *
 * Vuetify form components such as v-switch, v-select and v-combobox don't surface a plain
 * `title` attribute on a hoverable element - v-switch drops it entirely, the others bind it to
 * an inner input that doesn't fill the control. This directive writes `title` onto the
 * component's root element, from where the browser's tooltip lookup covers every descendant.
 */
function apply(el: HTMLElement, value: string | undefined | null) {
	if (value) {
		el.title = value;
	} else {
		el.removeAttribute("title");
	}
}

export const vHint: Directive<HTMLElement, string | undefined | null> = {
	mounted: (el, binding) => apply(el, binding.value),
	updated: (el, binding) => apply(el, binding.value),
};
