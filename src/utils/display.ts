import { AnalogSensor, AnalogSensorType, Axis, AxisLetter, MachineMode } from "@duet3d/objectmodel";
import Vue from "vue";

import i18n from "@/i18n";
import store from "@/store";
import { UnitOfMeasure } from "@/store/settings";

/**
 * Display a numeric value with a given precision and an optional unit.
 * @param value Value(s) to display
 * @param precision Optional number precision
 * @param unit Optional unit to append
 * @returns Formatted string
 */
export function display(value: number | Array<number> | string | null | undefined, precision?: number, unit?: string) {
	if (typeof value === "number") {
		if (isNaN(value)) {
			return i18n.t("generic.noValue");
		}
		return value.toFixed((precision !== undefined) ? precision : 2) + (unit ? (' ' + unit) : "");
	}
	if (value instanceof Array && value.length > 0) {
		return value.map(item => (item !== undefined) ? item.toFixed((precision !== undefined) ? precision : 0) + (unit ? (' ' + unit) : "")
			: i18n.t("generic.noValue")).join(", ");
	}
	return (value && value.constructor === String) ? value : i18n.t("generic.noValue");
}

/**
 * Display an axis position
 * @param axis Axis position to display
 * @returns Formatted axis position
 */
export function displayAxisPosition(axis: Axis, machinePosition: boolean = false) {
	let position = machinePosition ? axis.machinePosition : axis.userPosition;
	if (position === null) {
		return i18n.t("generic.noValue");
	}

	position = position / ((store.state.settings.displayUnits === UnitOfMeasure.imperial) ? 25.4 : 1);
	return axis.letter === AxisLetter.Z ? displayZ(position, false) : display(position, store.state.settings.decimalPlaces);
}

/**
 * Display a Z height (typically higher precision than other values)
 * @param value Z height value
 * @param showUnit Append the currently configured distance unit
 * @returns Formatted string
 */
export function displayZ(value: number | Array<number> | string | null | undefined, showUnit = true) {
	const decimalPlaces = Math.max((store.state.machine.model.state.machineMode === MachineMode.cnc) ? 3 : 2, store.state.settings.decimalPlaces);
	return display(value, decimalPlaces, showUnit ? "mm" : undefined);
}

/**
 * Display a sensor value with optional unit from square brackets in the name
 * @param sensor Sensor
 * @returns 
 */
export function displaySensorValue(sensor: AnalogSensor) {
    if (sensor.name) {
        const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
        if (matches) {
            return display(sensor.lastReading, 1, matches[2]);
        }
    }
    const unit = (sensor.type === AnalogSensorType.dhtHumidity) ? "%RH" : "°C";
    return display(sensor.lastReading, 1, unit);
}

/**
 * Display a size with proper units
 * @param bytes Size to format
 * @returns Formatted string
 */
export function displaySize(bytes: number | null | undefined) {
	if (typeof bytes !== "number") {
		return i18n.t("generic.noValue");
	}

	if (store.state.settings.useBinaryPrefix) {
		if (bytes > 1073741824) {	// GiB
			return (bytes / 1073741824).toFixed(1) + " GiB";
		}
		if (bytes > 1048576) {		// MiB
			return (bytes / 1048576).toFixed(1) + " MiB";
		}
		if (bytes > 1024) {			// KiB
			return (bytes / 1024).toFixed(1) + " KiB";
		}
	} else {
		if (bytes > 1000000000) {	// GB
			return (bytes / 1000000000).toFixed(1) + " GB";
		}
		if (bytes > 1000000) {		// MB
			return (bytes / 1000000).toFixed(1) + " MB";
		}
		if (bytes > 1000) {			// KB
			return (bytes / 1000).toFixed(1) + " KB";
		}
	}
	return bytes + " B";
}

/**
 * Display a move speed
 * @param speed Speed in mm/s
 * @returns Formatted move speed in mm/s or ipm
 */
export function displayMoveSpeed(speed: number | null | undefined) {
	if (typeof speed === "number" && store.state.settings.displayUnits === UnitOfMeasure.imperial) {
		return display(speed * 60 / 25.4, 1, i18n.t("panel.settingsAppearance.unitInchSpeed"));
	}
	return display(speed, 1, i18n.t("panel.settingsAppearance.unitMmSpeed"));
}

