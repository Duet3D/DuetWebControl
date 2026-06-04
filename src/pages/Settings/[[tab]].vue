<route lang="json">
{
	"meta": {
		"pageFill": true,
		"menu": {
			"category": "preferences",
			"icon": "mdi-wrench",
			"caption": "menu.preferences.settings",
			"order": 10,
			"path": "/Settings"
		}
	}
}
</route>

<style scoped>
.settings-card {
	display: flex;
	flex-direction: column;
	height: 100%;
}
.settings-window {
	flex: 1;
	overflow-y: auto;
}
.settings-window :deep(.v-window__container) {
	height: 100%;
}
.settings-window :deep(.v-window-item) {
	position: static !important;
}
</style>

<template>
	<div class="route-root">
		<div class="settings-page dwc-page-fill">
		<v-card class="settings-card">
			<v-tabs v-model="activeTab" align-tabs="start" show-arrows :density="tabsDensity">
				<v-tab v-for="tab in allTabs" :key="tab.key" :value="tab.key" class="text-none">
					<v-icon size="small" class="mr-2">{{ tab.icon }}</v-icon>
					{{ tab.translated ? tab.caption : $t(tab.caption) }}
				</v-tab>
			</v-tabs>

			<v-window v-model="activeTab" :touch="false" :transition="false" :reverse-transition="false" class="settings-window">
				<v-window-item value="General" eager>
					<v-container fluid>
						<v-row density="compact">
							<v-col cols="12" md="6" class="d-flex flex-column ga-3">
								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-database</v-icon>
										{{ $t("settings.storage.caption") }}
									</v-card-title>
									<v-card-text>
										<div class="d-flex align-center">
											<v-switch v-model="settingsStore.settingsStorageLocal" color="primary"
													  :disabled="!supportsLocalStorage"
													  :label="$t('settings.storage.settingsStorageLocal')"
													  v-hint="$t('settings.storage.settingsStorageLocalHint')"
													  density="comfortable" hide-details />
											<v-spacer />
											<v-btn v-if="!settingsStore.settingsStorageLocal && machineStore.isConnected"
												   variant="text" size="small" density="comfortable"
												   prepend-icon="mdi-refresh" :loading="reloadingSettings"
												   :title="$t('settings.storage.reloadSettingsHint')"
												   @click="reloadSettings">
												{{ $t("settings.storage.reload") }}
											</v-btn>
										</div>
										<div class="d-flex align-center">
											<v-switch v-model="settingsStore.cacheStorageLocal" color="primary"
													  :disabled="!supportsLocalStorage"
													  :label="$t('settings.storage.cacheStorageLocal')"
													  v-hint="$t('settings.storage.cacheStorageLocalHint')"
													  density="comfortable" hide-details />
											<v-spacer />
											<v-btn v-if="!settingsStore.cacheStorageLocal && machineStore.isConnected"
												   variant="text" size="small" density="comfortable"
												   prepend-icon="mdi-refresh" :loading="reloadingCache"
												   :title="$t('settings.storage.reloadCacheHint')"
												   @click="reloadCache">
												{{ $t("settings.storage.reload") }}
											</v-btn>
										</div>
										<v-row density="compact" class="mt-4">
											<v-col cols="6">
												<v-text-field v-model.number="settingsSaveDelayMs" type="number" min="0" step="100"
															  :label="$t('settings.storage.settingsSaveDelay')"
															  v-hint="$t('settings.storage.settingsSaveDelayHint')"
															  variant="outlined" density="comfortable" hide-details
															  suffix="ms" />
											</v-col>
											<v-col cols="6">
												<v-text-field v-model.number="cacheSaveDelayMs" type="number" min="0" step="100"
															  :label="$t('settings.storage.cacheSaveDelay')"
															  v-hint="$t('settings.storage.cacheSaveDelayHint')"
															  variant="outlined" density="comfortable" hide-details
															  suffix="ms" />
											</v-col>
										</v-row>
									</v-card-text>
								</v-card>

								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-account-cog</v-icon>
										{{ $t("settings.behaviour.caption") }}
									</v-card-title>
									<v-card-text>
										<v-switch v-model="settingsStore.behaviour.switchToJobOnPrintStart" color="primary"
												  :label="$t('settings.behaviour.switchToJobOnPrintStart')"
												  v-hint="$t('settings.behaviour.switchToJobOnPrintStartHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.checkVersions" color="primary"
												  :label="$t('settings.behaviour.checkVersions')"
												  v-hint="$t('settings.behaviour.checkVersionsHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.behaviour.autoScroll" color="primary"
												  :label="$t('settings.behaviour.autoScroll')"
												  v-hint="$t('settings.behaviour.autoScrollHint')"
												  density="comfortable" hide-details />
									</v-card-text>
								</v-card>
							</v-col>

							<v-col cols="12" md="6" class="d-flex flex-column ga-3">
								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-lan</v-icon>
										{{ $t("settings.communication.caption") }}
									</v-card-title>
									<v-alert v-if="!isPollConnector && !isRestConnector" type="info" variant="tonal" tile>
										{{ $t("settings.communication.unavailable") }}
									</v-alert>
									<v-card-text v-else-if="isRestConnector" class="pt-4">
										<v-row density="compact">
											<v-col cols="12" sm="6">
												<v-text-field v-model.number="settingsStore.pingInterval" type="number"
															  :label="$t('settings.communication.pingInterval')"
															  v-hint="$t('settings.communication.pingIntervalHint')"
															  variant="outlined" density="comfortable" hide-details
															  min="0" suffix="ms" />
											</v-col>
											<v-col cols="12" sm="6">
												<v-text-field v-model.number="settingsStore.updateDelay" type="number"
															  :label="$t('settings.communication.updateDelay')"
															  v-hint="$t('settings.communication.updateDelayHint')"
															  variant="outlined" density="comfortable" hide-details
															  min="0" suffix="ms" />
											</v-col>
										</v-row>
									</v-card-text>
									<v-card-text v-else class="pt-4">
										<v-row density="compact">
											<v-col cols="12" sm="6">
												<v-text-field v-model.number="settingsStore.maxRetries" type="number"
															  :label="$t('settings.communication.maxRetries')"
															  v-hint="$t('settings.communication.maxRetriesHint')"
															  variant="outlined" density="comfortable" hide-details
															  min="0" />
											</v-col>
											<v-col cols="12" sm="6">
												<v-text-field v-model.number="settingsStore.retryDelay" type="number"
															  :label="$t('settings.communication.retryDelay')"
															  v-hint="$t('settings.communication.retryDelayHint')"
															  variant="outlined" density="comfortable" hide-details
															  min="0" suffix="ms" />
											</v-col>
											<v-col cols="12" sm="6">
												<v-text-field v-model.number="settingsStore.updateInterval" type="number"
															  :label="$t('settings.machine.updateInterval')"
															  v-hint="$t('settings.machine.updateIntervalHint')"
															  variant="outlined" density="comfortable" hide-details
															  min="0" suffix="ms" />
											</v-col>
											<v-col cols="12" sm="6">
												<v-text-field v-model.number="fileTransferRetryThresholdKiB"
															  type="number"
															  :label="$t('settings.communication.retryThreshold')"
															  v-hint="$t('settings.communication.retryThresholdHint')"
															  variant="outlined" density="comfortable" hide-details
															  min="1" suffix="KiB" />
											</v-col>
										</v-row>
										<v-switch v-model="settingsStore.ignoreFileTimestamps" color="primary"
												  :label="$t('settings.communication.ignoreFileTimestamps')"
												  v-hint="$t('settings.communication.ignoreFileTimestampsHint')"
												  density="comfortable" hide-details class="mt-2" />
										<v-switch v-model="settingsStore.crcUploads" color="primary"
												  :label="$t('settings.machine.crcUploads')"
												  v-hint="$t('settings.machine.crcUploadsHint')"
												  density="comfortable" hide-details />
									</v-card-text>
								</v-card>

								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-bell</v-icon>
										{{ $t("settings.notifications.caption") }}
									</v-card-title>
									<v-card-text>
										<v-switch v-model="settingsStore.notifications.errorsPersistent" color="primary"
												  :label="$t('settings.notifications.errorsPersistent')"
												  v-hint="$t('settings.notifications.errorsPersistentHint')"
												  density="comfortable" hide-details />
										<v-text-field v-model.number="settingsStore.notifications.timeout" type="number" min="1000"
													  :label="$t('settings.notifications.timeout')"
													  v-hint="$t('settings.notifications.timeoutHint')"
													  variant="outlined" density="comfortable" hide-details
													  class="mt-4" suffix="ms" />
									</v-card-text>
								</v-card>
							</v-col>
						</v-row>
					</v-container>
				</v-window-item>

				<v-window-item value="Display" eager>
					<v-container fluid>
						<v-row density="compact">
							<v-col cols="12" md="6" class="d-flex flex-column ga-3">
								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-palette</v-icon>
										{{ $t("settings.appearance.caption") }}
									</v-card-title>
									<v-card-text>
										<v-switch v-model="settingsStore.darkTheme" color="primary"
												  :label="$t('settings.appearance.darkTheme')"
												  v-hint="$t('settings.appearance.darkThemeHint')"
												  density="comfortable" hide-details />
										<v-select :model-value="settingsStore.locale" :items="languageOptions"
												  item-title="label" item-value="value"
												  :label="$t('settings.appearance.language')"
												  v-hint="$t('settings.appearance.languageHint')"
												  variant="outlined" density="comfortable" hide-details class="mt-4"
												  @update:model-value="(value) => settingsStore.setLocale(value as Locale)" />
									</v-card-text>
								</v-card>

								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-view-dashboard</v-icon>
										{{ $t("settings.display.layoutCaption") }}
									</v-card-title>
									<v-card-text class="pt-4">
										<v-select v-model="settingsStore.dashboardMode" :items="dashboardModeOptions"
												  item-title="label" item-value="value"
												  :label="$t('settings.display.dashboardMode')"
												  v-hint="$t('settings.display.dashboardModeHint')"
												  variant="outlined" density="comfortable" hide-details />
										<v-switch v-model="settingsStore.iconMenu" color="primary"
												  :label="$t('settings.display.iconMenu')"
												  v-hint="$t('settings.display.iconMenuHint')"
												  density="comfortable" hide-details class="mt-4" />
										<v-switch v-model="settingsStore.enablePanelEditing" color="primary"
												  :label="$t('settings.display.enablePanelEditing')"
												  v-hint="$t('settings.display.enablePanelEditingHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.largeButtons" color="primary"
												  v-hint="$t('settings.display.largeButtonsHint')"
												  density="comfortable" hide-details>
											<template #label>
												{{ $t("settings.display.largeButtons") }}
												<v-chip size="x-small" variant="tonal" color="info" class="ml-2"
														v-hint="$t('settings.display.largeButtonsSmOnlyHint')">
													{{ $t("settings.display.largeButtonsSmOnly") }}
												</v-chip>
											</template>
										</v-switch>
										<v-switch v-model="settingsStore.showEmergencyStop" color="primary"
												  :label="$t('settings.display.showEmergencyStop')"
												  v-hint="$t('settings.display.showEmergencyStopHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.disableAutoComplete" color="primary"
												  :label="$t('settings.display.disableAutoComplete')"
												  v-hint="$t('settings.display.disableAutoCompleteHint')"
												  density="comfortable" hide-details />
										<v-select v-if="registeredThemes.length > 0"
												  v-model="settingsStore.themeName"
												  :items="themeItems" item-title="title" item-value="value"
												  :label="$t('settings.display.theme')"
												  v-hint="$t('settings.display.themeHint')"
												  variant="outlined" density="comfortable" hide-details class="mt-4" />
										<v-btn v-if="registeredLayout && !registeredLayoutOptions?.locked"
											   variant="tonal" class="mt-4" @click="onSwitchLayoutClick">
											{{ switchLayoutLabel }}
										</v-btn>
									</v-card-text>
								</v-card>
							</v-col>

							<v-col cols="12" md="6" class="d-flex flex-column ga-3">
								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-counter</v-icon>
										{{ $t("settings.units.caption") }}
									</v-card-title>
									<v-card-text class="pt-4">
										<v-row density="compact">
											<v-col cols="6">
												<v-select v-model="settingsStore.displayUnits" :items="displayUnitOptions"
														  item-title="label" item-value="value"
														  :label="$t('settings.units.displayUnits')"
														  v-hint="$t('settings.units.displayUnitsHint')"
														  variant="outlined" density="comfortable" hide-details />
											</v-col>
											<v-col cols="6">
												<v-select v-model.number="settingsStore.decimalPlaces" :items="decimalPlaceOptions"
														  :label="$t('settings.units.decimalPlaces')"
														  v-hint="$t('settings.units.decimalPlacesHint')"
														  variant="outlined" density="comfortable" hide-details />
											</v-col>
										</v-row>
										<v-switch v-model="settingsStore.useBinaryPrefix" color="primary"
												  :label="$t('settings.units.binaryPrefix')"
												  v-hint="$t('settings.units.binaryPrefixHint')"
												  density="comfortable" hide-details class="mt-2" />
									</v-card-text>
								</v-card>

								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-eye-off</v-icon>
										{{ $t("settings.display.hideMenuItemsCaption") }}
									</v-card-title>
									<v-card-text>
										<div class="text-body-small text-medium-emphasis mb-2">
											{{ $t("settings.display.hideMenuItemsHint") }}
										</div>
										<v-switch v-for="item in hideableMenuItems" :key="item.path"
												  v-model="hiddenMenuPaths" :value="item.path" color="primary"
												  v-hint="$t('settings.display.hideMenuItemSwitchHint')"
												  density="comfortable" hide-details>
											<template #label>
												<v-icon size="small" class="mr-2">{{ item.icon }}</v-icon>
												{{ item.translated ? item.caption : $t(item.caption) }}
												<span class="text-medium-emphasis ml-2">{{ item.path }}</span>
												<v-chip v-if="item.conditionKey === 'xsOrSm'" size="x-small"
														variant="tonal" color="info" class="ml-2"
														v-hint="$t('settings.display.hideMenuItemsXsSmOnlyHint')">
													{{ $t("settings.display.hideMenuItemsXsSmOnly") }}
												</v-chip>
											</template>
										</v-switch>
									</v-card-text>
								</v-card>
							</v-col>
						</v-row>
					</v-container>
				</v-window-item>

				<v-window-item value="Presets" eager>
					<v-container fluid>
						<v-row density="compact">
							<v-col cols="12" class="d-flex flex-column ga-3">
								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-format-list-numbered</v-icon>
										{{ $t("settings.presets.caption") }}
									</v-card-title>
									<v-card-text>
										<v-tabs v-model="presetsTab" align-tabs="start" density="compact">
											<v-tab value="tool" class="text-none">
												{{ $t("settings.presets.toolTemperatures") }}
											</v-tab>
											<v-tab value="bed" class="text-none">
												{{ $t("settings.presets.bedTemperatures") }}
											</v-tab>
											<v-tab value="chamber" class="text-none">
												{{ $t("settings.presets.chamberTemperatures") }}
											</v-tab>
											<v-tab value="spindleRPM" class="text-none">
												{{ $t("settings.presets.spindleRPM") }}
											</v-tab>
										</v-tabs>
										<v-window v-model="presetsTab" :touch="false" class="mt-3">
											<v-window-item value="tool">
												<ListEditor item-key="tool" temperature />
											</v-window-item>
											<v-window-item value="bed">
												<ListEditor item-key="bed" temperature />
											</v-window-item>
											<v-window-item value="chamber">
												<ListEditor item-key="chamber" temperature />
											</v-window-item>
											<v-window-item value="spindleRPM">
												<ListEditor item-key="spindleRPM" />
											</v-window-item>
										</v-window>
									</v-card-text>
								</v-card>

							</v-col>

						</v-row>
					</v-container>
				</v-window-item>

				<v-window-item value="Webcam" eager>
					<v-container fluid>
						<v-switch v-model="settingsStore.webcam.enabled" color="primary"
								  :label="$t('settings.webcam.enabled')"
								  v-hint="$t('settings.webcam.enabledHint')"
								  density="comfortable" hide-details />
						<v-row density="compact" class="mt-2">
							<v-col cols="12" lg="6">
								<v-text-field v-model="settingsStore.webcam.url"
											  :label="$t('settings.webcam.url')"
											  v-hint="$t('settings.webcam.urlHint')"
											  variant="outlined" density="comfortable" hide-details />
							</v-col>
							<v-col cols="12" lg="6">
								<v-text-field v-model="settingsStore.webcam.liveUrl"
											  :label="$t('settings.webcam.liveUrl')"
											  v-hint="$t('settings.webcam.liveUrlHint')"
											  variant="outlined" density="comfortable" hide-details />
							</v-col>
						</v-row>
						<v-row density="compact" class="mt-2">
							<v-col cols="12" sm="6">
								<v-switch v-model="settingsStore.webcam.embedded" color="primary"
										  :label="$t('settings.webcam.embedded')"
										  v-hint="$t('settings.webcam.embeddedHint')"
										  density="comfortable" hide-details />
							</v-col>
							<v-col cols="12" sm="6">
								<v-switch v-model="settingsStore.webcam.useFix" color="primary"
										  :label="$t('settings.webcam.useFix')"
										  v-hint="$t('settings.webcam.useFixHint')"
										  density="comfortable" hide-details />
							</v-col>
						</v-row>
						<v-row density="compact" class="mt-4">
							<v-col cols="4">
								<v-select v-model="settingsStore.webcam.flip" :items="flipOptions"
										  item-title="label" item-value="value"
										  :label="$t('settings.webcam.flip')"
										  v-hint="$t('settings.webcam.flipHint')"
										  variant="outlined" density="comfortable" hide-details />
							</v-col>
							<v-col cols="4">
								<v-select v-model.number="settingsStore.webcam.rotation"
										  :items="rotationOptions" item-title="label" item-value="value"
										  :label="$t('settings.webcam.rotation')"
										  v-hint="$t('settings.webcam.rotationHint')"
										  variant="outlined" density="comfortable" hide-details />
							</v-col>
							<v-col cols="4">
								<v-text-field v-model.number="settingsStore.webcam.updateInterval" type="number"
											  :label="$t('settings.webcam.updateInterval')"
											  v-hint="$t('settings.webcam.updateIntervalHint')"
											  variant="outlined" density="comfortable" hide-details
											  suffix="ms" />
							</v-col>
						</v-row>
					</v-container>
				</v-window-item>

				<v-window-item value="Editor" eager>
					<v-container fluid>
						<v-row density="compact">
							<v-col cols="12" md="6">
								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-format-text</v-icon>
										{{ $t("settings.editor.appearanceCaption") }}
									</v-card-title>
									<v-card-text>
										<v-switch v-model="settingsStore.editor.useMonaco" color="primary"
												  :label="$t('settings.editor.useMonaco')"
												  v-hint="$t('settings.editor.useMonacoHint')"
												  density="comfortable" hide-details />
										<v-row density="compact" class="mt-4">
											<v-col cols="6">
												<v-text-field v-model.number="settingsStore.editor.fontSize" type="number"
															  :label="$t('settings.editor.fontSize')"
															  v-hint="$t('settings.editor.fontSizeHint')"
															  variant="outlined" density="comfortable" hide-details
															  min="8" max="32" suffix="px" />
											</v-col>
											<v-col cols="6">
												<v-select v-model.number="settingsStore.editor.tabSize"
														  :items="[2, 4, 8]"
														  :label="$t('settings.editor.tabSize')"
														  v-hint="$t('settings.editor.tabSizeHint')"
														  variant="outlined" density="comfortable" hide-details />
											</v-col>
										</v-row>
										<v-select v-model="settingsStore.editor.wordWrap"
												  :items="wordWrapOptions" item-title="label" item-value="value"
												  :label="$t('settings.editor.wordWrap')"
												  v-hint="$t('settings.editor.wordWrapHint')"
												  variant="outlined" density="comfortable" hide-details class="mt-4" />
										<v-switch v-model="settingsStore.editor.minimap" color="primary"
												  :label="$t('settings.editor.minimap')"
												  v-hint="$t('settings.editor.minimapHint')"
												  density="comfortable" hide-details class="mt-2" />
										<v-switch v-model="settingsStore.editor.lineNumbers" color="primary"
												  :label="$t('settings.editor.lineNumbers')"
												  v-hint="$t('settings.editor.lineNumbersHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.bracketPairColorization" color="primary"
												  :label="$t('settings.editor.bracketPairColorization')"
												  v-hint="$t('settings.editor.bracketPairColorizationHint')"
												  density="comfortable" hide-details />
									</v-card-text>
								</v-card>
							</v-col>

							<v-col cols="12" md="6">
								<v-card>
									<v-card-title>
										<v-icon class="mr-2">mdi-auto-fix</v-icon>
										{{ $t("settings.editor.assistanceCaption") }}
									</v-card-title>
									<v-card-text>
										<v-switch v-model="settingsStore.editor.quickSuggestions" color="primary"
												  :label="$t('settings.editor.quickSuggestions')"
												  v-hint="$t('settings.editor.quickSuggestionsHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.suggestOnTriggerCharacters" color="primary"
												  :label="$t('settings.editor.suggestOnTriggerCharacters')"
												  v-hint="$t('settings.editor.suggestOnTriggerCharactersHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.parameterHints" color="primary"
												  :label="$t('settings.editor.parameterHints')"
												  v-hint="$t('settings.editor.parameterHintsHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.hover" color="primary"
												  :label="$t('settings.editor.hover')"
												  v-hint="$t('settings.editor.hoverHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.inlineSuggest" color="primary"
												  :label="$t('settings.editor.inlineSuggest')"
												  v-hint="$t('settings.editor.inlineSuggestHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.formatOnPaste" color="primary"
												  :label="$t('settings.editor.formatOnPaste')"
												  v-hint="$t('settings.editor.formatOnPasteHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.formatOnType" color="primary"
												  :label="$t('settings.editor.formatOnType')"
												  v-hint="$t('settings.editor.formatOnTypeHint')"
												  density="comfortable" hide-details />
										<v-switch v-model="settingsStore.editor.largeFileOptimizations" color="primary"
												  :label="$t('settings.editor.largeFileOptimizations')"
												  v-hint="$t('settings.editor.largeFileOptimizationsHint')"
												  density="comfortable" hide-details />
									</v-card-text>
								</v-card>
							</v-col>
						</v-row>
					</v-container>
				</v-window-item>

				<v-window-item value="Boards" eager>
					<v-alert v-if="boards.length === 0" type="info" variant="tonal" tile>
						{{ $t("settings.about.noBoards") }}
					</v-alert>
					<v-table v-else density="compact">
						<thead>
							<tr>
								<th class="text-left">{{ $t("settings.infrastructure.product") }}</th>
								<th class="text-left">{{ $t("settings.infrastructure.shortName") }}</th>
								<th class="text-center">{{ $t("settings.infrastructure.can") }}</th>
								<th v-if="hasAnyVin" class="text-center d-none d-lg-table-cell">
									{{ $t("panel.status.vIn") }}
								</th>
								<th v-if="hasAnyV12" class="text-center d-none d-lg-table-cell">
									{{ $t("panel.status.v12") }}
								</th>
								<th v-if="hasAnyMcuTemp" class="text-center d-none d-xl-table-cell">
									{{ $t("panel.status.mcuTemp") }}
								</th>
								<th class="text-left">{{ $t("settings.infrastructure.firmwareVersion") }}</th>
								<th class="text-left d-none d-md-table-cell">
									{{ $t("settings.infrastructure.builtOn") }}
								</th>
								<th v-if="hasAnyFreeRam" class="text-center d-none d-xl-table-cell">
									{{ $t("settings.infrastructure.freeRam") }}
								</th>
								<th class="text-right d-none d-md-table-cell">
									<v-btn color="primary" density="comfortable" :loading="installingFirmware"
										   :disabled="!machineStore.isConnected || uiStore.uiFrozen"
										   @click="pickFirmwareFiles">
										<v-icon class="mr-1">mdi-package-down</v-icon>
										{{ $t("settings.infrastructure.installUpdate") }}
									</v-btn>
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(board, idx) in boards" :key="idx">
								<td>{{ board.name || $t("generic.noValue") }}</td>
								<td>{{ board.shortName || $t("generic.noValue") }}</td>
								<td class="text-center">
									<v-btn v-if="board.canAddress !== null && board.canAddress > 0"
										   variant="text" density="compact" color="primary"
										   :disabled="!machineStore.isConnected || uiStore.uiFrozen"
										   v-hint="$t('settings.infrastructure.changeCanAddress')"
										   @click="openCanAddressDialog(board)">
										{{ board.canAddress }}
									</v-btn>
									<template v-else>{{ board.canAddress ?? $t("generic.noValue") }}</template>
								</td>
								<td v-if="hasAnyVin" class="text-center d-none d-lg-table-cell">
									<v-tooltip v-if="board.vIn" location="bottom"
											   :text="$t('panel.status.minMax', [display(board.vIn.min, 1, 'V'), display(board.vIn.max, 1, 'V')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap">
												{{ display(board.vIn.current, 1, "V") }}
											</span>
										</template>
									</v-tooltip>
									<template v-else>{{ $t("generic.noValue") }}</template>
								</td>
								<td v-if="hasAnyV12" class="text-center d-none d-lg-table-cell">
									<v-tooltip v-if="board.v12" location="bottom"
											   :text="$t('panel.status.minMax', [display(board.v12.min, 1, 'V'), display(board.v12.max, 1, 'V')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap">
												{{ display(board.v12.current, 1, "V") }}
											</span>
										</template>
									</v-tooltip>
									<template v-else>{{ $t("generic.noValue") }}</template>
								</td>
								<td v-if="hasAnyMcuTemp" class="text-center d-none d-xl-table-cell">
									<v-tooltip v-if="board.mcuTemp" location="bottom"
											   :text="$t('panel.status.minMax', [display(board.mcuTemp.min, 1, '°C'), display(board.mcuTemp.max, 1, '°C')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap">
												{{ display(board.mcuTemp.current, 1, "°C") }}
											</span>
										</template>
									</v-tooltip>
									<template v-else>{{ $t("generic.noValue") }}</template>
								</td>
								<td>{{ board.firmwareVersion || $t("generic.noValue") }}</td>
								<td class="d-none d-md-table-cell">{{ board.firmwareDate || $t("generic.noValue") }}</td>
								<td v-if="hasAnyFreeRam" class="text-center d-none d-xl-table-cell text-no-wrap">
									{{ displaySize(board.freeRam) }}
								</td>
								<td class="d-none d-md-table-cell text-right">
									<v-btn variant="text" density="comfortable" color="primary"
										   prepend-icon="mdi-stethoscope"
										   :disabled="!machineStore.isConnected || uiStore.uiFrozen"
										   v-hint="$t('settings.infrastructure.diagnosticsHint')"
										   @click="runDiagnostics(board)">
										{{ $t("settings.infrastructure.diagnostics") }}
									</v-btn>
								</td>
							</tr>

							<tr v-if="wifiVersion">
								<td>Duet WiFi Server</td>
								<td></td>
								<td></td>
								<td v-if="hasAnyVin" class="d-none d-lg-table-cell" />
								<td v-if="hasAnyV12" class="d-none d-lg-table-cell" />
								<td v-if="hasAnyMcuTemp" class="d-none d-xl-table-cell" />
								<td>{{ wifiVersion }}</td>
								<td class="d-none d-md-table-cell" />
								<td v-if="hasAnyFreeRam" class="d-none d-xl-table-cell" />
								<td class="d-none d-md-table-cell" />
							</tr>

							<tr v-if="dsfVersion">
								<td>Duet Software Framework</td>
								<td>DSF</td>
								<td></td>
								<td v-if="hasAnyVin" class="d-none d-lg-table-cell" />
								<td v-if="hasAnyV12" class="d-none d-lg-table-cell" />
								<td v-if="hasAnyMcuTemp" class="d-none d-xl-table-cell" />
								<td>{{ dsfVersion }}</td>
								<td class="d-none d-md-table-cell">{{ dsfBuildDateTime || $t("generic.noValue") }}</td>
								<td v-if="hasAnyFreeRam" class="d-none d-xl-table-cell" />
								<td class="d-none d-md-table-cell" />
							</tr>

							<tr>
								<td>Duet Web Control</td>
								<td>DWC</td>
								<td></td>
								<td v-if="hasAnyVin" class="d-none d-lg-table-cell" />
								<td v-if="hasAnyV12" class="d-none d-lg-table-cell" />
								<td v-if="hasAnyMcuTemp" class="d-none d-xl-table-cell" />
								<td>{{ dwcVersion }}</td>
								<td class="d-none d-md-table-cell">{{ dwcBuildDateTime }}</td>
								<td v-if="hasAnyFreeRam" class="d-none d-xl-table-cell" />
								<td class="d-none d-md-table-cell" />
							</tr>
						</tbody>
					</v-table>

					<v-dialog v-model="canAddressDialog.shown" width="480" persistent no-click-animation>
						<v-form @submit.prevent="applyCanAddress">
							<v-card>
								<v-card-title>{{ $t("settings.infrastructure.changeCanAddress") }}</v-card-title>
								<v-card-text>
									<div class="mb-3">
										{{ $t("settings.infrastructure.changeCanAddressPrompt", [canAddressDialog.boardName, canAddressDialog.currentAddress]) }}
									</div>
									<v-text-field v-model.number="canAddressDialog.newAddress" type="number"
												  min="1" max="126" step="1" autofocus hide-details
												  :label="$t('settings.infrastructure.newCanAddress')"
												  v-hint="$t('settings.infrastructure.newCanAddressHint')"
												  variant="outlined" density="comfortable" />
									<v-alert type="info" variant="tonal" class="mt-3" icon="mdi-restart">
										{{ $t("settings.infrastructure.canAddressRestartHint") }}
									</v-alert>
								</v-card-text>
								<v-card-actions>
									<v-spacer />
									<v-btn variant="text" type="button" @click="canAddressDialog.shown = false">
										{{ $t("generic.cancel") }}
									</v-btn>
									<v-btn variant="text" type="submit"
										   :loading="canAddressDialog.busy" :disabled="!canAddressIsValid">
										{{ $t("generic.ok") }}
									</v-btn>
								</v-card-actions>
							</v-card>
						</v-form>
					</v-dialog>
				</v-window-item>

				<v-window-item value="About" class="pa-3" eager>
					<v-card flat>
						<v-card-title class="d-flex align-center">
							<v-icon class="mr-2">mdi-information</v-icon>
							<span>{{ $t("settings.about.dwc") }} {{ dwcVersion }}</span>
							<v-spacer />
							<a href="https://github.com/Duet3D/DuetWebControl" target="_blank"
							   rel="noopener" class="text-body-medium d-inline-flex align-center">
								<v-icon size="small" class="mr-1">mdi-star</v-icon>
								GitHub
							</a>
						</v-card-title>
						<v-card-text>
							<div>
								<strong>{{ $t("settings.about.hostname") }}:</strong>
								{{ machineStore.model.network.hostname || $t("generic.noValue") }}
							</div>
							<div>
								<strong>{{ $t("settings.about.connector") }}:</strong>
								{{ connectorLabel }}
							</div>
							<div class="mt-4 d-flex align-center">
								<i18n-t keypath="settings.about.credits" tag="span">
									<template #author>
										<a href="mailto:christian@duet3d.com">Christian Hammacher</a>
									</template>
									<template #duet3d>
										<a href="https://www.duet3d.com" target="_blank" rel="noopener">Duet3D</a>
									</template>
								</i18n-t>
								<v-spacer />
								<v-btn class="d-lg-none" size="small" variant="tonal"
									   prepend-icon="mdi-refresh" @click="reloadPage">
									{{ $t("settings.about.reload") }}
								</v-btn>
							</div>
							<div class="mt-1">
								<i18n-t keypath="settings.about.license" tag="span">
									<template #gpl>
										<a href="https://www.gnu.org/licenses/gpl-3.0.en.html"
										   target="_blank" rel="noopener">GNU General Public License v3</a>
									</template>
								</i18n-t>
							</div>
						</v-card-text>
					</v-card>

					<v-card class="mt-3">
						<v-card-title>
							<v-icon class="mr-2">mdi-restore</v-icon>
							{{ $t("settings.machine.resetCaption") }}
						</v-card-title>
						<v-card-text>
							<div class="d-flex align-center">
								<div class="flex-grow-1 text-body-small text-medium-emphasis">
									{{ $t("settings.machine.resetHint") }}
								</div>
								<v-btn class="ms-2" color="warning" :loading="resettingSettings"
									   :disabled="uiStore.uiFrozen" @click="askFactoryReset">
									<v-icon class="mr-1">mdi-restore</v-icon>
									{{ $t("settings.machine.reset") }}
								</v-btn>
							</div>

							<v-divider class="my-3" />

							<div class="d-flex align-center">
								<div class="flex-grow-1 text-body-small text-medium-emphasis">
									{{ $t("settings.machine.resetComponentsHint") }}
								</div>
								<v-btn class="ms-2" color="warning" variant="tonal" :loading="resettingComponents"
									   :disabled="uiStore.uiFrozen" @click="resetComponents">
									<v-icon class="mr-1">mdi-view-dashboard-outline</v-icon>
									{{ $t("settings.machine.resetComponents") }}
								</v-btn>
							</div>
						</v-card-text>
					</v-card>
				</v-window-item>

				<v-window-item v-for="tab in pluginSettingTabs" :key="tab.key" :value="tab.key" eager>
					<component :is="tab.component" />
				</v-window-item>
			</v-window>
		</v-card>
		</div>

		<input ref="firmwareInput" type="file" multiple :accept="firmwareAccept" hidden
			   @change="onFirmwarePicked" />

		<FirmwareUpdateDialog v-model:shown="firmwareDialog.shown" :plan="firmwareDialog.plan"
							  @confirmed="firmwareController.onFirmwareUpdateConfirmed"
							  @cancelled="firmwareController.onFirmwareUpdateCancelled" />

		<ConfigUpdatedDialog v-model:shown="configUpdatedDialog.shown" />
	</div>
