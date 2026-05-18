<route lang="json">
{
	"meta": {
		"menu": {
			"category": "preferences",
			"icon": "mdi-wrench",
			"caption": "menu.preferences.settings",
			"order": 10
		}
	}
}
</route>

<template>
	<div class="settings-page dwc-page-fill">
	<v-card class="settings-card">
		<v-tabs v-model="activeTab" align-tabs="start" show-arrows :density="tabsDensity">
			<v-tab v-for="tab in allTabs" :key="tab.key" :value="tab.key" class="text-none">
				<v-icon size="small" class="mr-2">{{ tab.icon }}</v-icon>
				{{ tab.translated ? tab.caption : $t(tab.caption) }}
			</v-tab>
		</v-tabs>

		<v-window v-model="activeTab" :touch="false" :transition="false" :reverse-transition="false" class="settings-window">
			<v-window-item value="general" eager>
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
											  :title="$t('settings.appearance.darkThemeHint')"
											  density="comfortable" hide-details />
									<v-select :model-value="settingsStore.locale" :items="languageOptions"
											  item-title="label" item-value="value"
											  :label="$t('settings.appearance.language')"
											  :title="$t('settings.appearance.languageHint')"
											  variant="outlined" density="comfortable" hide-details class="mt-4"
											  @update:model-value="(value) => settingsStore.setLocale(value as Locale)" />
								</v-card-text>
							</v-card>

							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-database</v-icon>
									{{ $t("settings.storage.caption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.settingsStorageLocal" color="primary"
											  :disabled="!supportsLocalStorage"
											  :label="$t('settings.storage.settingsStorageLocal')"
											  :title="$t('settings.storage.settingsStorageLocalHint')"
											  density="comfortable" hide-details />
									<v-switch v-model="settingsStore.cacheStorageLocal" color="primary"
											  :disabled="!supportsLocalStorage"
											  :label="$t('settings.storage.cacheStorageLocal')"
											  :title="$t('settings.storage.cacheStorageLocalHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-row density="compact" class="mt-4">
										<v-col cols="6">
											<v-text-field v-model.number="settingsSaveDelayMs" type="number" min="0" step="100"
														  :label="$t('settings.storage.settingsSaveDelay')"
														  :title="$t('settings.storage.settingsSaveDelayHint')"
														  variant="outlined" density="comfortable" hide-details
														  suffix="ms" />
										</v-col>
										<v-col cols="6">
											<v-text-field v-model.number="cacheSaveDelayMs" type="number" min="0" step="100"
														  :label="$t('settings.storage.cacheSaveDelay')"
														  :title="$t('settings.storage.cacheSaveDelayHint')"
														  variant="outlined" density="comfortable" hide-details
														  suffix="ms" />
										</v-col>
									</v-row>
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
														  :title="$t('settings.communication.pingIntervalHint')"
														  variant="outlined" density="comfortable" hide-details
														  min="0" suffix="ms" />
										</v-col>
										<v-col cols="12" sm="6">
											<v-text-field v-model.number="settingsStore.updateDelay" type="number"
														  :label="$t('settings.communication.updateDelay')"
														  :title="$t('settings.communication.updateDelayHint')"
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
														  :title="$t('settings.communication.maxRetriesHint')"
														  variant="outlined" density="comfortable" hide-details
														  min="0" />
										</v-col>
										<v-col cols="12" sm="6">
											<v-text-field v-model.number="settingsStore.retryDelay" type="number"
														  :label="$t('settings.communication.retryDelay')"
														  :title="$t('settings.communication.retryDelayHint')"
														  variant="outlined" density="comfortable" hide-details
														  min="0" suffix="ms" />
										</v-col>
										<v-col cols="12" sm="6">
											<v-text-field v-model.number="settingsStore.updateInterval" type="number"
														  :label="$t('settings.machine.updateInterval')"
														  :title="$t('settings.machine.updateIntervalHint')"
														  variant="outlined" density="comfortable" hide-details
														  min="0" suffix="ms" />
										</v-col>
										<v-col cols="12" sm="6">
											<v-text-field v-model.number="fileTransferRetryThresholdKiB"
														  type="number"
														  :label="$t('settings.communication.retryThreshold')"
														  :title="$t('settings.communication.retryThresholdHint')"
														  variant="outlined" density="comfortable" hide-details
														  min="1" suffix="KiB" />
										</v-col>
									</v-row>
									<v-switch v-model="settingsStore.ignoreFileTimestamps" color="primary"
											  :label="$t('settings.communication.ignoreFileTimestamps')"
											  :title="$t('settings.communication.ignoreFileTimestampsHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.crcUploads" color="primary"
											  :label="$t('settings.machine.crcUploads')"
											  :title="$t('settings.machine.crcUploadsHint')"
											  density="comfortable" hide-details class="mt-2" />
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
											  :title="$t('settings.notifications.errorsPersistentHint')"
											  density="comfortable" hide-details />
									<v-text-field v-model.number="notificationTimeoutSeconds" type="number" min="1"
												  :label="$t('settings.notifications.timeout')"
												  :title="$t('settings.notifications.timeoutHint')"
												  variant="outlined" density="comfortable" hide-details
												  class="mt-4" suffix="s" />
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
											  :title="$t('settings.behaviour.switchToJobOnPrintStartHint')"
											  density="comfortable" hide-details />
									<v-switch v-model="settingsStore.behaviour.promptDuringFilamentChange" color="primary"
											  :label="$t('settings.behaviour.promptDuringFilamentChange')"
											  :title="$t('settings.behaviour.promptDuringFilamentChangeHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-autocomplete v-model="settingsStore.toolChangeMacros"
													:items="toolChangeMacroOptions" item-title="label" item-value="value"
													:label="$t('settings.display.toolChangeMacros')"
													:title="$t('settings.display.toolChangeMacrosHint')"
													variant="outlined" density="comfortable" hide-details
													chips clearable multiple class="mt-4" />
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="boards" eager>
				<v-alert v-if="boards.length === 0" type="info" variant="tonal" tile>
					{{ $t("settings.about.noBoards") }}
				</v-alert>
				<v-table v-else density="compact">
					<thead>
						<tr>
							<th class="text-left">{{ $t("settings.infrastructure.product") }}</th>
							<th class="text-left">{{ $t("settings.infrastructure.shortName") }}</th>
							<th class="text-center">{{ $t("settings.infrastructure.can") }}</th>
							<th class="text-left">{{ $t("settings.infrastructure.version") }}</th>
							<th :colspan="mdAndUp ? 2 : 1">
								<div class="d-flex align-center">
									<span class="d-none d-md-inline">{{ $t("settings.infrastructure.builtOn") }}</span>
									<v-spacer />
									<v-btn color="primary" density="comfortable" :loading="installingFirmware"
										   :disabled="!machineStore.isConnected || uiStore.uiFrozen"
										   @click="pickFirmwareFiles">
										<v-icon class="mr-1">mdi-package-down</v-icon>
										{{ $t("settings.infrastructure.installUpdate") }}
									</v-btn>
								</div>
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
									   :title="$t('settings.infrastructure.changeCanAddress')"
									   @click="openCanAddressDialog(board)">
									{{ board.canAddress }}
								</v-btn>
								<template v-else>{{ board.canAddress ?? $t("generic.noValue") }}</template>
							</td>
							<td>{{ board.firmwareVersion || $t("generic.noValue") }}</td>
							<td><span class="d-none d-md-inline">{{ board.firmwareDate || $t("generic.noValue") }}</span></td>
							<td class="d-none d-md-table-cell text-right">
								<v-btn variant="text" density="comfortable" color="primary"
									   prepend-icon="mdi-stethoscope"
									   :disabled="!machineStore.isConnected || uiStore.uiFrozen"
									   @click="runDiagnostics(board)">
									{{ $t("settings.infrastructure.diagnostics") }}
								</v-btn>
							</td>
						</tr>

						<tr v-if="wifiVersion">
							<td>Duet WiFi Server</td>
							<td></td>
							<td></td>
							<td>{{ wifiVersion }}</td>
							<td></td>
							<td class="d-none d-md-table-cell" />
						</tr>

						<tr v-if="dsfVersion">
							<td>Duet Software Framework</td>
							<td>DSF</td>
							<td></td>
							<td>{{ dsfVersion }}</td>
							<td><span class="d-none d-md-inline">{{ dsfBuildDateTime || $t("generic.noValue") }}</span></td>
							<td class="d-none d-md-table-cell" />
						</tr>

						<tr>
							<td>Duet Web Control</td>
							<td>DWC</td>
							<td></td>
							<td>{{ dwcVersion }}</td>
							<td></td>
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

			<v-window-item value="display" eager>
				<v-container fluid>
					<v-row density="compact">
						<v-col cols="12" md="6" class="d-flex flex-column ga-3">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-view-dashboard</v-icon>
									{{ $t("settings.display.layoutCaption") }}
								</v-card-title>
								<v-card-text class="pt-4">
									<v-select v-model="settingsStore.dashboardMode" :items="dashboardModeOptions"
											  item-title="label" item-value="value"
											  :label="$t('settings.display.dashboardMode')"
											  :title="$t('settings.display.dashboardModeHint')"
											  variant="outlined" density="comfortable" hide-details />
									<v-switch v-model="settingsStore.iconMenu" color="primary"
											  :label="$t('settings.display.iconMenu')"
											  :title="$t('settings.display.iconMenuHint')"
											  density="comfortable" hide-details class="mt-4" />
									<v-switch v-model="settingsStore.numericInputs" color="primary"
											  :label="$t('settings.display.numericInputs')"
											  :title="$t('settings.display.numericInputsHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.disableAutoComplete" color="primary"
											  :label="$t('settings.display.disableAutoComplete')"
											  :title="$t('settings.display.disableAutoCompleteHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.checkVersions" color="primary"
											  :label="$t('settings.display.checkVersions')"
											  :title="$t('settings.display.checkVersionsHint')"
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
											  density="comfortable" hide-details>
										<template #label>
											<v-icon size="small" class="mr-2">{{ item.icon }}</v-icon>
											{{ item.translated ? item.caption : $t(item.caption) }}
											<span class="text-medium-emphasis ml-2">{{ item.path }}</span>
											<v-chip v-if="item.conditionKey === 'xsOrSm'" size="x-small"
													variant="tonal" color="info" class="ml-2">
												{{ $t("settings.display.hideMenuItemsXsSmOnly") }}
											</v-chip>
										</template>
									</v-switch>
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
													  :title="$t('settings.units.displayUnitsHint')"
													  variant="outlined" density="comfortable" hide-details />
										</v-col>
										<v-col cols="6">
											<v-select v-model.number="settingsStore.decimalPlaces" :items="decimalPlaceOptions"
													  :label="$t('settings.units.decimalPlaces')"
													  :title="$t('settings.units.decimalPlacesHint')"
													  variant="outlined" density="comfortable" hide-details />
										</v-col>
									</v-row>
									<v-switch v-model="settingsStore.useBinaryPrefix" color="primary"
											  :label="$t('settings.units.binaryPrefix')"
											  :title="$t('settings.units.binaryPrefixHint')"
											  density="comfortable" hide-details class="mt-2" />
								</v-card-text>
							</v-card>

							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-toolbox</v-icon>
									{{ $t("settings.display.toolsCaption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.groupTools" color="primary"
											  :label="$t('settings.display.groupTools')"
											  :title="$t('settings.display.groupToolsHint')"
											  density="comfortable" hide-details />
									<v-switch v-model="settingsStore.groupByExtruders" color="primary"
											  :label="$t('settings.display.groupByExtruders')"
											  :title="$t('settings.display.groupByExtrudersHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.groupByHeaters" color="primary"
											  :label="$t('settings.display.groupByHeaters')"
											  :title="$t('settings.display.groupByHeatersHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.groupByOffsets" color="primary"
											  :label="$t('settings.display.groupByOffsets')"
											  :title="$t('settings.display.groupByOffsetsHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.groupBySpindle" color="primary"
											  :label="$t('settings.display.groupBySpindle')"
											  :title="$t('settings.display.groupBySpindleHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-divider class="my-3" />
									<v-switch v-model="settingsStore.singleBedControl" color="primary"
											  :label="$t('settings.display.singleBedControl')"
											  :title="$t('settings.display.singleBedControlHint')"
											  density="comfortable" hide-details />
									<v-switch v-model="settingsStore.singleChamberControl" color="primary"
											  :label="$t('settings.display.singleChamberControl')"
											  :title="$t('settings.display.singleChamberControlHint')"
											  density="comfortable" hide-details class="mt-2" />
								</v-card-text>
							</v-card>

							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-printer-3d-nozzle</v-icon>
									{{ $t("settings.display.extrudersCaption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.showMixingControls" color="primary"
											  :label="$t('settings.display.showMixingControls')"
											  :title="$t('settings.display.showMixingControlsHint')"
											  density="comfortable" hide-details />
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="presets" eager>
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

						<v-col cols="12" sm="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-axis-arrow</v-icon>
									{{ $t("settings.display.movementCaption") }}
								</v-card-title>
								<v-card-text class="pt-4">
									<v-text-field v-model.number="moveFeedrate" type="number" min="1" step="any"
												  :label="$t('settings.display.moveFeedrate')"
												  :title="$t('settings.display.moveFeedrateHint')"
												  variant="outlined" density="comfortable" hide-details
												  suffix="mm/min" />
								</v-card-text>
							</v-card>
						</v-col>

						<v-col cols="12" sm="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-arrow-expand-vertical</v-icon>
									{{ $t("settings.display.babystepCaption") }}
								</v-card-title>
								<v-card-text class="pt-4">
									<v-text-field v-model.number="settingsStore.babystepAmount" type="number"
												  step="0.01" :label="$t('settings.display.babystepAmount')"
												  :title="$t('settings.display.babystepAmountHint')"
												  variant="outlined" density="comfortable" hide-details
												  suffix="mm" />
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="webcam" eager>
				<v-container fluid>
					<v-switch v-model="settingsStore.webcam.enabled" color="primary"
							  :label="$t('settings.webcam.enabled')"
							  :title="$t('settings.webcam.enabledHint')"
							  density="comfortable" hide-details />
					<v-row density="compact" class="mt-2">
						<v-col cols="12" lg="6">
							<v-text-field v-model="settingsStore.webcam.url"
										  :label="$t('settings.webcam.url')"
										  :title="$t('settings.webcam.urlHint')"
										  variant="outlined" density="comfortable" hide-details />
						</v-col>
						<v-col cols="12" lg="6">
							<v-text-field v-model="settingsStore.webcam.liveUrl"
										  :label="$t('settings.webcam.liveUrl')"
										  :title="$t('settings.webcam.liveUrlHint')"
										  variant="outlined" density="comfortable" hide-details />
						</v-col>
					</v-row>
					<v-row density="compact" class="mt-2">
						<v-col cols="12" sm="6">
							<v-switch v-model="settingsStore.webcam.embedded" color="primary"
									  :label="$t('settings.webcam.embedded')"
									  :title="$t('settings.webcam.embeddedHint')"
									  density="comfortable" hide-details />
						</v-col>
						<v-col cols="12" sm="6">
							<v-switch v-model="settingsStore.webcam.useFix" color="primary"
									  :label="$t('settings.webcam.useFix')"
									  :title="$t('settings.webcam.useFixHint')"
									  density="comfortable" hide-details />
						</v-col>
					</v-row>
					<v-row density="compact" class="mt-4">
						<v-col cols="4">
							<v-select v-model="settingsStore.webcam.flip" :items="flipOptions"
									  item-title="label" item-value="value"
									  :label="$t('settings.webcam.flip')"
									  :title="$t('settings.webcam.flipHint')"
									  variant="outlined" density="comfortable" hide-details />
						</v-col>
						<v-col cols="4">
							<v-select v-model.number="settingsStore.webcam.rotation"
									  :items="rotationOptions" item-title="label" item-value="value"
									  :label="$t('settings.webcam.rotation')"
									  :title="$t('settings.webcam.rotationHint')"
									  variant="outlined" density="comfortable" hide-details />
						</v-col>
						<v-col cols="4">
							<v-text-field v-model.number="settingsStore.webcam.updateInterval" type="number"
										  :label="$t('settings.webcam.updateInterval')"
										  :title="$t('settings.webcam.updateIntervalHint')"
										  variant="outlined" density="comfortable" hide-details
										  suffix="ms" />
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="editor" eager>
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
											  :title="$t('settings.editor.useMonacoHint')"
											  density="comfortable" hide-details />
									<v-row density="compact" class="mt-4">
										<v-col cols="6">
											<v-text-field v-model.number="settingsStore.editor.fontSize" type="number"
														  :label="$t('settings.editor.fontSize')"
														  :title="$t('settings.editor.fontSizeHint')"
														  variant="outlined" density="comfortable" hide-details
														  min="8" max="32" suffix="px" />
										</v-col>
										<v-col cols="6">
											<v-select v-model.number="settingsStore.editor.tabSize"
													  :items="[2, 4, 8]"
													  :label="$t('settings.editor.tabSize')"
													  :title="$t('settings.editor.tabSizeHint')"
													  variant="outlined" density="comfortable" hide-details />
										</v-col>
									</v-row>
									<v-select v-model="settingsStore.editor.wordWrap"
											  :items="wordWrapOptions" item-title="label" item-value="value"
											  :label="$t('settings.editor.wordWrap')"
											  :title="$t('settings.editor.wordWrapHint')"
											  variant="outlined" density="comfortable" hide-details class="mt-4" />
									<v-switch v-model="settingsStore.editor.minimap" color="primary"
											  :label="$t('settings.editor.minimap')"
											  :title="$t('settings.editor.minimapHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.editor.lineNumbers" color="primary"
											  :label="$t('settings.editor.lineNumbers')"
											  :title="$t('settings.editor.lineNumbersHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.editor.bracketPairColorization" color="primary"
											  :label="$t('settings.editor.bracketPairColorization')"
											  :title="$t('settings.editor.bracketPairColorizationHint')"
											  density="comfortable" hide-details class="mt-2" />
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
											  :title="$t('settings.editor.quickSuggestionsHint')"
											  density="comfortable" hide-details />
									<v-switch v-model="settingsStore.editor.suggestOnTriggerCharacters" color="primary"
											  :label="$t('settings.editor.suggestOnTriggerCharacters')"
											  :title="$t('settings.editor.suggestOnTriggerCharactersHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.editor.parameterHints" color="primary"
											  :label="$t('settings.editor.parameterHints')"
											  :title="$t('settings.editor.parameterHintsHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.editor.hover" color="primary"
											  :label="$t('settings.editor.hover')"
											  :title="$t('settings.editor.hoverHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.editor.inlineSuggest" color="primary"
											  :label="$t('settings.editor.inlineSuggest')"
											  :title="$t('settings.editor.inlineSuggestHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.editor.formatOnPaste" color="primary"
											  :label="$t('settings.editor.formatOnPaste')"
											  :title="$t('settings.editor.formatOnPasteHint')"
											  density="comfortable" hide-details class="mt-2" />
									<v-switch v-model="settingsStore.editor.formatOnType" color="primary"
											  :label="$t('settings.editor.formatOnType')"
											  :title="$t('settings.editor.formatOnTypeHint')"
											  density="comfortable" hide-details class="mt-2" />
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="about" class="pa-3" eager>
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
						<div class="mt-4">
							<i18n-t keypath="settings.about.credits" tag="span">
								<template #author>
									<a href="mailto:christian@duet3d.com">Christian Hammacher</a>
								</template>
								<template #duet3d>
									<a href="https://www.duet3d.com" target="_blank" rel="noopener">Duet3D</a>
								</template>
							</i18n-t>
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
					</v-card-text>
				</v-card>
			</v-window-item>

			<v-window-item v-for="tab in pluginSettingTabs" :key="tab.key" :value="tab.key" eager>
				<component :is="tab.component" />
			</v-window-item>
		</v-window>
	</v-card>
	</div>

	<input ref="firmwareInput" type="file" multiple accept=".zip,.bin,.uf2,.deb" hidden
		   @change="onFirmwarePicked" />

	<ConfirmDialog v-model:shown="factoryResetDialog" :title="$t('settings.machine.resetTitle')"
				   :prompt="$t('settings.machine.resetPrompt')" icon="mdi-restore"
				   @confirmed="confirmFactoryReset" />

	<FirmwareUpdateDialog v-model:shown="firmwareDialog.shown" :plan="firmwareDialog.plan"
						  @confirmed="onFirmwareUpdateConfirmed" @cancelled="onFirmwareUpdateCancelled" />

	<ConfigUpdatedDialog v-model:shown="configUpdatedDialog.shown" />
</template>

<script setup lang="ts">
import { PollConnector, RestConnector } from "@duet3d/connectors";
import { NetworkInterfaceType } from "@duet3d/objectmodel";

import { useDisplay } from "vuetify";

import type { FirmwareUpdatePlan } from "@/composables/useFirmwareInstall";
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import ListEditor from "@/components/inputs/ListEditor.vue";
import { PluginBundleDetectedError, useFirmwareInstall } from "@/composables/useFirmwareInstall";
import i18n, { type Locale } from "@/i18n";
import {
	getPluginSettingTabs
} from "@/plugins";
import Events from "@/utils/events";
import { isPrinting } from "@/utils/enums";
import { localStorageSupported } from "@/utils/localStorage";
import { useMachineStore } from "@/stores/machine";
import { useMenuStore } from "@/stores/menu";
import { DashboardMode, ToolChangeMacro, UnitOfMeasure, useSettingsStore, WebcamFlip } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";

import packageInfo from "../../package.json";

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
	{ key: "general", icon: "mdi-tune", caption: "settings.tabs.general", order: 10 },
	{ key: "boards", icon: "mdi-chip", caption: "settings.tabs.infrastructure", order: 15 },
	{ key: "display", icon: "mdi-monitor-dashboard", caption: "settings.tabs.display", order: 20 },
	{ key: "presets", icon: "mdi-format-list-numbered", caption: "settings.tabs.presets", order: 25 },
	{ key: "webcam", icon: "mdi-webcam", caption: "settings.tabs.webcam", order: 30 },
	{ key: "editor", icon: "mdi-text-box-edit", caption: "settings.tabs.editor", order: 45 },
	{ key: "about", icon: "mdi-information", caption: "settings.tabs.about", order: 60 },
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

const machineStore = useMachineStore();
const menuStore = useMenuStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const router = useRouter();
const { mdAndUp } = useDisplay();

// Tabs run with comfortable density at xs/sm so the touch target is large enough on phones;
// md+ stays compact since the cursor doesn't need the bigger hit area
const tabsDensity = computed(() => mdAndUp.value ? "compact" : "default");

const activeTab = ref<string>("general");
const presetsTab = ref<string>("tool");

// On tab change, scroll the Settings card to the top of the viewport once the new tab's
// content has actually mounted and the browser has laid it out. nextTick alone is too early
// (Vue's reactive flush completes, but the new v-window-item hasn't been measured yet, so
// scroll target is computed against stale layout). The double-rAF dance waits for the next
// paint, by which time the new content is in flow and scroll positions are accurate

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

const toolChangeMacroOptions = [
	{ label: "tfree.g", value: ToolChangeMacro.free },
	{ label: "tpre.g", value: ToolChangeMacro.pre },
	{ label: "tpost.g", value: ToolChangeMacro.post },
];

const displayUnitOptions = computed(() => [
	{ label: i18n.global.t("settings.units.displayUnitsOptions.metric"), value: UnitOfMeasure.metric },
	{ label: i18n.global.t("settings.units.displayUnitsOptions.imperial"), value: UnitOfMeasure.imperial },
]);

const decimalPlaceOptions = [0, 1, 2, 3];

// Validating bridge for the jog feedrate so an empty / negative entry doesn't silently break
// the move buttons
const moveFeedrate = computed({
	get: () => settingsStore.moveFeedrate,
	set: (v: number) => {
		if (Number.isFinite(v) && v > 0) {
			settingsStore.moveFeedrate = v;
		}
	},
});

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

const isPollConnector = computed(() => machineStore.connector instanceof PollConnector);
const isRestConnector = computed(() => machineStore.connector instanceof RestConnector);

const connectorLabel = computed(() => {
	if (isRestConnector.value) {
		return i18n.global.t("settings.about.connectorRest");
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

// Slider works in seconds; the store keeps milliseconds. Two-way computed bridges the units
const notificationTimeoutSeconds = computed({
	get: () => Math.round(settingsStore.notifications.timeout / 1000),
	set: (v: number) => {
		settingsStore.notifications.timeout = v * 1000;
	},
});

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
const firmwareInstall = useFirmwareInstall();
const firmwareInput = ref<HTMLInputElement | null>(null);
const installingFirmware = ref(false);

const firmwareDialog = reactive<{ shown: boolean; plan: FirmwareUpdatePlan | null }>({
	shown: false,
	plan: null,
});

const configUpdatedDialog = reactive({ shown: false });

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
		let plan: FirmwareUpdatePlan;
		try {
			plan = await firmwareInstall.planFiles(Array.from(files));
		} catch (e) {
			if (e instanceof PluginBundleDetectedError) {
				// Detour into the install wizard so the user still sees the manifest
				// preview / disclaimer before the bundle goes onto the machine
				Events.emit("installPlugin", { zipFilename: e.file.name, zipBlob: e.file, zipFile: e.archive, start: true });
				return;
			}
			throw e;
		}

		if (plan.files.length > 0) {
			await machineStore.upload(plan.files);
		}

		if (firmwareInstall.hasPendingUpdates(plan)) {
			firmwareDialog.plan = plan;
			firmwareDialog.shown = true;
			return;
		}

		maybePromptConfigReset(plan);

		if (plan.webInterfaceTouched && machineStore.connector?.hostname === location.host) {
			location.reload();
		}
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("notification.decompress.errorTitle"));
	} finally {
		installingFirmware.value = false;
	}
}

async function onFirmwareUpdateConfirmed(choices: { wifiServerSpiffs: boolean }) {
	const plan = firmwareDialog.plan;
	firmwareDialog.plan = null;
	if (!plan) {
		return;
	}
	try {
		await firmwareInstall.runUpdate(plan, choices);
	} finally {
		maybePromptConfigReset(plan);
	}
}

function onFirmwareUpdateCancelled() {
	const plan = firmwareDialog.plan;
	firmwareDialog.plan = null;
	if (plan) {
		maybePromptConfigReset(plan);
	}
}

function maybePromptConfigReset(plan: FirmwareUpdatePlan) {
	if (plan.configReplaced && !isPrinting(machineStore.model.state.status)) {
		configUpdatedDialog.shown = true;
	}
}

// #endregion

// #region Factory reset

// Wipes the persisted settings + cache (locally and on the board), drops a fresh copy of the
// factory-defaults file when one is present on the SD card, then reloads. Wraps
// settingsStore.reset() with a confirm dialog and a small busy flag so the button can show a
// spinner during the (typically brief) async file-delete chain
const factoryResetDialog = ref(false);
const resettingSettings = ref(false);

function askFactoryReset() {
	factoryResetDialog.value = true;
}

async function confirmFactoryReset() {
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

// #endregion
</script>

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
