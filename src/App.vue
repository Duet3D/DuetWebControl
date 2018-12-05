<style>
.vue-grid-item > * {
	height: auto !important;
}

#title:not(:hover) {
	color: inherit;
}
#title {
	margin-right: 20px;
}

input[type='number'] {
    -moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
}
</style>

<template>
	<v-app>
		<v-navigation-drawer persistent clipped v-model="drawer" enable-resize-watcher fixed app>
			<v-list class="pt-0" expand>
				<!-- This static content is only temporary and will be replaced by v-for directives as soon as the UI designer is ready -->
				<v-list-group prepend-icon="tune" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.control.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/" @click="">
						<v-list-tile-action>
							<v-icon>dashboard</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.control.dashboard') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Console" @click="">
						<v-list-tile-action>
							<v-icon>code</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.control.console') }}</v-list-tile-title>
					</v-list-tile>
				</v-list-group>

				<v-list-group prepend-icon="print" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.job.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Job/Status" @click="">
						<v-list-tile-action>
							<v-icon>info</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.job.status') }}</v-list-tile-title>
					</v-list-tile>

					<!--<v-list-tile v-ripple to="/Job/Visualiser" @click="">
						<v-list-tile-action>
							<v-icon>theaters</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.job.visualiser') }}</v-list-tile-title>
					</v-list-tile>-->
				</v-list-group>
				
				<v-list-group prepend-icon="sd_storage" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.files.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Files/Jobs" @click="">
						<v-list-tile-action>
							<v-icon>play_arrow</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.jobs') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Files/Macros" @click="">
						<v-list-tile-action>
							<v-icon>polymer</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.macros') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Files/Filaments" @click="">
						<v-list-tile-action>
							<v-icon>radio_button_checked</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.filaments') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Files/System" @click="">
						<v-list-tile-action>
							<v-icon>settings</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.system') }}</v-list-tile-title>
					</v-list-tile>
					
					<v-list-tile v-ripple to="/Files/Web" @click="">
						<v-list-tile-action>
							<v-icon>cloud</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.files.web') }}</v-list-tile-title>
					</v-list-tile>
				</v-list-group>

				<v-list-group prepend-icon="settings" no-action value="true">
					<v-list-tile slot="activator">
						<v-list-tile-title>{{ $t('menu.settings.caption') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Settings/Interface" @click="">
						<v-list-tile-action>
							<v-icon>devices</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.settings.interface') }}</v-list-tile-title>
					</v-list-tile>

					<v-list-tile v-ripple to="/Settings/Machine" @click="">
						<v-list-tile-action>
							<v-icon>router</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.settings.machine') }}</v-list-tile-title>
					</v-list-tile>

					<!--<v-list-tile v-ripple to="/Settings/Update" @click="">
						<v-list-tile-action>
							<v-icon>update</v-icon>
						</v-list-tile-action>
						<v-list-tile-title>{{ $t('menu.settings.update') }}</v-list-tile-title>
					</v-list-tile>-->
				</v-list-group>
			</v-list>
		</v-navigation-drawer>

		<v-toolbar app clipped-left>
			<v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
			<v-toolbar-title>
				<!-- TODO: Optional OEM branding -->
				<a id="title">{{ name }}</a>
			</v-toolbar-title>
			<connect-btn></connect-btn>

			<v-spacer></v-spacer>

			<code-input class="hidden-sm-and-down mt-3"></code-input>

			<v-spacer></v-spacer>

			<upload-btn target="gcodeStart" class="hidden-sm-and-down"></upload-btn>
			<emergency-btn></emergency-btn>

			<!-- TODO: Add quick actions and UI designer here -->
			<!--<v-btn icon class="hidden-xs" @click="rightDrawer = !rightDrawer">
				<v-icon>menu</v-icon>
			</v-btn>-->
		</v-toolbar>

		<v-content>
			<base-grid>
				<dynamic-grid-item :xs="[0, 0, 24, 11]" :sm="[0, 0, 12, 11]" :md="[0, 0, 8, 11]" :lg="[0, 0, 8, 11]">
					<status-panel></status-panel>
				</dynamic-grid-item>
				<dynamic-grid-item :xs="[8, 0, 24, 11]" :sm="[12, 0, 12, 11]" :md="[8, 0, 10, 11]" :lg="[8, 0, 8, 11]">
					<tools-panel></tools-panel>
				</dynamic-grid-item>
				<dynamic-grid-item xs="hidden" sm="hidden" :md="[18, 0, 6, 11]" :lg="[16, 0, 8, 11]">
					<temperature-chart></temperature-chart>
				</dynamic-grid-item>
			</base-grid>

			<v-divider></v-divider>

			<router-view></router-view>
		</v-content>

		<v-navigation-drawer temporary right v-model="rightDrawer" fixed app>
			<!-- In design mode: Add component list here -->
		</v-navigation-drawer>

		<v-footer app>
			<span class="ml-3">&copy; 2018 Christian Hammacher for Duet3D</span>
		</v-footer>
	</v-app>
</template>

<script>
'use strict'

import { mapGetters, mapState, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters(['isLocal']),
		...mapState({
			name: state => state.machine.network.name,
			uiDesignMode: state => state.ui.designMode
		}),
		designMode: {
			get() { return this.uiDesignMode; },
			set(value) { this.setDesignMode(value); }
		}
	},
	methods: {
		...mapMutations('ui', ['setDesignMode']),
		foo() { this.$store.commit('machine/test'); }
	},
	data() {
		return {
			drawer: this.$vuetify.breakpoint.lgAndUp,
			rightDrawer: false
		}
	}
}
</script>
