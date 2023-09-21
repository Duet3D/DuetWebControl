<template>
	<v-app :theme="darkTheme ? 'dark' : 'light'">
		<v-navigation-drawer v-if="!showBottomNavigation" v-model="drawer" clipped fixed app
							 :width="$vuetify.display.smAndDown ? 275 : 256" :expand-on-hover="iconMenu"
							 :mini-variant="iconMenu" :style="`padding-bottom: ${bottomMargin}px`">
			<div class="mb-3 hidden-sm-and-up">
				<div class="ma-2">
					<connect-btn v-if="showConnectButton" class="mb-2" block />
				</div>
				<upload-btn target="start" :elevation="1" class="ma-2" block />
			</div>

			<v-list class="pt-0" :dense="!$vuetify.display.smAndDown" :expand="!$vuetify.display.smAndDown">
				<v-list-group v-for="(category, index) in categories" :key="index" :prepend-icon="category.icon"
							  no-action :value="isExpanded(category)">
					<template #activator>
						<v-list-item-title class="mr-0">
							{{ category.translated ? category.caption : $t(category.caption) }}
						</v-list-item-title>
					</template>

					<v-list-item v-for="(page, pageIndex) in getPages(category)" :key="`${index}-${pageIndex}`" v-ripple
								 :to="page.path" @click.prevent="">
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
				<a href="javascript:void(0)" id="title">
					{{ name }}
				</a>
			</v-toolbar-title>
			<connect-btn v-if="showConnectButton" class="hidden-xs-only ml-3" />

			<v-spacer />

			<code-input class="mx-3 hidden-sm-and-down" />

			<v-spacer />

			<upload-btn target="start" :elevation="1" class="mr-3 hidden-sm-and-down" />
			<emergency-btn />
		</v-app-bar>

		<v-main id="content" :style="`margin-bottom: ${bottomMargin}px`">
			<v-container class="hidden-sm-and-down" id="global-container" fluid>
				<fff-container-panel v-if="isFFF" />
				<cnc-container-panel v-else />
			</v-container>

			<v-divider class="hidden-sm-and-down" />

			<v-container fluid>
				<keep-alive>
					<router-view />
				</keep-alive>
			</v-container>
		</v-main>

		<notification-display />

		<v-bottom-navigation v-if="showBottomNavigation" app>
			<v-menu v-for="(category, index) in categories" :key="index" top offset-y>
				<template #activator="{ on }">
					<v-btn v-on="on">
						{{ category.translated ? category.caption : $t(category.caption) }}
						<v-icon v-text="category.icon" class="mb-1" />
					</v-btn>
				</template>

				<v-list-item v-for="(page, pageIndex) in getPages(category)" :key="`${index}-${pageIndex}`"
							 :to="page.path" @click.prevent="" class="global-control">
					<v-icon v-text="page.icon" class="mr-2" />
					{{ page.translated ? page.caption : $t(page.caption) }}
				</v-list-item>
			</v-menu>
		</v-bottom-navigation>

		<connect-dialog />
		<connection-dialog />
		<file-transfer-dialog />
		<message-box-dialog />
		<plugin-install-dialog />
		<incompatible-versions-dialog />

		<component v-for="component in injectedComponentNames" :is="component" :key="component" />
	</v-app>
</template>

<script lang="ts">
import { MachineStatus } from "@duet3d/objectmodel";
import Piecon from "piecon";
import { mapState } from "pinia";
import { defineComponent } from "vue";

import { Menu, MenuCategory, MenuItem, Routes } from "@/routes";
import { isPrinting } from "@/utils/enums";
import { LogType } from "@/utils/logging";
import { useMachineStore } from "@/store/machine";
import { useSettingsStore } from "@/store/settings";
import { useUiStore } from "@/store/ui";

