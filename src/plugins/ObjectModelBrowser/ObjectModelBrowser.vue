<template>
	<v-row v-scroll="onScroll">
		<v-col ref="leftContainer" :cols="(active.length === 0) ? 12 : 6">
			<v-text-field v-model="search" prepend-inner-icon="mdi-magnify" :placeholder="$t('plugins.objectModelBrowser.search')"
						  clearable dense outlined hide-details class="mb-3" />
			<v-treeview :items="modelTree" :search="search" :filter="filterItem" open-on-click activatable :active.sync="active">
				<template #label="{ item }">
					{{ item.getLabel() }}
				</template>
				<template #append="{ item }">
					<v-chip v-if="item.type">
						{{ item.type }}
					</v-chip>
				</template>
			</v-treeview>

			<div class="d-flex justify-center">
				<v-btn v-show="active.length === 0" color="info" class="mt-3" :disabled="uiFrozen" :elevation="1"
					   @click="refresh">
					<v-icon class="mr-1">mdi-refresh</v-icon>
					{{ $t("button.refresh.caption") }}
				</v-btn>
			</div>
		</v-col>

		<v-col ref="rightContainer" v-show="active.length !== 0" cols="6">
			<v-row class="my-1">
				<v-col class="pt-4">
					{{ $t("plugins.objectModelBrowser.selectedNode" )}}
					<template v-if="active.length > 0">
						<input ref="activeInput" type="text" :value="active[0]" class="text-center" :class="darkTheme ? 'white--text' : ''" readonly @click="selectInput">
						<v-icon small class="ml-1" @click="copy">mdi-content-copy</v-icon>
					</template>
					<template v-else>
						{{ $t("plugins.objectModelBrowser.none") }}
					</template>
				</v-col>
				<v-col cols="auto">
					<v-btn color="info" :disabled="uiFrozen" :elevation="1" @click="refresh">
						<v-icon class="mr-1">mdi-refresh</v-icon>
						{{ $t("button.refresh.caption") }}
					</v-btn>
				</v-col>
			</v-row>

			<v-alert :value="apiFileError !== null" outlined type="warning">
				{{ $t("plugins.objectModelBrowser.documentationNotAvailable") }}
			</v-alert>

			<v-card v-show="apiDocumentation !== null" outlined class="pa-3">
				<template v-if="apiDocumentationSummary !== null">
					<h4>{{ $t("plugins.objectModelBrowser.summary") }}</h4>
					<span v-html="apiDocumentationSummary"></span>
				</template>

				<template v-if="apiDocumentationRemarks !== null">
					<br v-if="apiDocumentationSummary !== null">
					<h4>{{ $t("plugins.objectModelBrowser.remarks") }}</h4>
					<span v-html="apiDocumentationRemarks"></span>
				</template>
			</v-card>
		</v-col>
	</v-row>
</template>

<script lang="ts">
import ObjectModel, { DriverId, isDriverId } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";
import { loadDuetApi, getDuetApiDocument, getDuetApiError, lookupApiMember, extractTag } from "@/utils/duetApi";

