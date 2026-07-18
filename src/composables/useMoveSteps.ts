import { AxisLetter } from "@duet3d/objectmodel";
import type { Ref } from "vue";

import { getNumericInput } from "@/composables/useInputDialog";
import i18n from "@/i18n";

/**
 * Move steps (in mm) per axis letter as shown on the jog buttons. Axes without their own entry fall
 * back to the `default` entry, whose length defines how many buttons are rendered
 */
export type MoveStepMap = Record<string, Array<number>>;

/**
 * Move steps a component starts with. Returns a fresh map so components never share the arrays
 */
export function defaultMoveSteps(): MoveStepMap {
	return {
		X: [300, 200, 100, 50, 10, 1, 0.1],
		Y: [300, 200, 100, 50, 10, 1, 0.1],
		Z: [200, 150, 50, 25, 5, 0.5, 0.05],
		default: [300, 200, 100, 50, 10, 1, 0.1]
	};
}

/**
 * Grid class hiding a move button below the breakpoint that has room for it. Steps are ordered
 * coarse to fine, and the coarse end is revealed as the viewport grows: three buttons are always
 * shown, xl adds a fourth coarse step and xxl the two coarsest ones
 *
 * Uses d-{bp}-block, not d-{bp}-flex: d-flex on a single-child v-col shrinks the button to its
 * intrinsic width and leaves gaps, while d-block matches v-col's natural display so `block` fills
 * the cell
 * @param index Move step index
 * @param compact Whether the buttons sit in a narrow container (CNC layout, message box dialog),
 * which delays the second-finest step to xl instead of showing it from sm
 */
export function getMoveCellClass(index: number, compact?: boolean): string {
	if (index === 0 || index === 1) {
		return "d-none d-xxl-block";
	}
	if (index === 2) {
		return "d-none d-xl-block";
	}
	if (index === 5) {
		return compact ? "d-none d-xl-block" : "d-none d-sm-block";
	}
	return "";
}

/**
 * Move-step accessors for a component holding its own {@link MoveStepMap}, so the jog buttons of the
 * movement panel and of M291 axis controls can be configured independently of each other
 * @param settings Component settings holding the move steps
 */
export function useMoveSteps(settings: Ref<{ moveSteps: MoveStepMap }>) {
	const numMoveSteps = computed(() => settings.value.moveSteps.default.length);

	function moveSteps(axis: AxisLetter): Array<number> {
		return settings.value.moveSteps[axis] ?? settings.value.moveSteps.default;
	}

	async function showMoveStepDialog(axis: AxisLetter, index: number) {
		const value = await getNumericInput(i18n.global.t("dialog.changeMoveStep.title"), i18n.global.t("dialog.changeMoveStep.prompt"), moveSteps(axis)[index]);
		if (value === null) {
			return;
		}

		if (settings.value.moveSteps[axis] === undefined) {
			settings.value.moveSteps[axis] = settings.value.moveSteps.default.slice();
		}
		settings.value.moveSteps[axis][index] = value;
	}

	return { numMoveSteps, moveSteps, showMoveStepDialog };
}
