<style>
#title:not(:hover) {
	color: inherit;
}

.empty-table-fix td {
	padding-left: 0 !important;
	padding-right: 0 !important;
}

.global-control.theme--light {
	background-color: #F5F5F5 !important;
}
#global-container .v-card.theme--light {
	background-color: #F5F5F5 !important;
}
.global-control.theme--dark {
	background-color: #515151 !important;
}
#global-container .v-card.theme--dark {
	background-color: #515151 !important;
}

input[type='number'] {
	-moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
	-webkit-appearance: none;
}

a:not(:hover) {
	text-decoration: none;
}

textarea {
	line-height: 1.25rem !important;
}

.theme--dark textarea {
	caret-color: #FFF;
}

.v-item-group.theme--dark .v-btn__content {
	color: #FFF !important;
}

.v-speed-dial--fixed {
	z-index: 5;
}
</style>

<template>
	<v-app>
		<v-navigation-drawer v-if="!showBottomNavigation" v-model="drawer" clipped fixed app :width="$vuetify.breakpoint.smAndDown ? 275 : 256" :expand-on-hover="iconMenu" :mini-variant="iconMenu">
			<div class="mb-3 hidden-sm-and-up">
				<div class="ma-2">
					<connect-btn v-if="showConnectButton" class="mb-2" block/>
				</div>
				<upload-btn target="start" :elevation="1" class="ma-2" block/>
			</div>

			<v-list class="pt-0" :dense="!$vuetify.breakpoint.smAndDown" :expand="!$vuetify.breakpoint.smAndDown">
				<v-list-group v-for="(category, index) in categories" :key="index" :prepend-icon="category.icon" no-action :value="isExpanded(category)">
					<template #activator>
						<v-list-item-title class="mr-0">
							{{ category.translated ? category.caption : $t(category.caption) }}
						</v-list-item-title>
					</template>

					<v-list-item v-for="(page, pageIndex) in getPages(category)" :key="`${index}-${pageIndex}`" v-ripple :to="page.path" @click.prevent="">
						<v-list-item-icon>
							<v-icon v-text="page.icon"></v-icon>
						</v-list-item-icon>
						<v-list-item-title>
							{{ page.translated ? page.caption : $t(page.caption) }}
						</v-list-item-title>
					</v-list-item>
				</v-list-group>
			</v-list>
		</v-navigation-drawer>

		<v-app-bar ref="appToolbar" app clipped-left>
			<v-app-bar-nav-icon v-show="!showBottomNavigation" @click.stop="drawer = !drawer">
				<v-icon>mdi-menu</v-icon>
			</v-app-bar-nav-icon>
			<v-toolbar-title class="px-1">
				<a href="javascript:void(0)" id="title">{{ name }}</a>
			</v-toolbar-title>
			<connect-btn v-if="showConnectButton" class="hidden-xs-only ml-3"/>

			<v-spacer/>

			<code-input class="mx-3 hidden-sm-and-down"/>

			<v-spacer/>

			<upload-btn target="start" :elevation="1" class="mr-3 hidden-sm-and-down"/>
			<emergency-btn/>
		</v-app-bar>

		<v-main id="content">
			<v-container class="hidden-sm-and-down" id="global-container" fluid>
				<fff-container-panel v-if="isFFForUnset"/>
				<cnc-container-panel v-else/>
			</v-container>

			<v-divider class="hidden-sm-and-down"/>

			<v-container fluid>
				<keep-alive>
					<router-view/>
				</keep-alive>
			</v-container>
		</v-main>

		<notification-display/>

		<v-bottom-navigation v-if="showBottomNavigation" app>
			<v-menu v-for="(category, index) in categories" :key="index" top offset-y>
				<template #activator="{ on }">
					<v-btn v-on="on">
						{{ category.translated ? category.caption : $t(category.caption) }}
						<v-icon v-text="category.icon" class="mb-1"/>
					</v-btn>
				</template>

				<v-list-item v-for="(page, pageIndex) in getPages(category)" :key="`${index}-${pageIndex}`" :to="page.path" @click.prevent="" class="global-control">
					<v-icon v-text="page.icon" class="mr-2"/>
					{{ page.translated ? page.caption : $t(page.caption) }}
				</v-list-item>
			</v-menu>
		</v-bottom-navigation>

		<connect-dialog/>
		<connection-dialog/>
		<file-transfer-dialog/>
		<messagebox-dialog/>
		<plugin-install-dialog/>

		<component v-for="component in injectedComponentNames" :is="component" :key="component"/>
	</v-app>
</template>

<script>
'use strict'

import Vue from 'vue'
import Piecon from 'piecon'
import { mapState, mapGetters, mapActions } from 'vuex'

import { Menu, Routes } from './routes'
import { isPrinting, StatusType } from './store/machine/modelEnums.js'
import { MachineMode } from './store/machine/modelEnums.js';
import { DashboardMode } from './store/settings.js'

