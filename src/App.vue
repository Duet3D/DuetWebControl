<style>
#title:not(:hover) {
	color: inherit;
}
#title {
	margin-right: 20px;
}

.empty-table-fix td {
	padding-left: 0px !important;
	padding-right: 0px !important;
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

.v-card__title {
	font-size: 1rem;
}
</style>

<template>
	<v-app>
		<v-navigation-drawer v-model="drawer" clipped fixed app width="300">
			<div class="pa-2 hidden-sm-and-up">
				<connect-btn v-if="isLocal" class="mb-3" block></connect-btn>
				<emergency-btn block></emergency-btn>
			</div>

			<v-list class="pt-0" :expand="$vuetify.breakpoint.mdAndUp">
				<v-list-group v-for="(category, index) in categories" :key="index" :prepend-icon="category.icon" no-action :value="isExpanded(category)">
					<template #activator>
						<v-list-item-title class="mr-0">{{ category.translated ? category.caption : $t(category.caption) }}</v-list-item-title>
					</template>

					<v-list-item v-for="(page, pageIndex) in getPages(category)" :key="`${index}-${pageIndex}`" v-ripple :to="page.path" @click.prevent="">
						<v-list-item-icon>
							<v-icon>{{ page.icon }}</v-icon>
						</v-list-item-icon>
						<v-list-item-title>{{ page.translated ? page.caption : $t(page.caption) }}</v-list-item-title>
					</v-list-item>
				</v-list-group>
			</v-list>
		</v-navigation-drawer>

		<v-app-bar ref="appToolbar" app clipped-left>
			<v-app-bar-nav-icon @click.stop="drawer = !drawer">
				<v-icon>mdi-menu</v-icon>
			</v-app-bar-nav-icon>
			<v-toolbar-title>
				<a href="javascript:void(0)" id="title">{{ name }}</a>
			</v-toolbar-title>
			<connect-btn v-if="isLocal" class="hidden-xs-only"></connect-btn>

			<v-spacer></v-spacer>

			<code-input class="mx-3 hidden-sm-and-down"></code-input>

			<v-spacer></v-spacer>

			<upload-btn target="start" :elevation="1" class="mr-3 hidden-sm-and-down"></upload-btn>
			<emergency-btn class="hidden-xs-only"></emergency-btn>

			<v-btn icon class="hidden-md-and-up ml-3" :class="toggleGlobalContainerColor" @click="hideGlobalContainer = !hideGlobalContainer">
				<v-icon>mdi-aspect-ratio</v-icon>
			</v-btn>
		</v-app-bar>

		<v-main id="content">
			<v-scroll-y-transition>
				<v-container v-show="!hideGlobalContainer || $vuetify.breakpoint.mdAndUp" id="global-container" fluid>
					<v-row>
						<v-col cols="12" sm="6" md="4" lg="4" xl="4">
							<status-panel></status-panel>
						</v-col>

						<v-col cols="12" sm="6" md="5" lg="5" xl="4">
							<tools-panel></tools-panel>
						</v-col>

						<v-col v-if="$vuetify.breakpoint.mdAndUp" :class="{ 'd-flex': hasTemperaturesToDisplay }" md="3" lg="3" xl="4">
							<temperature-chart></temperature-chart>
						</v-col>
					</v-row>
				</v-container>
			</v-scroll-y-transition>

			<v-divider v-show="!hideGlobalContainer || $vuetify.breakpoint.mdAndUp"></v-divider>

			<v-container fluid>
				<keep-alive>
					<router-view></router-view>
				</keep-alive>
			</v-container>
		</v-main>

		<connect-dialog></connect-dialog>
		<connection-dialog></connection-dialog>
		<file-transfer-dialog></file-transfer-dialog>
		<messagebox-dialog></messagebox-dialog>
		<plugin-install-dialog></plugin-install-dialog>

		<component v-for="component in injectedComponentNames" :is="component" :key="component"></component>
	</v-app>
</template>

<script>
'use strict'

import Piecon from 'piecon'
import { mapState, mapGetters, mapActions } from 'vuex'

import { Menu, Routes } from './routes'
import { isPrinting } from './store/machine/modelEnums.js'

export default {
	computed: {
		...mapState({
			isLocal: state => state.isLocal,
			globalShowConnectDialog: state => state.showConnectDialog,

			boards: state => state.machine.model.boards,
			menuDirectory: state => state.machine.model.directories.menu,
			name: state => state.machine.model.network.name,
			status: state => state.machine.model.state.status,

			darkTheme: state => state.settings.darkTheme,
			webcam: state => state.settings.webcam,

			injectedComponents: state => state.uiInjection.injectedComponents
		}),
		...mapGetters('machine', ['hasTemperaturesToDisplay']),
		...mapGetters('machine/model', ['jobProgress']),
		categories() {
			return Object.keys(Menu).map(key => Menu[key]).filter(item => item.condition || item.pages.some(page => page.condition));
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
				if (!flag && route.children != undefined)
					flag = route.children.some(child => checkRoute(child, true));
				return flag;
			};
			return Routes.some(route => checkRoute(route));
		},
		toggleGlobalContainerColor() {
			if (this.hideGlobalContainer) {
				return this.darkTheme ? 'red darken-5' : 'red lighten-4';
			}
			return this.darkTheme ? 'green darken-5' : 'green lighten-4';
		}
	},
	data() {
		return {
			drawer: this.$vuetify.breakpoint.lgAndUp,
			hideGlobalContainer: false,
			wasXs: this.$vuetify.breakpoint.xsOnly,
			injectedComponentNames: []
		}
	},
	methods: {
		...mapActions(['connect', 'disconnectAll']),
		...mapActions('settings', ['load']),
		getPages(category) {
			return category.pages.filter(page => page.condition);
		},
		isExpanded(category) {
			if (this.$vuetify.breakpoint.xsOnly) {
				const route = this.$route;
				return category.pages.some(page => page.path === route.path);
			}
			return true;
		},
		updateTitle() {
			const jobProgress = this.jobProgress;
			const title = ((jobProgress > 0 && isPrinting(this.status)) ? `(${(jobProgress * 100).toFixed(1)}%) ` : '') + this.name;
			if (document.title !== title) {
				document.title = title;
			}
		}
	},
	mounted() {
		// Attempt to disconnect from every machine when the page is being unloaded
		window.addEventListener('unload', this.disconnectAll);

		// Connect if running on a board
		if (!this.isLocal) {
			this.connect();
		}

		// Attempt to load the settings
		this.load();

		// Validate navigation
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
