<template>
	<v-row>
		<v-col>
			<webcam-panel></webcam-panel>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { registerRoute } from '..'
import store from '../../store'

export default {
	install() {
		// Register a route via Current Job -> Webcam
		registerRoute(this, {
			Job: {
				Webcam: {
					icon: 'mdi-webcam',
					caption: 'menu.job.webcam',
					path: '/Job/Webcam',
					condition: () => store.state.settings.webcam.url !== ''
				}
			}
		});
	}
}
</script>
