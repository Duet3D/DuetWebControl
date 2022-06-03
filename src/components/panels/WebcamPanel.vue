<style scoped>
iframe {
	width: 100%;
	height: 100%;
	border: 0px;
	overflow: hidden;
}

img {
	max-width: 100%;
	max-height: 100%;
}

.img-container {
	overflow: hidden;
}

.flip-x {
	-moz-transform: scaleX(-1);
	-o-transform: scaleX(-1);
	-webkit-transform: scaleX(-1);
	transform: scaleX(-1);
	filter: FlipH;
	-ms-filter: "FlipH";
}

.flip-y {
	-moz-transform: scaleY(-1);
	-o-transform: scaleY(-1);
	-webkit-transform: scaleY(-1);
	transform: scaleY(-1);
	filter: FlipV;
	-ms-filter: "FlipV";
}

.rotate-90 {
	transform: rotate(90deg);
	-ms-transform: rotate(90deg);
	-moz-transform: rotate(90deg);
	-webkit-transform: rotate(90deg);
	-o-transform: rotate(90deg);
}

.rotate-180 {
	transform: rotate(180deg);
	-ms-transform: rotate(180deg);
	-moz-transform: rotate(180deg);
	-webkit-transform: rotate(180deg);
	-o-transform: rotate(180deg);
}

.rotate-270 {
	transform: rotate(270deg);
	-ms-transform: rotate(270deg);
	-moz-transform: rotate(270deg);
	-webkit-transform: rotate(270deg);
	-o-transform: rotate(270deg);
}
</style>

<template>
	<v-card>
		<v-card-title>
			{{ $t('panel.webcam.caption') }}
		</v-card-title>

		<v-card-text class="pa-0 img-container">
			<v-responsive v-if="webcam.embedded" :aspect-ratio="16/9">
				<iframe :src="webcam.url" :class="classList"></iframe>
			</v-responsive>

			<a v-else :href="webcam.liveUrl ? webcam.liveUrl : 'javascript:void(0)'">
				<img :alt="$t('panel.webcam.alt')" :src="active ? url : ''" :class="classList">
			</a>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

export default {
	computed: {
		...mapState('settings', ['webcam']),
		...mapGetters('machine', ['connector']),
		classList() {
			const result = [];

			if (this.webcam.flip === 'x' || this.webcam.flip === 'both') {
				result.push('flip-x');
			}
			if (this.webcam.flip === 'y' || this.webcam.flip === 'both') {
				result.push('flip-y');
			}

			if (this.webcam.rotation === 90) {
				result.push('rotate-90');
			} else if (this.webcam.rotation === 180) {
				result.push('rotate-180');
			} else if (this.webcam.rotation === 270) {
				result.push('rotate-270');
			}

			return result;
		}
	},
	data() {
		return {
			active: true,
			updateTimer: null,
			url: ''
		}
	},
	activated() {
		this.active = true;
	},
	deactivated() {
		this.active = false;
	},
	methods: {
		updateWebcam() {
			let url = this.webcam.url.replace('[HOSTNAME]', this.connector ? this.connector.hostname : location.hostname);
			if (this.webcam.updateInterval > 0) {
				if (this.webcam.useFix) {
					url += "_" + Math.random();
				} else {
					if (url.indexOf("?") === -1) {
						url += "?dummy=" + Math.random();
					} else {
						url += "&dummy=" + Math.random();
					}
				}
			}
			this.url = url;
		}
	},
	mounted() {
		if (!this.webcam.embedded) {
			this.updateWebcam();
			if (this.webcam.updateInterval > 0) {
				this.updateTimer = setInterval(this.updateWebcam, this.webcam.updateInterval);
			}
		}
	},
	watch: {
		webcam: {
			deep: true,
			handler() {
				if (this.webcam.updateInterval === 0) {
					// For persistent images we need to apply updates independently of the update loop
					this.updateWebcam();
				}
			}
		}
	},
	beforeDestroy() {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
		}
	}
}
</script>