</template>

<script setup lang="ts">
import { PollConnector, RestConnector } from "@duet3d/connectors";
import { NetworkInterfaceType } from "@duet3d/objectmodel";

import { useDisplay } from "vuetify";

import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import { showConfirmDialog } from "@/composables/useConfirmDialog";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import ListEditor from "@/components/inputs/ListEditor.vue";
import { useFirmwareInstallController } from "@/composables/useFirmwareInstallController";
import i18n, { type Locale } from "@/i18n";
import { getPluginSettingTabs } from "@/plugins";
import { registeredLayout, registeredLayoutOptions } from "@/plugins/layout";
import { registeredThemes } from "@/plugins/theme";
import { localStorageSupported, removeLocalSetting } from "@/utils/localStorage";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { useMenuStore } from "@/stores/menu";
import { DashboardMode, UnitOfMeasure, useSettingsStore, WebcamFlip } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { display, displaySize } from "@/utils/display";
import { getErrorMessage } from "@/utils/errors";

import packageInfo from "../../../package.json";

// Built-in tabs share the shape used by plugin-registered tabs (caption + translated flag)
// so the v-tabs render loop can merge them transparently. `order` slots plugin tabs in - the
// built-ins reserve 10/20/30/... so a plugin order can land between them if needed
interface BuiltinTab {
	key: string;
	icon: string;
	caption: string;
	translated?: boolean;
	order: number;
}

