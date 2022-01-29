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
import store from '@/store'
import { MachineMode } from "@/store/machine/modelEnums";

export default {
	install() {
		// Register a route via Files -> Filaments
		registerRoute(this, {
			Files: {
				Filaments: {
					icon: 'mdi-database',
					caption: 'menu.files.filaments',
					path: '/Files/Filaments',
					condition: () => !store.state.machine.model.state.machineMode || store.state.machine.model.state.machineMode === MachineMode.fff
				}
			}
		});
	}
}
</script>
