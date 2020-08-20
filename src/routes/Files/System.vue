<template>
	<v-row>
		<v-col>
			<system-file-list></system-file-list>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { registerRoute } from '..'

export default {
	install() {
		// Register a route via Files -> System
		registerRoute(this, {
			Files: {
				System: {
					icon: 'mdi-cog',
					caption: 'menu.files.system',
					path: '/Files/System'
				}
			}
		});
	}
}
</script>