const builtinTabs: Array<BuiltinTab> = [
	{ key: "General", icon: "mdi-tune", caption: "settings.tabs.general", order: 10 },
	{ key: "Display", icon: "mdi-monitor-dashboard", caption: "settings.tabs.display", order: 20 },
	{ key: "Presets", icon: "mdi-format-list-numbered", caption: "settings.tabs.presets", order: 25 },
	{ key: "Webcam", icon: "mdi-webcam", caption: "settings.tabs.webcam", order: 30 },
	{ key: "Editor", icon: "mdi-text-box-edit", caption: "settings.tabs.editor", order: 45 },
	{ key: "Boards", icon: "mdi-chip", caption: "settings.tabs.infrastructure", order: 55 },
	{ key: "About", icon: "mdi-information", caption: "settings.tabs.about", order: 60 },
];

const pluginSettingTabs = computed(() => getPluginSettingTabs());

// Resolve plugin captions through the same template branch as built-ins by collapsing the
// getter form to a plain string at read time
const allTabs = computed(() => {
	const merged: Array<{ key: string; icon: string; caption: string; translated: boolean; order: number }> = [
		...builtinTabs.map((tab) => ({ ...tab, translated: tab.translated ?? false })),
		...pluginSettingTabs.value.map((tab) => ({
			key: tab.key,
			icon: tab.icon,
			caption: typeof tab.caption === "string" ? tab.caption : tab.caption(),
			translated: tab.translated ?? false,
			order: tab.order ?? 100,
		})),
	];
	merged.sort((a, b) => a.order - b.order);
	return merged;
});

