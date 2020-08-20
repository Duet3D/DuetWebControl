<template>
	<v-row>
		<v-col>
			<job-file-list></job-file-list>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { registerRoute } from '..'

export default {
	install() {
		// Register a route via Files -> Jobs
		registerRoute(this, {
			Files: {
				Jobs: {
					icon: 'mdi-play',
					caption: 'menu.files.jobs',
					path: '/Files/Jobs'
				}
			}
		});
	}
}
</script>
