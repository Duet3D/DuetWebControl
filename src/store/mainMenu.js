'use strict'

import Path from "@/utils/path";

// As the internal page/menu-items come in, remember them so they can be squirted back into the menu
// after the config file has been fetched from the server
const keyedMenuItems = [];

// list of the default menu groups, that will be inflated into the full config
const defaultMenuConfig = [
	'default-control-group',
	'default-job-group',
	'default-files-group',
	'default-plugins-group',
	'default-settings-group'
];

// The default group menus, that are "inflated" into the menu config above by key
// This is so user-configured menus can also create default group by using the group's key
const defaultGroupConfigs = {
	'default-control-group': {
		name: 'Control',
		icon: 'mdi-tune',
		caption: 'menu.control.caption',
		pages: 'control-dashboard, control-console'
	},
	'default-job-group': {
		name: 'Job',
		icon: 'mdi-printer',
		caption: 'menu.job.caption',
		pages: 'job-status, job-webcam'
	},
	'default-files-group': {
		name: 'Files',
		icon: 'mdi-sd',
		caption: 'menu.files.caption',
		pages: 'files-jobs, files-macros, files-filaments, files-system'
	},
	'default-plugins-group': {
		name: 'Plugins',
		icon: 'mdi-puzzle',
		caption: 'menu.plugins.caption',
		pages: ''
	},
	'default-settings-group': {
		name: 'Settings',
		icon: 'mdi-wrench',
		caption: 'menu.settings.caption',
		pages: 'settings-general, settings-machine'
	}
}


// Given a menu, replace the group string keys with the configuration of that group.
// This drives the default menu above, but is also how users can configure a default group
// Without having to know ahead of time what is in the menu.
function inflateMenuGroups(menuArray) {
	if (!menuArray || !menuArray.length) return;

	menuArray.forEach((item, idx) => {
		if (typeof item === 'string' && defaultGroupConfigs[item]) {
			// found one, replicate and inflate the pages string to an array
			let tmp = {...defaultGroupConfigs[item]};
			tmp.pages = tmp.pages.split(',').map(p => p.trim()).filter(p => !!p.length);

			menuArray[idx] = tmp;
		}
	});
	return menuArray;
}



export default {
	namespaced: true,
	state: {
		// from the configuration above, inflate the default state...
		mainMenu: inflateMenuGroups(defaultMenuConfig),
	},

	getters: {
		mainMenu: state => state.mainMenu
	},

	actions: {
		async load({ commit, dispatch }) {
			try {
				const configContents = await dispatch('machine/download', {
					filename: Path.dwcMainMenuFile,
					showProgress: false,
					showSuccess: false,
					showError: false
				}, {root: true});

				if (!configContents) return;

				let menu = configContents.mainMenu || [];
				if (menu.length) {
					commit('resetMenu', menu);

					// re-attach the system components
					keyedMenuItems.forEach(c => commit('setMenuItem', c));
				}
			} catch (e) {
				// dissolve the error, file not being there or loading is fine...
			}
		}
	},

	mutations: {
		/**
		 * Main menu starts out by default as categories, this will seek through the menu
		 * and place the items under the named groups.
		 *
		 * The configuration however can be changed, where string placeholders are replaced
		 * by actual components when/if they turn up. So in the configuration, place the
		 * path for what will be a plugin's path, and when it's injected into the menu,
		 * this will fine that string and set th menu item.
		*/
		setMenuItem (state, { routeObj, routeConfig, menuGroup }) {
			if (!menuGroup && routeConfig.menuGroup) {
				// if a user config has named the menu group in their config
				menuGroup = routeConfig.menuGroup;
			}

			if (routeConfig.key) {
				keyedMenuItems.push({ routeObj, routeConfig });
			}

			let placed = false;
			// place into the menu
			state.mainMenu.forEach((item, k) => {
				if (typeof item === 'string' && (item === routeConfig.key || item === routeConfig.path)) {
					// replace a string placeholder of top-level button/item (no submenu)
					state.mainMenu[k] = routeObj;
					placed = true;

				} else if (item.pages) {
					// place into a submenu
					let idx = -1;
					if (routeConfig.key) idx = (item.pages || []).indexOf(routeConfig.key);
					if (idx < 0) idx = (item.pages || []).indexOf(routeConfig.path);
					if (idx > -1) {
						item.pages[idx] = routeObj;
						placed = true;
					}
				}
			});

			if (!placed && menuGroup) {
				// backwards compatibility for existing plugins to inject
				let group = state.mainMenu.find(item => item.name === menuGroup);
				if (group) {
					if (!group.pages.find(p => p.path === routeConfig.path)) {
						group.pages.push(routeObj);
					}
				}
			}
		},

		resetMenu (state, freshConfig) {
			// quick clear-out of the menu
			for (const item of state.mainMenu) {
				if (item.pages) {
					while (item.pages.length > 0) item.pages.pop();
				}
			}
			while (state.mainMenu.length > 0) {
				state.mainMenu.pop();
			}

			freshConfig.forEach(item => {
				state.mainMenu.push(item)
			});

			inflateMenuGroups(state.mainMenu);
		}
	}
}