const cacheStore = useCacheStore();
const machineStore = useMachineStore();
const menuStore = useMenuStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const reloadingSettings = ref(false);
const reloadingCache = ref(false);

// Force a re-fetch from the board for board-stored settings or cache. Clears any stale
// localStorage entry first so the load() path bypasses its localStorage-preferred branch and
// actually downloads the file - the button is only visible in board-storage mode
async function reloadSettings() {
	reloadingSettings.value = true;
	try {
		removeLocalSetting("settings");
		await settingsStore.load();
		uiStore.log(LogLevel.success, i18n.global.t("settings.storage.reloadSettingsSuccess"));
	} catch (e) {
		uiStore.log(LogLevel.error, i18n.global.t("settings.storage.reloadSettingsError"), getErrorMessage(e, true));
	} finally {
		reloadingSettings.value = false;
	}
}

async function reloadCache() {
	reloadingCache.value = true;
	try {
		removeLocalSetting("cache");
		await cacheStore.load();
		uiStore.log(LogLevel.success, i18n.global.t("settings.storage.reloadCacheSuccess"));
	} catch (e) {
		uiStore.log(LogLevel.error, i18n.global.t("settings.storage.reloadCacheError"), getErrorMessage(e, true));
	} finally {
		reloadingCache.value = false;
	}
}
const route = useRoute("/Settings/[[tab]]");
const router = useRouter();
const { mdAndUp } = useDisplay();

