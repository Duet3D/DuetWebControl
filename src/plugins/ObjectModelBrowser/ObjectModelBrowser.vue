<template>
	<v-row v-scroll="onScroll">
		<v-col ref="leftContainer" :cols="(active.length === 0) ? 12 : 6">
			<v-treeview :items="modelTree" open-on-click activatable :active.sync="active">
				<template #label="{ item }">
					{{ item.getLabel ? item.getLabel() : item.name }}
				</template>
				<template #append="{ item }">
					<v-chip v-if="item.type">{{ item.type }}</v-chip>
				</template>
			</v-treeview>

			<div class="d-flex justify-center">
				<v-btn v-show="active.length === 0" color="info" class="mt-3" :disabled="uiFrozen" :elevation="1"
					   @click="refresh">
					<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
				</v-btn>
			</div>
		</v-col>

		<v-col ref="rightContainer" v-show="active.length !== 0" cols="6">
			<v-row class="my-1">
				<v-col class="pt-4">
					Selected node:
					<template v-if="active.length > 0">
						<input ref="activeInput" type="text" :value="active[0]" class="text-center" readonly
							   @click="$event.target.select()" />
						<v-icon small class="ml-1" @click="copy">mdi-content-copy</v-icon>
					</template>
					<template v-else>
						None
					</template>
				</v-col>
				<v-col cols="auto">
					<v-btn color="info" :disabled="uiFrozen" :elevation="1" @click="refresh">
						<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
					</v-btn>
				</v-col>
			</v-row>

			<v-alert :value="apiFileError !== null" outlined type="warning">
				Documentation is not available (/www/DuetAPI.xml not found)
			</v-alert>

			<v-card v-show="apiDocumentation !== null" outlined class="pa-3">
				<template v-if="apiDocumentationSummary !== null">
					<h4>Summary</h4>
					<span v-html="apiDocumentationSummary"></span>
				</template>

				<template v-if="apiDocumentationRemarks !== null">
					<br v-if="apiDocumentationSummary !== null">
					<h4>Remarks</h4>
					<span v-html="apiDocumentationRemarks"></span>
				</template>
			</v-card>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

// List of regexs to resolve properties in the XML documentation.
// It's a shame the C# XML compiler doesn't include the property types...
const propertyAdjustments = [
	{ pattern: /(\[\d+\])+$/g, substitute: '' },
	{ pattern: /s\[\d+\]/g, substitute: '' },
	{ pattern: /.+\.mcutemp\./, substitute: 'minmaxcurrent`1.' },
	{ pattern: /.+\.v12\./, substitute: 'minmaxcurrent`1.' },
	{ pattern: /.+\.vin\./, substitute: 'minmaxcurrent`1.' },
	{ pattern: 'fan.thermostatic', substitute: 'fanthermostaticcontrol' },
	{ pattern: /^input\./, substitute: 'inputchannel.' },
	{ pattern: 'heat.heater.model.pid.', substitute: 'heatermodelpid.' },
	{ pattern: 'job.file.', substitute: 'parsedfileinfo.' },
	{ pattern: 'parsedfileinfo.thumbnail.', substitute: 'parsedthumbnail.' },
	{ pattern: 'move.axe.', substitute: 'axis.' },
	{ pattern: /^move.calibration.(final|initial)./, substitute: 'movedeviations.' },
	{ pattern: 'move.idle.', substitute: 'motorsidlecontrol.' },
	{ pattern: /^move.queue\[\d+\]\./, substitute: 'movequeueitem.' },
	{ pattern: /^sensors.analog\[\d+\]\./, substitute: 'analogsensor.' },
	{ pattern: /^sensors.gpin\[\d+\]\./, substitute: 'gpinputport.' },
	{ pattern: /^state.gpout\[\d+\]\./, substitute: 'gpoutputport.' },
];

