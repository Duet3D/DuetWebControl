'use strict'

function resize(el, binding, vnode, inserted) {
	// Resize width (non-default)
	let resizeWidth = false, totalWidth = 0;
	if (binding.modifiers.width) {
		if (vnode.componentInstance) {
			Array.from(el.children).forEach(function(child) {
				totalWidth += child.offsetWidth;
				if (child.style.marginLeft !== "") { totalWidth += child.style.marginLeft; }
				if (child.style.marginRight !== "") { totalWidth += child.style.marginRight; }
			});
		} else {
			totalWidth = el.offsetWidth;
		}

		/* eslint-disable eqeqeq */
		resizeWidth = totalWidth != el.dataset.resizeWidth;
	}

	// Resize height (default)
	let resizeHeight = false, totalHeight = 0;
	if (!binding.modifiers.noHeight) {
		if (vnode.componentInstance) {
			Array.from(el.children).forEach(function(child) {
				totalHeight += child.offsetHeight;
				if (child.style.marginTop !== "") { totalHeight += child.style.marginTop; }
				if (child.style.marginBottom !== "") { totalHeight += child.style.marginBottom; }
			});
		} else {
			totalHeight = el.offsetHeight;
		}

		/* eslint-disable eqeqeq */
		resizeHeight = totalHeight != el.dataset.resizeHeight;
	}

	// See if we need to do anything
	if (resizeWidth || resizeHeight) {
		let gridItem = vnode.componentInstance || vnode.context;
		if (!gridItem) {
			console.log(gridItem);
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

		if (resizeWidth) {
			el.dataset.resizeWidth = totalWidth;
			gridItem.$emit("requestWidth", totalWidth);
		}
		if (resizeHeight) {
			el.dataset.resizeHeight = totalHeight;
			gridItem.$emit("requestHeight", totalHeight);
		}
	}

	// Make sure to update the sizes when the owning grid item is resized
	if (inserted) {
		let gridItem = vnode.componentInstance || vnode.context;
		if (!gridItem) {
			console.warn('[v-auto-size] No component instance on insert');
			return;
		}

		while (gridItem && gridItem.$options._componentTag !== 'vue-grid-item') {
			gridItem = gridItem.$parent;
		}

		if (!gridItem) {
			console.warn('[v-auto-size] Failed to retrieve grid item parent on insert');
			return;
		}

		gridItem.$on('resized', () => setTimeout(() => resize(el, binding, vnode, false), 0));
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
			unbind: (el, binding, vnode) => resizableElements = resizableElements.filter(item => item.vnode !== vnode),
			inserted: (el, binding, vnode) => setTimeout(() => resize(el, binding, vnode, true), 100),
			componentUpdated: (el, binding, vnode) => setTimeout(() => resize(el, binding, vnode, false), 0)
		});
	}
}