const hasAnyVin = computed(() => boards.value.some(board => board.vIn != null));
const hasAnyV12 = computed(() => boards.value.some(board => board.v12 != null));
const hasAnyMcuTemp = computed(() => boards.value.some(board => board.mcuTemp != null));
const hasAnyFreeRam = computed(() => boards.value.some(board => board.freeRam != null));

// Tabs run with comfortable density at xs/sm so the touch target is large enough on phones;
// md+ stays compact since the cursor doesn't need the bigger hit area
const tabsDensity = computed(() => mdAndUp.value ? "compact" : "default");

// Each tab is its own sub-route (/Settings/<key>) so tabs are deep-linkable and the browser
// back button steps through them. A bare /Settings or an unknown key falls back to General
const activeTab = computed<string>({
	get: () => {
		const tab = route.params.tab;
		const key = Array.isArray(tab) ? tab[0] : tab;
		if (key) {
			// Case-insensitive match so legacy lowercase bookmarks (e.g. /Settings/general from
			// before the casing was normalised) still resolve to the canonical-cased tab
			const match = allTabs.value.find((t) => t.key.toLowerCase() === key.toLowerCase());
			if (match) {
				return match.key;
			}
		}
		return "General";
	},
	set: (value) => {
		if (value !== activeTab.value) {
			router.push(`/Settings/${value}`);
		}
	},
});
const presetsTab = ref<string>("tool");

