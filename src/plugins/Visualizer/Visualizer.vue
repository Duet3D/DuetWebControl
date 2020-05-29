<template>
	<span>
		G-Code Visualizer
	</span>
</template>

<script>
'use strict'

import { registerRoute } from '../../routes'

export default {
	install() {
		// Register a route via Job -> Visualizer
		registerRoute(this, {
			Job: {
				Visualizer: {
					icon: 'mdi-rotate-3d',
					caption: 'menu.job.visualizer',
					path: '/Job/Visualizer'
				}
			}
		});
	}
}
</script>
