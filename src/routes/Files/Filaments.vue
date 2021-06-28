<template>
	<v-row>
		<v-col>
			<filament-file-list></filament-file-list>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { registerRoute } from '..'

export default {
	install() {
		// Register a route via Files -> Filaments
		registerRoute(this, {
			Files: {
				Filaments: {
					icon: 'mdi-database',
					caption: 'menu.files.filaments',
					path: '/Files/Filaments'
				}
			}
		});
	}
}
</script>