const languageOptions = computed(() => [
	{ label: "English", value: "en" },
	{ label: "Deutsch", value: "de" },
]);

const flipOptions = computed(() => [
	{ label: i18n.global.t("settings.webcam.flipOptions.none"), value: WebcamFlip.None },
	{ label: i18n.global.t("settings.webcam.flipOptions.x"), value: WebcamFlip.X },
	{ label: i18n.global.t("settings.webcam.flipOptions.y"), value: WebcamFlip.Y },
	{ label: i18n.global.t("settings.webcam.flipOptions.both"), value: WebcamFlip.Both },
]);

const rotationOptions = [
	{ label: "0°", value: 0 },
	{ label: "90°", value: 90 },
	{ label: "180°", value: 180 },
	{ label: "270°", value: 270 },
];

const dashboardModeOptions = computed(() => [
	{ label: i18n.global.t("settings.display.dashboardModeOptions.default"), value: DashboardMode.default },
	{ label: i18n.global.t("settings.display.dashboardModeOptions.fff"), value: DashboardMode.fff },
	{ label: i18n.global.t("settings.display.dashboardModeOptions.cnc"), value: DashboardMode.cnc },
]);

const themeItems = computed(() => [
	{ title: i18n.global.t("settings.display.themeAuto"), value: null },
	...registeredThemes.value.map(t => ({ title: t.caption, value: t.name })),
]);

