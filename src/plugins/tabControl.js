'use strict'

function isFirstListItem(el) {
	const list = el.closest('.v-list');
	const parentEl = el.parentNode;

	for (let i = 0; i < list.children.length; i++) {
		if (list.children[i].style.display !== 'none' && list.children[i].querySelector('a')) {
			return list.children[i] === parentEl;
		}
	}
	return false;
}

function isLastListItem(el) {
	const list = el.closest('.v-list');
	const parentEl = el.parentNode;

	for (let i = list.children.length - 1; i >= 0; i--) {
		if (list.children[i].style.display !== 'none' && list.children[i].querySelector('a')) {
			return list.children[i] === parentEl;
		}
	}
	return false;
}

function isDisabled(el) {
	if (el.disabled) {
		return true;
	}
	if (Array.from(el.classList).some(name => name.endsWith('--disabled'))) {
		return true;
	}
	return false;
}

function tabItemKeyDown(e) {
	if (e.keyCode === 13 && !isDisabled(this)) {
		if (this.dataset.tabDblclick) {
			this.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		} else {
			this.click();
		}
	}
}

function tabItemContextMenu(e) {
	if (e.buttons === 0) {
		contextMenuControl = this;

		const firstItem = document.querySelector(`[data-tab-item="${this.dataset.tabMenu}"]:not([style*='display: none'])`);
		if (firstItem) {
			setTimeout(() => firstItem.focus(), 300);
		}
	}
}

function menuActivatorKeyDown(e) {
	if (e.keyCode === 13) {
		this.click();

		const firstItem = document.querySelector(`[data-tab-item="${this.dataset.tabActivator}"]:not([style*='display: none'])`);
		if (firstItem) {
			setTimeout(() => firstItem.focus(), 300);
		}
	}
}

function menuItemKeyDown(e) {
	if (e.keyCode === 9) {
		if ((e.shiftKey && isFirstListItem(this)) || (!e.shiftKey && isLastListItem(this))) {
			if (contextMenuControl) {
				const vnode = contextMenuNodes[this.dataset.tabItem];
				if (vnode && vnode.componentInstance) {
					vnode.componentInstance.isActive = false;
				}

				setTimeout(function() {
					contextMenuControl.focus();
					contextMenuControl = undefined;
				}, 300);
			} else {
				const activator = document.querySelector(`[data-tab-activator="${this.dataset.tabItem}"]`);
				setTimeout(function() {
					if (activator) {
						activator.click();
						activator.focus();
					}
				}, 300);
			}
		}
	} else if (e.keyCode === 13 && !isDisabled(this)) {
		const activator = document.querySelector(`[data-tab-activator="${this.dataset.tabItem}"]`);
		setTimeout(() => activator && activator.focus(), 300);

		this.click();
	}
}

function updateMenuLinks(items, id) {
	items.forEach(function(link) {
		if (link.dataset.tabItem === undefined) {
			link.addEventListener('keydown', menuItemKeyDown);
			link.dataset.tabItem = id;
		}

		link.tabIndex = 0;
	});
}

let tabId = 0, contextMenuControl, contextMenuNodes = {}

export default {
	bind(el, binding, vnode){
		const tagName = vnode.componentOptions ? vnode.componentOptions.tag : el.tagName;
		if (tagName === 'v-menu') {
			el.dataset.tabId = tabId++;
		}
	},
	inserted(el, binding, vnode) {
		const tagName = vnode.componentOptions ? vnode.componentOptions.tag : el.tagName;

		if (binding.modifiers.contextmenu) {
			if (tagName === 'v-menu') {
				el.parentNode.dataset.tabId = el.dataset.tabId++;
				delete el.dataset.tabId;
			}

			const parentElement = el.closest('[data-tab-id]');
			if (parentElement) {
				el.dataset.tabMenu = parentElement.dataset.tabId;
				el.tabIndex = 0;
				el.addEventListener('contextmenu', tabItemContextMenu);
			}
		}

		if (binding.modifiers.dblclick) {
			el.dataset.tabDblclick = true;
		}

		if (tagName === 'v-menu') {
			const id = binding.modifiers.contextmenu ? el.parentNode.dataset.tabId : el.dataset.tabId;

			// Change activator slot to trigger on enter
			if (vnode.componentInstance.$slots.activator) {
				vnode.componentInstance.$slots.activator.forEach(function(activator) {
					activator.elm.addEventListener('keydown', menuActivatorKeyDown);
					activator.elm.dataset['tabActivator'] = id;
				});
			}

			// Add tabindex and keydown event to link items
			if (!binding.modifiers.dynamic) {
				vnode.componentInstance.$slots.default.forEach(function(slot) {
					const domElements = Array.from(slot.componentInstance.$el.querySelectorAll('a'));
					updateMenuLinks(domElements, id);
				});
			}

			// Register contextmenu node so we can close it programatically
			if (binding.modifiers.contextmenu) {
				contextMenuNodes[id] = vnode;
			}
		} else if (tagName === 'v-list-tile') {
			const link = el.querySelector('a');
			link.tabIndex = 0;

			const parentElement = link.closest('[data-tab-id]');
			if (parentElement) {
				const domElements = Array.from(parentElement.querySelectorAll('a'));
				updateMenuLinks(domElements, parentElement.dataset.tabId);
			} else {
				link.addEventListener('keydown', tabItemKeyDown);
			}
		} else {
			el.tabIndex = 0;
			el.addEventListener('keydown', tabItemKeyDown);
		}
	},
	unbind(el, binding, vnode) {
		if (binding.modifiers.contextmenu) {
			el.removeEventListener('contextmenu', tabItemContextMenu);
		}

		const tagName = vnode.componentOptions ? vnode.componentOptions.tag : el.tagName;
		if (tagName === 'v-menu') {
			if (vnode.componentInstance.$slots.activator) {
				vnode.componentInstance.$slots.activator.forEach(activator => activator.elm.removeEventListener('keydown', menuActivatorKeyDown));
			}

			vnode.componentInstance.$slots.default.forEach(function(slot) {
				const links = Array.from(slot.componentInstance.$el.querySelectorAll('a'));
				links.forEach(function(link) {
					link.removeEventListener('keydown', menuItemKeyDown);
					link.dataset.tabItem = undefined;
				});
			});

			if (binding.modifiers.contextmenu) {
				delete contextMenuNodes[el.dataset.tabId];
			}
		} else if (tagName === 'v-list-tile') {
			const link = el.querySelector('a');
			link.removeEventListener('keydown', tabItemKeyDown);
		} else {
			el.removeEventListener('keydown', tabItemKeyDown);
		}
	}
}