interface ModelTreeItem {
	id: string;
	getLabel: () => string | number;
	type: "array" | "object" | "value";
	children: Array<ModelTreeItem>;
}

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		model(): ObjectModel { return store.state.machine.model; },
		darkTheme(): boolean { return store.state.settings.darkTheme; },
		apiDocumentation(): Element | null {
			if (this.apiFile !== null && this.active.length > 0) {
				return lookupApiMember(this.apiFile, this.active[0]);
			}
			return null;
		},
		apiDocumentationSummary(): string | null {
			return this.apiDocumentation !== null ? extractTag(this.apiDocumentation, "summary") : null;
		},
		apiDocumentationRemarks(): string | null {
			return this.apiDocumentation !== null ? extractTag(this.apiDocumentation, "remarks") : null;
		}
	},
	data() {
		return {
			active: new Array<string>(),
			search: "",
			modelTree: new Array<ModelTreeItem>,
			apiFile: null as Document | null,
			apiFileError: null as string | null,
			documentationFloating: false
		}
	},
	async activated() {
		if (this.apiFile === null && this.apiFileError === null) {
			this.apiFile = await loadDuetApi();
			this.apiFileError = getDuetApiError();
			if (this.apiFile === null && this.apiFileError === null) {
				// Loaded into cache by another caller between our null check and the await - re-read
				this.apiFile = getDuetApiDocument();
			}
		}
		this.refresh();
	},
	methods: {
		filterItem(item: ModelTreeItem, search: string): boolean {
			const term = search.toLowerCase();
			return item.id.toLowerCase().includes(term) || String(item.getLabel()).toLowerCase().includes(term);
		},
		makeModelTree(obj: object | Array<any> | null, path: Array<string>, parentObj?: any): Array<ModelTreeItem> {
			if (obj instanceof Array) {
				const that = this;
				return obj.map((item, index) => {
					const itemPath = path.slice(0), parentPropertyName = itemPath[itemPath.length - 1];
					itemPath[itemPath.length - 1] += `[${index}]`;

					return {
						id: itemPath.join('.'),
						// FIXME Vue 2 requires the array's parent object to be referenced, should be obsolete in Vue 3
						getLabel: () => {
							if (parentObj instanceof Map) {
								return that.getItemLabel(index, parentObj.get(parentPropertyName)[index]);
							}
							return parentPropertyName.includes('[') ? item.toString() : that.getItemLabel(index, parentObj[parentPropertyName][index]);
						},
						type: that.getItemType(item),
						children: that.makeModelTree(item, itemPath, obj)
					}
				});
			} else if (obj instanceof Map) {
				return Array.from(obj.keys())
					.sort()
					.map((key) => {
						const itemPath = path.slice(0);
						itemPath.push(key);

						return {
							id: itemPath.join('.'),
							getLabel: () => this.getItemLabel(key, obj.get(key)),
							type: this.getItemType(obj.get(key)),
							children: this.makeModelTree(obj.get(key), itemPath, obj)
						};
					}, this);
			} else if (!isDriverId(obj) && (obj instanceof Object)) {
				return Object.keys(obj)
					.sort()
					.map((key) => {
						const itemPath = path.slice(0);
						itemPath.push(key);

						return {
							id: itemPath.join('.'),
							getLabel: () => this.getItemLabel(key, (obj as any)[key]),
							type: this.getItemType((obj as any)[key]),
							children: this.makeModelTree((obj as any)[key], itemPath, obj)
						};
					}, this);
			}
			return [];
		},
		getItemLabel(name: string | number, value: any) {
			try {
				if (value === null) {
					return `${name} = null`;
				}
				if (typeof value === "string" && (value || value === "")) {
					return `${name} = "${value}"`;
				}
				if (isDriverId(value)) {
					// FIXME: No longer needed once upgraded to Vue 3
					const driverId = new DriverId();
					driverId.update(value);
					return `${name} = "${driverId.toString()}"`;
				}
				if (value instanceof Object) {
					return name;
				}
				return `${name} = ${value}`;
			} catch {
				return `${name} = ${this.$t("generic.noValue")}`;
			}
		},
		getItemType(obj: any) {
			if (obj instanceof Array) {
				return "array";
			}
			if (obj !== null && !isDriverId(obj) && obj instanceof Object) {
				return "object";
			}
			return "value";
		},
		selectInput(e: Event) {
			(e.target as HTMLInputElement).select();
		},
		copy() {
			(this.$refs.activeInput as HTMLInputElement).focus();
			(this.$refs.activeInput as HTMLInputElement).select();
			document.execCommand("copy");
		},
		refresh() {
			this.modelTree = this.makeModelTree(this.model, []);
		},
		onScroll() {
			const rightContainer = this.$refs.rightContainer as HTMLDivElement;
			const documentationTop = rightContainer.getBoundingClientRect().y;
			if ((this.$refs.leftContainer as HTMLDivElement).getBoundingClientRect().y === documentationTop && documentationTop < 64) {
				rightContainer.style.paddingTop = `${-documentationTop + 60}px`;
			} else {
				rightContainer.style.paddingTop = "0px";
			}
		}
	},
	watch: {
		active(to) {
			if (to.length > 0) {
				this.$nextTick(() => {
					this.onScroll();

					const activeInput = this.$refs.activeInput as HTMLInputElement | undefined;
					if (activeInput) {
						activeInput.style.width = "0px";
						this.$nextTick(() => {
							activeInput.style.width = `${activeInput.scrollWidth + 8}px`;
						});
                    }
				});
			}
		}
	}
});
</script>