/**
 * Display a transfer speed with proper units
 * @param bytesPerSecond Speed to format
 * @returns Formatted string
 */
export function displayTransferSpeed(bytesPerSecond: number | null | undefined) {
	if (typeof bytesPerSecond !== "number") {
		return i18n.t("generic.noValue");
	}

	if (store.state.settings.useBinaryPrefix) {
		if (bytesPerSecond > 1073741824) {		// GiB
			return (bytesPerSecond / 1073741824).toFixed(2) + " GiB/s";
		}
		if (bytesPerSecond > 1048576) {			// MiB
			return (bytesPerSecond / 1048576).toFixed(2) + " MiB/s";
		}
		if (bytesPerSecond > 1024) {			// KiB
			return (bytesPerSecond / 1024).toFixed(1) + " KiB/s";
		}
	} else {
		if (bytesPerSecond > 1000000000) {		// GB
			return (bytesPerSecond / 1000000000).toFixed(2) + " GB/s";
		}
		if (bytesPerSecond > 1000000) {			// MB
			return (bytesPerSecond / 1000000).toFixed(2) + " MB/s";
		}
		if (bytesPerSecond > 1000) {			// KB
			return (bytesPerSecond / 1000).toFixed(1) + " KB/s";
		}
	}
	return bytesPerSecond.toFixed(1) + " B/s";
}

/**
 * Display remaining time
 * @param value Time to format (in s)
 * @param showTrailingZeroes Show trailing zeroes (defaults to false)
 * @returns Formatted string
 */
export function displayTime(value: number | null | undefined, showTrailingZeroes = false) {
	if (typeof value !== "number" || isNaN(value)) {
		return i18n.t('generic.noValue');
	}

	value = Math.round(value);
	if (value < 0) {
		value = 0;
	}

	let timeLeft = [], temp;
	if (value >= 86400) {
		temp = Math.floor(value / 86400);
		if (temp > 0) {
			timeLeft.push(temp + "d");
			value = value % 86400;
		}
	}
	if (value >= 3600) {
		temp = Math.floor(value / 3600);
		if (temp > 0) {
			timeLeft.push(temp + "h");
			value = value % 3600;
		}
	}
	if (value >= 60) {
		temp = Math.floor(value / 60);
		if (temp > 0) {
			timeLeft.push(((value > 9 || !showTrailingZeroes) ? temp : "0" + temp) + "m");
			value = value % 60;
		}
	}
	timeLeft.push(((value > 9 || !showTrailingZeroes) ? value.toFixed(0) : "0" + value.toFixed(0)) + "s");

	return timeLeft.join(' ');
}

/**
 * Indent  comments in a G-code file
 * @param content File content
 * @returns Indented file content
 */
export function indent(content: string): string {
    const lines = content.split('\n');

    // Find out how long the maximum command is
    let maxCommandLength = 0;
    for (const line of lines) {
		const commentIndex = line.indexOf(';');
		if (commentIndex > 0) {
			const commandLength = line.substring(0, commentIndex).trimEnd().length;
			if (commandLength > maxCommandLength) {
				maxCommandLength = commandLength;
			}
        }
    }

    // Align line comments
    let newResult = "";
    for (const line of lines) {
        const commentIndex = line.indexOf(';');
        if (commentIndex <= 0) {
            newResult += line + '\n';
		} else {
            const command = line.substring(0, commentIndex).trimEnd(), comment = line.substring(commentIndex);

            let indentation = "";
            for (let i = command.length; i < maxCommandLength + 1; i++) {
                indentation += ' ';
            }

            newResult += command + indentation + comment + '\n';
        }
    }
    return newResult.trim();
}

// Register display extensions
Vue.prototype.$display = display;
Vue.prototype.$displayAxisPosition = displayAxisPosition;
Vue.prototype.$displayZ = displayZ;
Vue.prototype.$displaySize = displaySize;
Vue.prototype.$displayMoveSpeed = displayMoveSpeed;
Vue.prototype.$displayTransferSpeed = displayTransferSpeed;
Vue.prototype.$displayTime = displayTime;
