<style scoped>
.hub-tile-badge {
	position: absolute;
	top: 6px;
	right: 6px;
}
</style>

<template>
	<v-container class="pa-3">
		<v-row density="compact">
			<v-col v-for="item in menuStore.allItems" :key="item.path" cols="6" sm="3">
				<v-card :to="hubTilePath(item)" min-height="110" variant="flat"
						:style="hubTileStyle(item)"
						class="d-flex flex-column align-center justify-center pa-3 h-100 position-relative">
					<NavMenuBadge v-if="resolveBadge(item)" :badge="resolveBadge(item)!"
								  size="default" no-clear class="hub-tile-badge" />
					<v-icon :icon="item.icon" size="36" class="mb-2" />
					<span class="text-title-medium text-center">
						{{ item.translated ? item.caption : $t(item.caption) }}
					</span>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup lang="ts">
import { type MenuBadge, type MenuItem, useMenuStore } from "@/stores/menu";

const menuStore = useMenuStore();

// The Dashboard item's path is `/`, which is also where this hub lives, so a literal `/` link
// would be a self-navigation vue-router treats as a no-op. Route through /Dashboard (a distinct
// record rendering the same dashboard) so the tile actually navigates
function hubTilePath(item: MenuItem): string {
	return item.path === "/" ? "/Dashboard" : item.path;
}

function resolveBadge(item: MenuItem): MenuBadge | null {
	return item.badge?.() ?? null;
}

// A category colour resolves to the `--dwc-category-<name>` palette var (defined in
// settings.scss); a very low opacity overlay tints the tile without going opaque. An
// unrecognised name leaves rgba() with an empty channel list, which the browser drops, so the
// tile simply renders untinted - plugins can register a colour by adding their own palette var
function hubTileStyle(item: MenuItem): Record<string, string> {
	const category = menuStore.categories.find((c) => c.key === item.category);
	const color = item.color ?? category?.color;
	return color ? { backgroundColor: `rgba(var(--dwc-category-${color}), 0.08)` } : {};
}
</script>
