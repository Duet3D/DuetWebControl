<style>
#title:not(:hover) {
	color: inherit;
}
#title {
	margin-right: 20px;
}

.container {
	padding: 4px;
}
.container div.component,
.container div.v-card {
	margin: 8px;
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
</style>

<template>
	<v-app :dark="darkTheme">
		<v-navigation-drawer persistent clipped v-model="drawer" enable-resize-watcher fixed app>
			<div class="pa-2 hidden-sm-and-up">
				<connect-btn v-if="isLocal" class="mb-3" block></connect-btn>
				<emergency-btn block></emergency-btn>
			</div>

			<v-list class="pt-0" :expand="$vuetify.breakpoint.mdAndUp">
				<v-list-group v-for="(category, index) in routing" :key="index" :prepend-icon="category.icon" no-action :value="isExpanded(category)">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t(category.caption) }}</v-list-tile-title>
					</v-list-tile>

					<template v-for="(page, pageIndex) in category.pages">
						<v-list-tile v-if="checkMenuCondition(page.condition)" :key="`${index}-${pageIndex}`" v-ripple :to="page.path" @click.prevent>
							<v-list-tile-action>
								<v-icon>{{ page.icon }}</v-icon>
							</v-list-tile-action>
							<v-list-tile-title>{{ $t(page.caption) }}</v-list-tile-title>
						</v-list-tile>
					</template>
				</v-list-group>
			</v-list>
		</v-navigation-drawer>

		<v-toolbar ref="appToolbar" app clipped-left>
			<v-toolbar-side-icon @click.stop="drawer = !drawer" v-tab-control></v-toolbar-side-icon>
			<v-toolbar-title>
				<!-- TODO: Optional OEM branding -->
				<a id="title" v-tab-control>{{ name }}</a>
			</v-toolbar-title>
			<connect-btn v-if="isLocal" class="hidden-xs-only"></connect-btn>

			<v-spacer></v-spacer>

			<code-input class="hidden-sm-and-down"></code-input>

			<v-spacer></v-spacer>

			<upload-btn target="start" class="hidden-sm-and-down"></upload-btn>
			<emergency-btn class="hidden-xs-only"></emergency-btn>

			<v-btn icon class="hidden-md-and-up" :class="toggleGlobalContainerColor" @click="hideGlobalContainer = !hideGlobalContainer">
				<v-icon>aspect_ratio</v-icon>
			</v-btn>
			<!-- TODO: Add quick actions and UI designer here -->
			<!--<v-btn icon class="hidden-sm-and-down" @click="rightDrawer = !rightDrawer">
				<v-icon>menu</v-icon>
			</v-btn>-->
		</v-toolbar>

		<v-content id="content">
			<v-scroll-y-transition>
				<v-container fluid id="global-container" class="container" v-show="!hideGlobalContainer || $vuetify.breakpoint.mdAndUp">
					<v-layout row wrap>
						<v-flex xs12 sm6 md4 lg4>
							<status-panel></status-panel>
						</v-flex>

						<v-flex xs12 sm6 md5 lg4>
							<tools-panel></tools-panel>
						</v-flex>

						<v-flex v-if="$vuetify.breakpoint.mdAndUp" d-flex md3 lg4>
							<temperature-chart></temperature-chart>
						</v-flex>
					</v-layout>
				</v-container>
			</v-scroll-y-transition>

			<v-divider v-show="!hideGlobalContainer || $vuetify.breakpoint.mdAndUp"></v-divider>

			<v-container fluid id="page-container" class="container">
				<keep-alive>
					<router-view></router-view>
				</keep-alive>
			</v-container>
		</v-content>

		<!--<v-navigation-drawer temporary right v-model="rightDrawer" fixed app>
			TODO Add quick access / component list here in design mode
		</v-navigation-drawer>-->

		<connect-dialog></connect-dialog>
		<connection-dialog></connection-dialog>
		<messagebox-dialog></messagebox-dialog>
	</v-app>
</template>

<script>
'use strict'

import Piecon from 'piecon'
import { mapState, mapGetters, mapActions } from 'vuex'

import { Routing } from './routes'

export default {
	computed: {
		...mapState({
			isLocal: state => state.isLocal,
			globalShowConnectDialog: state => state.showConnectDialog,

			isPrinting: state => state.machine.model.state.isPrinting,
			name: state => state.machine.model.network.name,

			darkTheme: state => state.settings.darkTheme,
			webcam: state => state.settings.webcam
		}),
		...mapGetters('machine/model', ['board', 'jobProgress']),
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
			rightDrawer: false,
			routing: Routing,
			wasXs: this.$vuetify.breakpoint.xsOnly
		}
	},
	methods: {
		...mapActions(['connect', 'disconnectAll']),
		...mapActions('settings', ['load']),
		checkMenuCondition(condition) {
			if (condition === 'webcam') {
				return (this.webcam.url !== '');
			}
			if (condition === 'display') {
				return this.board.hasDisplay;
			}
			return true;
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
			const title = ((jobProgress > 0 && this.isPrinting) ? `(${(jobProgress * 100).toFixed(1)}%) ` : '') + this.name;
			if (document.title !== title) {
				document.title = title;
			}
		}
	},
	mounted() {
		// Attempt to disconnect from every machine when the page is being unloaded
		window.addEventListener('onunload', this.disconnectAll);

		// Connect if running on a board
		if (!this.isLocal) {
			this.connect();
		}

		// Attempt to load the settings
		this.load();

		// Validate navigation
		const that = this;
		this.$router.beforeEach((to, from, next) => {
			if (Routing.some(group => group.pages.some(page => page.path === to.path && !that.checkMenuCondition(page.condition)))) {
				next('/');
			} else {
				next();
			}
		});

		const route = this.$route;
		if (Routing.some(group => group.pages.some(page => page.path === route.path && !this.checkMenuCondition(page.condition)))) {
			this.$router.push('/');
		}

		// Set up Piecon
		Piecon.setOptions({
			color: '#00f',			// Pie chart color
			background: '#bbb',		// Empty pie chart color
			shadow: '#fff',			// Outer ring color
			fallback: false			// Toggles displaying percentage in the title bar (possible values - true, false, 'force')
		});
	},
	watch: {
		isPrinting(to) {
			if (to) {
				// Go to Job Status when a print starts
				this.$router.push('/Job/Status');
			}
		},
		name() { this.updateTitle(); },
		jobProgress(to) {
			if (to === undefined || to == 1) {
				Piecon.reset();
			} else {
				Piecon.setProgress(to * 100);
			}
			this.updateTitle();
		}
	}
}
</script>
