<template>
	<v-row>
		<v-col>
			<display-file-list></display-file-list>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { registerRoute } from '..'
import store from '../../store'

export default {
	install() {
		// Register a route via Files -> Display
		registerRoute(this, {
			Files: {
				Display: {
					icon: 'mdi-format-list-numbered',
					caption: 'menu.files.menu',
					path: '/Files/Display',
					condition: () => (store.state.machine.model.boards.length > 0) && store.state.machine.model.boards[0].supports12864
				}
			}
		});
	}
}
</script>
