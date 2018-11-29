'use strict'

function resize(el, binding, vnode) {
	// Get parent grid item
	let gridItem = vnode.componentInstance;
	if (!gridItem) {
		console.warn('[v-auto-size] No component instance');
		return;
	}

	while (gridItem && gridItem.$options._componentTag !== 'vue-grid-item') {
		gridItem = gridItem.$parent;
	}

	if (!gridItem) {
		console.warn('[v-auto-size] Failed to retrieve grid item parent');
		return;
	}

	// Resize width (non-default)
	if (binding.modifiers.width) {
		let totalWidth = 0;
		Array.from(el.children).forEach(function(child) {
			totalWidth += child.offsetWidth;
			if (child.style.marginLeft !== "") { totalWidth += child.style.marginLeft; }
			if (child.style.marginRight !== "") { totalWidth += child.style.marginRight; }
		});
		gridItem.$emit("requestWidth", totalWidth);
	}

	// Resize height (default)
	if (!binding.modifiers.noHeight) {
		let totalHeight = 0;
		Array.from(el.children).forEach(function(child) {
			totalHeight += child.offsetHeight;
			if (child.style.marginTop !== "") { totalHeight += child.style.marginTop; }
			if (child.style.marginBottom !== "") { totalHeight += child.style.marginBottom; }
		});
		gridItem.$emit("requestHeight", totalHeight);	
	}
}

let resizableElements = []
window.addEventListener('resize', function() {
	resizableElements.forEach(item => resize(item.el, item.binding, item.vnode));
})

export default {
	install(Vue) {
		Vue.directive('auto-size', {
			bind: (el, binding, vnode) => resizableElements.push({ el, binding, vnode }),
			unbind: (el, binding, vnode) => resizableElements = resizableElements.filter(item => item.vnode != vnode),
			inserted: (el, binding, vnode) => setTimeout(() => resize(el, binding, vnode), 0),
			componentUpdated: (el, binding, vnode) => setTimeout(() => resize(el, binding, vnode), 0)
		});
	}
}