const switchLayoutLabel = computed(() => {
	if (settingsStore.useCustomLayout) {
		return i18n.global.t("settings.display.switchToDefaultLayout");
	}
	const caption = registeredLayoutOptions.value?.caption ?? registeredLayoutOptions.value?.id ?? "";
	return i18n.global.t("settings.display.switchToCustomLayout", { layout: caption });
});

async function onSwitchLayoutClick() {
	if (!settingsStore.useCustomLayout) {
		const caption = registeredLayoutOptions.value?.caption ?? registeredLayoutOptions.value?.id ?? "";
		if (!(await showConfirmDialog(i18n.global.t("settings.display.switchToCustomLayoutTitle"), i18n.global.t("settings.display.switchToCustomLayoutPrompt", { layout: caption }), "mdi-view-dashboard-variant", true))) {
			return;
		}
	}
	settingsStore.useCustomLayout = !settingsStore.useCustomLayout;
	settingsStore.layoutUserSet = true;
}

const displayUnitOptions = computed(() => [
	{ label: i18n.global.t("settings.units.displayUnitsOptions.metric"), value: UnitOfMeasure.metric },
	{ label: i18n.global.t("settings.units.displayUnitsOptions.imperial"), value: UnitOfMeasure.imperial },
]);

const decimalPlaceOptions = [0, 1, 2, 3];

const hideableMenuItems = computed(() => menuStore.hideableItems);
const hiddenMenuPaths = computed({
	get: () => settingsStore.hiddenMenuItems,
	set: (v: Array<string>) => {
		settingsStore.hiddenMenuItems = v;
	},
});

const wordWrapOptions = computed(() => [
	{ label: i18n.global.t("settings.editor.wordWrapOptions.off"), value: "off" },
	{ label: i18n.global.t("settings.editor.wordWrapOptions.on"), value: "on" },
	{ label: i18n.global.t("settings.editor.wordWrapOptions.bounded"), value: "bounded" },
]);

const dwcVersion = packageInfo.version;
const dwcBuildDateTime = __BUILD_DATETIME__;

function reloadPage() {
	window.location.reload();
}

const isPollConnector = computed(() => machineStore.connector instanceof PollConnector);
const isRestConnector = computed(() => machineStore.connector instanceof RestConnector);

const connectorLabel = computed(() => {
	if (isRestConnector.value) {
		// Distribution is reported by DSF (DuetPi, Debian, Raspbian, ...). Fall back to a
		// generic "SBC" only when DSF can't name it - hard-coding "DuetPi" everywhere is wrong
		// for the non-DuetPi installs
		const distro = machineStore.model.sbc?.distribution || i18n.global.t("settings.about.connectorRestFallback");
		const bits = machineStore.model.sbc?.dsf?.is64Bit ? "64" : "32";
		return i18n.global.t("settings.about.connectorRest", { distro, bits });
	}
	if (isPollConnector.value) {
		return i18n.global.t("settings.about.connectorPoll");
	}
	return i18n.global.t("generic.noValue");
});

const boards = computed(() => machineStore.model.boards.filter((board) => board !== null));

// #region CAN address change
// Mirrors the upstream DWC-CAN-Manager plugin: clicking an expansion board's CAN address opens a
// dialog that issues `M952 B<old> A<new>`. The change only takes effect on the next board restart
const canAddressDialog = reactive({
	shown: false,
	busy: false,
	boardName: "",
	currentAddress: 0,
	newAddress: 0 as number | null,
});