export default defineComponent({
	computed: {
		...mapState(useMachineStore, {
			name: state => state.model.network.name,
			isConnecting: state => state.isConnecting || state.isReconnecting,
			machineMode: state => state.model.state.machineMode,
			jobProgress: state => state.jobProgress,
			status: state => state.model.state.status,
		}),
		...mapState(useSettingsStore, ["bottomNavigation", "darkTheme", "dashboardMode", "iconMenu"]),
		...mapState(useUiStore, ["bottomMargin", "injectedComponents", "isFFF"]),
		categories(): Array<MenuCategory> {
			return Object.keys(Menu)
				.map(key => Menu[key])
				.filter(item => item.pages.some(page => page.condition));
		},
		currentPageCondition(): boolean {
			const currentRoute = this.$route;
			let checkRoute = (route: MenuItem, isChild = false) => {
				let flag = (route.path === currentRoute.path && route.condition);
				if (!flag && isChild) {
					let curPath = currentRoute.path.replace(/\/$/, "");
					if (curPath.endsWith(route.path))
						flag = (curPath.substring(0, curPath.length - route.path.length) + route.path === curPath && route.condition)
				}
				return flag;
			};
			return Routes.some(route => checkRoute(route as MenuItem));
		},
		showBottomNavigation(): boolean {
			return this.$vuetify.display.mobile && !this.$vuetify.display.xs && this.bottomNavigation;
		}
	},
	data() {
		return {
			drawer: true, // this.$vuetify.display.lgAndUp,
			injectedComponentNames: new Array<string>(),
			showConnectButton: process.env.NODE_ENV === "development"
		};
	},
	methods: {
		isExpanded(category: MenuCategory): boolean {
			if (this.$vuetify.display.smAndDown) {
				const route = this.$route;
				return category.pages.some(page => page.path === route.path);
			}
			return true;
		},
		getPages(category: MenuCategory): Array<MenuItem> {
			return category.pages.filter(page => page.condition);
		},
		updateTitle(): void {
			if (this.status === MachineStatus.disconnected) {
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
		window.addEventListener("unload", () => {
			const machineStore = useMachineStore();
			if (machineStore.isConnected) {
				machineStore.disconnect();
			}
		});

		// Connect if running on a board
		const machineStore = useMachineStore();
		if (process.env.NODE_ENV === "production") {
			machineStore.connect();
		}

		// Attempt to load the settings
		const settingsStore = useSettingsStore();
		settingsStore.load();

		// Set up Piecon
		Piecon.setOptions({
			color: "#00f",			// Pie chart color
			background: "#bbb",		// Empty pie chart color
			shadow: "#fff",			// Outer ring color
			fallback: false			// Toggles displaying percentage in the title bar (possible values - true, false, 'force')
		});
	},
	watch: {
		currentPageCondition(to: boolean) {
			if (!to) {
				this.$router.push("/");
			}
		},
		isConnecting(to: boolean) {
			const machineStore = useMachineStore();
			if (!to && machineStore.model.volumes.length > 0) {
				const firstVolume = machineStore.model.volumes[0];
				if (firstVolume.capacity !== null && firstVolume.freeSpace !== null &&
					firstVolume.capacity > 268435456 && (firstVolume.freeSpace as number) / (firstVolume.capacity as number) < 0.05)		// 256 MiB
				{
					// Report a warning if less than 5% free space is available
					this.$log(LogType.warning, this.$t("notification.freeSpaceWarning.title"), this.$t("notification.freeSpaceWarning.message"));
				}
			}
		},
		status(to: MachineStatus, from: MachineStatus) {
			if (to === MachineStatus.disconnected || from === MachineStatus.disconnected) {
				this.updateTitle();
			}

			const printing = isPrinting(to);
			if (printing !== isPrinting(from)) {
				if (printing) {
					// Go to Job Status when a print starts
					const settingsStore = useSettingsStore();
					if (this.$router.currentRoute.value.path !== "/Job/Status" && !settingsStore.behaviour.jobStart) {
						this.$router.push("/Job/Status");
					}
				} else {
					// Remove the Piecon again when the print has finished
					Piecon.reset();
				}
			}
		},
		name() { this.updateTitle(); },
		jobProgress(to: number, from: number) {
			if (isPrinting(this.status) && Math.round(to * 100) !== Math.round(from * 100)) {
				Piecon.setProgress(to * 100);
			}
			this.updateTitle();
		},
		injectedComponents() {
			for (const item of this.injectedComponents) {
				if (!this.injectedComponentNames.includes(item.name)) {
					(this.$options as any).components[item.name] = item.component;
					this.injectedComponentNames.push(item.name);
				}
			}
		}
	}
});
</script>