export default {
	computed: {
		...mapState({
			boards: state => state.machine.model.boards,
			menuDirectory: state => state.machine.model.directories.menu,
			name: state => state.machine.model.network.name,
			status: state => state.machine.model.state.status,

			darkTheme: state => state.settings.darkTheme,
			webcam: state => state.settings.webcam,
			machineMode: state => state.machine.model.state.machineMode,
			bottomNavigation: state => state.settings.bottomNavigation,
			iconMenu: state => state.settings.iconMenu,

			injectedComponents: state => state.uiInjection.injectedComponents
		}),
		...mapState('settings',['dashboardMode']),
		...mapGetters('machine', ['hasTemperaturesToDisplay']),
		...mapGetters('machine/model', ['jobProgress']),
		categories() {
			return Object.keys(Menu)
				.map(key => Menu[key])
				.filter(item => item.condition || item.pages.some(page => page.condition));
		},
		currentPageCondition() {
			const currentRoute = this.$route;
			let checkRoute = function(route, isChild) {
				let flag = (route.path === currentRoute.path && route.condition);
				if (!flag && isChild) {
					let curPath = currentRoute.path.replace(/\/$/, '');
					if (curPath.endsWith(route.path))
						flag = (curPath.substring(0, curPath.length-route.path.length) + route.path === curPath && route.condition)
				}
				if (!flag && route.children !== undefined) {
					flag = route.children.some(child => checkRoute(child, true));
				}
				return flag;
			};
			return Routes.some(route => checkRoute(route));
		},
		isFFForUnset() {
			if (this.dashboardMode === DashboardMode.default) {
				return !this.machineMode || this.machineMode === MachineMode.fff;
			}
			return this.dashboardMode === DashboardMode.fff;
		},
		showBottomNavigation() {
			return this.$vuetify.breakpoint.mobile && !this.$vuetify.breakpoint.xsOnly && this.bottomNavigation;
		}
	},
	data() {
		return {
			drawer: this.$vuetify.breakpoint.lgAndUp,
			injectedComponentNames: [],
			showConnectButton: process.env.NODE_ENV === 'development'
		}
	},
	methods: {
		...mapActions(['connect', 'disconnectAll']),
		...mapActions('settings', ['load']),
		isExpanded(category) {
			if (this.$vuetify.breakpoint.smAndDown) {
				const route = this.$route;
				return category.pages.some(page => page.path === route.path);
			}
			return true;
		},
		getPages(category) {
			return category.pages.filter(page => page.condition);
		},
		updateTitle() {
			if (this.status === StatusType.disconnected) {
				document.title = `(${this.name})`;
			} else {
				const jobProgress = this.jobProgress;
				const title = ((jobProgress > 0 && isPrinting(this.status)) ? `(${(jobProgress * 100).toFixed(1)}%) ` : '') + this.name;
				if (document.title !== title) {
					document.title = title;
				}
			}
		},
	},
	mounted() {
		// Attempt to disconnect from every machine when the page is being unloaded
		window.addEventListener('unload', this.disconnectAll);

		// Connect if running on a board
		if (process.env.NODE_ENV === 'production') {
			this.connect();
		}

		// Attempt to load the settings
		this.load();

		// Validate navigation
		Vue.prototype.$vuetify = this.$vuetify;
		this.$router.beforeEach((to, from, next) => {
			if (Routes.some(route => route.path === to.path && !route.condition)) {
				next('/');
			} else {
				next();
			}
		});

		// Set up Piecon
		Piecon.setOptions({
			color: '#00f',			// Pie chart color
			background: '#bbb',		// Empty pie chart color
			shadow: '#fff',			// Outer ring color
			fallback: false			// Toggles displaying percentage in the title bar (possible values - true, false, 'force')
		});
	},
	watch: {
		currentPageCondition(to) {
			if (!to) {
				this.$router.push('/');
			}
		},
		darkTheme(to) {
			this.$vuetify.theme.dark = to;
		},
		status(to, from) {
			if (to === StatusType.disconnected || from === StatusType.disconnected) {
				this.updateTitle();
			}

			const printing = isPrinting(to);
			if (printing !== isPrinting(from)) {
				if (printing) {
					// Go to Job Status when a print starts
					if (this.$router.currentRoute.path !== '/Job/Status') {
						this.$router.push('/Job/Status');
					}
				} else {
					// Remove the Piecon again when the print has finished
					Piecon.reset();
				}
			}
		},
		name() { this.updateTitle(); },
		jobProgress(to, from) {
			if (isPrinting(this.status) && Math.round(to * 100) !== Math.round(from * 100)) {
				Piecon.setProgress(to * 100);
			}
			this.updateTitle();
		},
		injectedComponents() {
			this.injectedComponents.forEach(function(item) {
				if (this.injectedComponentNames.indexOf(item.name) === -1) {
					this.$options.components[item.name] = item.component;
					this.injectedComponentNames.push(item.name);
				}
			}, this);
		}
	}
}
</script>
