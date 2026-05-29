// Evaluate user-entered expressions against the live object model for custom chart series. The
// expression references the model's top-level sections by name (e.g. "heat.heaters[0].avgPwm * 100")
// and may use Math. This runs the user's own input in their own browser - the same trust boundary as
// the G-code they already send - so a Function-based evaluator is acceptable here

import i18n from "@/i18n";

// Compiled functions keyed by expression. The cache is cleared whenever the set of model top-level
// keys changes so the baked-in parameter names always line up with the values passed at call time
const compiled = new Map<string, (...values: Array<unknown>) => unknown>();
let compiledKeySignature = "";

function compile(expr: string, keys: Array<string>): (...values: Array<unknown>) => unknown {
	const signature = keys.join(",");
	if (signature !== compiledKeySignature) {
		compiled.clear();
		compiledKeySignature = signature;
	}
	let fn = compiled.get(expr);
	if (!fn) {
		fn = new Function(...keys, `return (${expr});`) as (...values: Array<unknown>) => unknown;
		compiled.set(expr, fn);
	}
	return fn;
}

/**
 * Evaluate an expression against the object model, returning NaN when it can't be resolved to a
 * finite number (syntax error, missing field, division by zero, etc.) so the chart just draws a gap.
 */
export function evaluateExpression(expr: string, model: Record<string, unknown>): number {
	try {
		const keys = Object.keys(model);
		const result = compile(expr, keys)(...keys.map(key => model[key]));
		return (typeof result === "number" && isFinite(result)) ? result : NaN;
	} catch {
		return NaN;
	}
}

/**
 * Vuetify input rule: reject only expressions that fail to compile (syntax errors). An expression
 * that currently evaluates to NaN is still accepted - the field it references may be absent now
 * (e.g. a heater that doesn't exist yet) and appear later.
 */
export function validateExpression(expr: string): true | string {
	try {
		new Function(`return (${expr});`);
		return true;
	} catch {
		return i18n.global.t("chart.temperature.custom.invalidExpression");
	}
}
