import type { Directive } from "vue";

type ContextMenuHandler = (x: number, y: number) => void;

interface ContextMenuState {
	handler: ContextMenuHandler;
	longPressTimer?: number;
	nativeSuppressTimer?: number;
	startX: number;
	startY: number;
	suppressNativeContextMenu: boolean;
	suppressClick: boolean;
	onContextMenu: (event: MouseEvent) => void;
	onTouchStart: (event: TouchEvent) => void;
	onTouchMove: (event: TouchEvent) => void;
	onTouchEnd: () => void;
	onClickCapture: (event: MouseEvent) => void;
}

const LONG_PRESS_MS = 500;
// Finger travel beyond this many pixels turns the gesture into a scroll and cancels the long press
const MOVE_TOLERANCE = 10;
// Window after a long press in which a trailing native contextmenu event is swallowed
const NATIVE_SUPPRESS_MS = 800;

const states = new WeakMap<HTMLElement, ContextMenuState>();

function clearLongPress(state: ContextMenuState) {
	if (state.longPressTimer !== undefined) {
		clearTimeout(state.longPressTimer);
		state.longPressTimer = undefined;
	}
}

function attach(el: HTMLElement, handler: ContextMenuHandler) {
	const state: ContextMenuState = {
		handler,
		startX: 0,
		startY: 0,
		suppressNativeContextMenu: false,
		suppressClick: false,
		onContextMenu: (event) => {
			event.preventDefault();
			// A long press emits a trailing contextmenu on some browsers - the menu is already open,
			// so swallow it. A genuine right-click opens the menu at the cursor
			if (state.suppressNativeContextMenu) {
				return;
			}
			state.handler(event.clientX, event.clientY);
		},
		onTouchStart: (event) => {
			const touch = event.touches[0];
			if (!touch) {
				return;
			}
			state.suppressClick = false;
			state.startX = touch.clientX;
			state.startY = touch.clientY;
			state.longPressTimer = window.setTimeout(() => {
				state.longPressTimer = undefined;
				state.suppressClick = true;
				state.suppressNativeContextMenu = true;
				if (state.nativeSuppressTimer !== undefined) {
					clearTimeout(state.nativeSuppressTimer);
				}
				state.nativeSuppressTimer = window.setTimeout(() => {
					state.suppressNativeContextMenu = false;
					state.nativeSuppressTimer = undefined;
				}, NATIVE_SUPPRESS_MS);
				state.handler(state.startX, state.startY);
			}, LONG_PRESS_MS);
		},
		onTouchMove: (event) => {
			const touch = event.touches[0];
			if (state.longPressTimer !== undefined && touch
				&& (Math.abs(touch.clientX - state.startX) > MOVE_TOLERANCE
					|| Math.abs(touch.clientY - state.startY) > MOVE_TOLERANCE)) {
				clearLongPress(state);
			}
		},
		onTouchEnd: () => clearLongPress(state),
		onClickCapture: (event) => {
			// Swallow the click the browser synthesises right after a long press so the host's @click
			// (run macro / open file) doesn't fire alongside the context menu. Captured so it never
			// reaches the host's bubbling handler
			if (state.suppressClick) {
				state.suppressClick = false;
				event.preventDefault();
				event.stopPropagation();
			}
		},
	};

	el.addEventListener("contextmenu", state.onContextMenu);
	el.addEventListener("touchstart", state.onTouchStart, { passive: true });
	el.addEventListener("touchmove", state.onTouchMove, { passive: true });
	el.addEventListener("touchend", state.onTouchEnd);
	el.addEventListener("touchcancel", state.onTouchEnd);
	el.addEventListener("click", state.onClickCapture, true);
	states.set(el, state);
}

function detach(el: HTMLElement) {
	const state = states.get(el);
	if (!state) {
		return;
	}
	clearLongPress(state);
	if (state.nativeSuppressTimer !== undefined) {
		clearTimeout(state.nativeSuppressTimer);
	}
	el.removeEventListener("contextmenu", state.onContextMenu);
	el.removeEventListener("touchstart", state.onTouchStart);
	el.removeEventListener("touchmove", state.onTouchMove);
	el.removeEventListener("touchend", state.onTouchEnd);
	el.removeEventListener("touchcancel", state.onTouchEnd);
	el.removeEventListener("click", state.onClickCapture, true);
	states.delete(el);
}

/**
 * Opens a context menu on right-click or touch long-press. The bound value is called with the
 * viewport coordinates to position the menu at; the host keeps owning the menu itself. Replaces the
 * per-component long-press timers, native-menu suppression and post-long-press click suppression
 */
export const vContextMenu: Directive<HTMLElement, ContextMenuHandler> = {
	mounted: (el, binding) => attach(el, binding.value),
	updated: (el, binding) => {
		const state = states.get(el);
		if (state) {
			state.handler = binding.value;
		}
	},
	unmounted: (el) => detach(el),
};