const canAddressIsValid = computed(() => {
	const n = canAddressDialog.newAddress;
	return typeof n === "number" && Number.isInteger(n)
		&& n >= 1 && n <= 126 && n !== canAddressDialog.currentAddress;
});

function openCanAddressDialog(board: { name: string | null; canAddress: number | null }) {
	if (board.canAddress === null) {
		return;
	}
	canAddressDialog.boardName = board.name ?? "";
	canAddressDialog.currentAddress = board.canAddress;
	canAddressDialog.newAddress = board.canAddress;
	canAddressDialog.busy = false;
	canAddressDialog.shown = true;
}

async function runDiagnostics(board: { canAddress: number | null }) {
	const code = board.canAddress !== null && board.canAddress > 0
		? `M122 B${board.canAddress}`
		: "M122";
	try {
		// Send with logReply=false so sendCode doesn't pop the floating toast, then push the
		// reply into the console buffer ourselves so the dump is waiting when we land
		const reply = await machineStore.sendCode(code, false, false);
		uiStore.logMessage(LogLevel.info, code, reply ?? "");
		await router.push("/Console");
	} catch (e) {
		uiStore.notifyError(e, i18n.global.t("settings.infrastructure.diagnosticsError"));
	}
}

async function applyCanAddress() {
	if (!canAddressIsValid.value) {
		return;
	}
	const oldAddress = canAddressDialog.currentAddress;
	const newAddress = canAddressDialog.newAddress as number;
	canAddressDialog.busy = true;
	try {
		await machineStore.sendCode(`M952 B${oldAddress} A${newAddress}`);
		uiStore.log(
			LogLevel.success,
			i18n.global.t("settings.infrastructure.canAddressChanged", [oldAddress, newAddress])
		);
		canAddressDialog.shown = false;
	} catch (e) {
		uiStore.log(
			LogLevel.error,
			i18n.global.t("settings.infrastructure.canAddressError"),
			getErrorMessage(e)
		);
	} finally {
		canAddressDialog.busy = false;
	}
}
// #endregion

// WiFi co-processor firmware version reported by the network interface, not the board itself
// Only Duet WiFi-class boards expose this; SBC-mode systems and Ethernet-only boards report null
const wifiVersion = computed<string | null>(() => {
	const iface = machineStore.model.network.interfaces.find(
		i => i?.type === NetworkInterfaceType.wifi
	);
	return iface?.firmwareVersion ?? null;
});

// DSF (Duet Software Framework) version + build date - only present in SBC mode where DSF runs
// on the SBC and proxies for the firmware. v-if on `dsfVersion` keeps the row out of standalone
const dsfVersion = computed<string | null>(() => machineStore.model.sbc?.dsf.version ?? null);
const dsfBuildDateTime = computed<string | null>(() => machineStore.model.sbc?.dsf.buildDateTime ?? null);

// Store keeps the file transfer retry threshold in bytes; the field shows KiB so values like
// 350 KiB don't need eight zeroes to dial in
const fileTransferRetryThresholdKiB = computed({
	get: () => Math.round(settingsStore.fileTransferRetryThreshold / 1024),
	set: (v: number) => {
		if (Number.isFinite(v) && v > 0) {
			settingsStore.fileTransferRetryThreshold = Math.round(v * 1024);
		}
	},
});

const supportsLocalStorage = localStorageSupported;

// Guard the persisted save-delay fields against non-finite or negative input so a stray edit
// can't poison the auto-save observer
const settingsSaveDelayMs = computed({
	get: () => settingsStore.settingsSaveDelay,
	set: (v: number) => {
		if (Number.isFinite(v) && v >= 0) {
			settingsStore.settingsSaveDelay = v;
		}
	},
});
const cacheSaveDelayMs = computed({
	get: () => settingsStore.cacheSaveDelay,
	set: (v: number) => {
		if (Number.isFinite(v) && v >= 0) {
			settingsStore.cacheSaveDelay = v;
		}
	},
});

// #region Firmware install
const firmwareController = useFirmwareInstallController();
const { firmwareDialog, configUpdatedDialog } = firmwareController;
const firmwareInput = ref<HTMLInputElement | null>(null);
const installingFirmware = ref(false);

// .deb is only usable in SBC mode (installSystemPackage); .crt/.key are HTTPS certs
const firmwareAccept = computed(() => machineStore.model.sbc !== null
	? ".zip,.bin,.uf2,.deb,.crt,.key"
	: ".zip,.bin,.uf2,.crt,.key");

function pickFirmwareFiles() {
	if (installingFirmware.value) {
		return;
	}
	firmwareInput.value?.click();
}

async function onFirmwarePicked(event: Event) {
	const target = event.target as HTMLInputElement;
	const files = target.files;
	target.value = "";
	if (!files || files.length === 0) {
		return;
	}
	installingFirmware.value = true;
	try {
		await firmwareController.runFirmwareUpload(Array.from(files));
	} finally {
		installingFirmware.value = false;
	}
}

// #endregion

// #region Factory reset

// Wipes the persisted settings + cache (locally and on the board), drops a fresh copy of the
// factory-defaults file when one is present on the SD card, then reloads. Wraps
// settingsStore.reset() with a confirm dialog and a small busy flag so the button can show a
// spinner during the (typically brief) async file-delete chain
const resettingSettings = ref(false);
const resettingComponents = ref(false);

async function askFactoryReset() {
	if (!(await showConfirmDialog(i18n.global.t("settings.machine.resetTitle"), i18n.global.t("settings.machine.resetPrompt"), "mdi-restore"))) {
		return;
	}
	resettingSettings.value = true;
	try {
		await settingsStore.reset();
		// settingsStore.reset() finishes by calling location.reload(); resettingSettings won't
		// matter after that, but the early-exit paths (no board, delete failures) still need
		// the flag cleared so the user can retry
	} finally {
		resettingSettings.value = false;
	}
}

async function resetComponents() {
	if (!(await showConfirmDialog(i18n.global.t("settings.machine.resetComponentsTitle"), i18n.global.t("settings.machine.resetComponentsPrompt"), "mdi-view-dashboard-outline"))) {
		return;
	}
	resettingComponents.value = true;
	try {
		await settingsStore.resetComponentSettings();
	} finally {
		resettingComponents.value = false;
	}
}

// #endregion
</script>
