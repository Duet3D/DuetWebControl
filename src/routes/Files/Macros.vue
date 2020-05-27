<template>
	<v-row>
		<v-col>
			<macro-file-list></macro-file-list>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { registerRoute } from '..'

export default {
	install() {
		// Register a route via Files -> Macros
		registerRoute(this, {
			Files: {
				Macros: {
					icon: 'mdi-polymer',
					caption: 'menu.files.macros',
					path: '/Files/Macros'
				}
			}
		});
	}
}
</script>
