<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">polymer</v-icon> Macros
		</v-card-title>

		<v-card-text class="pa-0">
			<v-list class="pt-0" dense>
				<v-list-tile
					v-for="item in items"
					:key="item.title"
					avatar
					@click=""
					>
					<v-list-tile-avatar>
						<v-icon :class="[item.iconClass]">{{ item.icon }}</v-icon>
					</v-list-tile-avatar>

					<v-list-tile-content>
						<v-list-tile-title>{{ item.title }}</v-list-tile-title>
						<v-list-tile-sub-title>{{ item.subtitle }}</v-list-tile-sub-title>
					</v-list-tile-content>
				</v-list-tile>

				<v-list-tile
					v-for="item in items2"
					:key="item.title"
					avatar
					@click=""
					>
					<v-list-tile-avatar>
						<v-icon :class="[item.iconClass]">{{ item.icon }}</v-icon>
					</v-list-tile-avatar>

					<v-list-tile-content>
						<v-list-tile-title>{{ item.title }}</v-list-tile-title>
						<v-list-tile-sub-title>{{ item.subtitle }}</v-list-tile-sub-title>
					</v-list-tile-content>
				</v-list-tile>
			</v-list>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

export default {
	data () {
		return {
			items: [
				{ icon: 'folder', iconClass: 'grey lighten-1 white--text', title: 'Directory A'},
				{ icon: 'folder', iconClass: 'grey lighten-1 white--text', title: 'Directory B'},
				{ icon: 'folder', iconClass: 'grey lighten-1 white--text', title: 'Directory C'}
			],
			items2: [
				{ icon: 'assignment', iconClass: 'blue white--text', title: 'File A'},
				{ icon: 'assignment', iconClass: 'blue white--text', title: 'File B'}
			]
		}
	}
}
</script>