export default {
	computed: {
		...mapState('machine', ['model']),
		...mapGetters(['uiFrozen']),
		apiDocumentation() {
			if (this.apiFile !== null && this.active.length > 0) {
				let selectedNode = this.active[0].toLowerCase();
				propertyAdjustments.forEach(item => selectedNode = selectedNode.replace(item.pattern, item.substitute));
				// NOTE: If kinematics properties are queried, they may need require treatment here

				const propertyNames = [selectedNode], segments = selectedNode.split('.');
				if (segments.length > 2) {
					propertyNames.push(`${segments[0]}${segments[1]}.${segments.slice(2).reduce((a, b) => a + '.' + b)}`);
					propertyNames.push(segments.slice(1).reduce((a, b) => a + '.' + b));
					if (segments.length > 3) {
						propertyNames.push(`${segments[0]}${segments[1]}${segments[2]}.${segments.slice(3).reduce((a, b) => a + '.' + b)}`);
						propertyNames.push(segments.slice(2).reduce((a, b) => a + '.' + b));
					}
				}

				const members = this.apiFile.documentElement.getElementsByTagName('member');
				for (let i = 0; i < propertyNames.length; i++) {
					const propertyName = propertyNames[i];
					for (let k = 0; k < members.length; k++) {
						const node = members[k], tagName = node.getAttribute('name');
						if (tagName.startsWith('P:') && tagName.toLowerCase().endsWith(propertyName)) {
							return node;
						}
					}
				}
			}
			return null;
		},
		apiDocumentationSummary() {
			if (this.apiDocumentation !== null) {
				const nodes = this.apiDocumentation.getElementsByTagName('summary');
				return (nodes.length > 0) ? nodes[0].textContent.replace(/\n/g, '<br>') : null;
			}
			return null;
		},
		apiDocumentationRemarks() {
			if (this.apiDocumentation !== null) {
				const nodes = this.apiDocumentation.getElementsByTagName('remarks');
				return (nodes.length > 0) ? nodes[0].textContent.replace(/\n/g, '<br>') : null;
			}
			return null;
		}
	},
	data() {
		return {
			active: [],
			modelTree: [],
			apiFile: null,
			apiFileError: null,
			documentationFloating: false
		}
	},
	async activated() {
		if (this.apiFile === null) {
			try {
				const apiFileContent = await this.download({
					filename: '0:/www/DuetAPI.xml',
					type: 'text',
					showError: false,
					showSuccess: false
				});

				const parser = new DOMParser();
				this.apiFile = parser.parseFromString(apiFileContent, 'application/xml');
				this.apiFileError = null;
			} catch (e) {
				this.apiFileError = e.toString();
				console.warn(e);
			}
		}
		this.refresh();
	},
	methods: {
		...mapActions('machine', ['download']),
		makeModelTree(obj, path) {
			if (obj instanceof Array) {
				return obj.map(function(item, index) {
					const itemPath = path.slice(0);
					itemPath[itemPath.length - 1] += `[${index}]`;

					return {
						id: itemPath.join('.'),
						getLabel: () => this.getItemLabel(index, item),
						type: this.getItemType(item),
						children: this.makeModelTree(item, itemPath)
					}
				}, this);
			}
			if (obj !== null && obj instanceof Object) {
				return Object.keys(obj)
					.sort()
					.map(function(key) {
						const itemPath = path.slice(0);
						itemPath.push(key);

						return {
							id: itemPath.join('.'),
							getLabel: () => this.getItemLabel(key, obj[key]),
							type: this.getItemType(obj[key]),
							children: this.makeModelTree(obj[key], itemPath)
						};
					}, this);
			}
			return [];
		},
		getItemLabel(name, value) {
			try {
				if (value === null) {
					return `${name} = null`;
				}
				if ((value || value === '') && value.constructor === String) {
					return `${name} = "${value}"`;
				}
				if (value instanceof Object) {
					return name;
				}
				return `${name} = ${value}`;
			} catch {
				return `${name} = ${this.$t('generic.noValue')}`;
			}
		},
		getItemType(obj) {
			if (obj instanceof Array) {
				return 'array';
			}
			if (obj !== null && obj instanceof Object) {
				return 'object';
			}
			return 'value';
		},
		copy() {
			this.$refs.activeInput.focus();
			this.$refs.activeInput.select();
			document.execCommand('copy');
		},
		refresh() {
			this.modelTree = this.makeModelTree(this.model, []);
		},
		onScroll() {
			const documentationTop = this.$refs.rightContainer.getBoundingClientRect().y;
			if (this.$refs.leftContainer.getBoundingClientRect().y === documentationTop && documentationTop < 64) {
				this.$refs.rightContainer.style.paddingTop = `${-documentationTop + 60}px`;
			} else {
				this.$refs.rightContainer.style.paddingTop = '0px';
			}
		}
	},
	watch: {
		active(to) {
			if (to.length > 0) {
				this.$nextTick(() => {
					this.onScroll();
					if (this.$refs.activeInput) {
						this.$refs.activeInput.style.width = '0px';
						this.$nextTick(() => {
							this.$refs.activeInput.style.width = `${this.$refs.activeInput.scrollWidth + 8}px`;
						});
                    }
				});
			}
		}
	}
}
</script>
