'use strict'

import Path from "@/utils/path";

// As the internal page/menu-items come in, remember them so they can be squirted back into the menu
// after the config file has been fetched from the server
const keyedMenuItems = [];

export default {
	namespaced: true,
	state: {
		mainMenu: [                                      // Menu, initial configuration:
			{                                            //   Strings in 'pages' arrays are the keys of
				name: 'Control',                         //   the default system pages that are replaced
				icon: 'mdi-tune',                        //   when the components register themselves
				caption: 'menu.control.caption',
				pages: [
					'control-dashboard',
					'control-console'
				]
			},
			{
				name: 'Job',
				icon: 'mdi-printer',
				caption: 'menu.job.caption',
				pages: [
					'job-status',
					'job-webcam'
				]
			},
			{
				name: 'Files',
				icon: 'mdi-sd',
				caption: 'menu.files.caption',
				pages: [
					'files-jobs',
					'files-macros',
					'files-filaments',
					'files-system'
				]
			},
			{
				name: 'Plugins',
				icon: 'mdi-puzzle',
				caption: 'menu.plugins.caption',
				pages: []
			},
			{
				name: 'Settings',
				icon: 'mdi-wrench',
				caption: 'menu.settings.caption',
				pages: [
					'settings-general',
					'settings-machine'
				]
			}
		]
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

				if (!(configContents || []).length) return;

				commit('resetMenu', configContents);

				// re-attach the system components
				keyedMenuItems.forEach(c => commit('setMenuItem', c));

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
		setMenuItem (state, { routeObj, routeConfig, namedMenuGroup }) {
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

			if (!placed && namedMenuGroup) {
				// backwards compatibility for existing plugins to inject
				let group = state.mainMenu.find(item => item.name === namedMenuGroup);
				if (group) group.pages.push(routeObj);
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
				console.log(item);
				state.mainMenu.push(item)
			});
		}
	}
}
