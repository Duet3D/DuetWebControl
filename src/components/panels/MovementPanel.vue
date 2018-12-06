<style scoped>
.dropdown-btn {
	border-radius: 2px;
	background: transparent;
justify-content: center;
min-width: 0;
width: 36px;
}
</style>

<template>
	<base-panel v-auto-size>
		<template slot="title">
			<code-btn color="primary" small code="G28">Home All</code-btn>
			<v-spacer></v-spacer>
			Head Movement
			<v-spacer></v-spacer>
			<code-btn color="primary" small code="G32" class="mr-0">Auto Bed Compensation</code-btn>
			<v-menu offset-y left :close-on-content-click="false" :disabled="frozen">
				<template slot="activator">
					<v-btn color="primary" small class="ml-0 dropdown-btn" :disabled="frozen"><v-icon>arrow_drop_down</v-icon></v-btn>
				</template>

				<v-card>
					<v-layout justify-center column class="pt-2 px-2">
						TODO some more stuff here, see DWC1
					</v-layout>
				</v-card>
			</v-menu>
		</template>
	</base-panel>
</template>

<script>
'use strict'
import { mapGetters } from 'vuex'

export default {
	computed: mapGetters('ui', ['frozen'])
}
</script>
