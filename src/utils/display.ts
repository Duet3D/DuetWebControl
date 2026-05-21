import { AnalogSensor, AnalogSensorType, Axis, AxisLetter, MachineMode } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { UnitOfMeasure, useSettingsStore } from "@/stores/settings";
import { useMachineStore } from "@/stores/machine";

const MM_PER_INCH = 25.4;

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
			return i18n.global.t("generic.noValue");
		}
		return value.toFixed((precision !== undefined) ? precision : 2) + (unit ? (' ' + unit) : "");
	}
	if (value instanceof Array && value.length > 0) {
		return value.map(item => (item !== undefined)
			? item.toFixed((precision !== undefined) ? precision : 0) + (unit ? (' ' + unit) : "")
			: i18n.global.t("generic.noValue")).join(", ");
	}
	return (value && value.constructor === String) ? value : i18n.global.t("generic.noValue");
}

/**
 * Display an axis position
 * @param axis Axis position to display
 * @returns Formatted axis position
 */
export function displayAxisPosition(axis: Axis, machinePosition: boolean = false) {
	const raw = machinePosition ? axis.machinePosition : axis.userPosition;
	if (raw === null) {
		return i18n.global.t("generic.noValue");
	}

	const settingsStore = useSettingsStore();
	const position = (settingsStore.displayUnits === UnitOfMeasure.imperial) ? raw / MM_PER_INCH : raw;
	return axis.letter === AxisLetter.Z ? displayZ(position, false) : display(position, settingsStore.decimalPlaces);
}

/**
 * Display a Z height (typically higher precision than other values)
 * @param value Z height value
 * @param showUnit Append the currently configured distance unit
 * @returns Formatted string
 */
export function displayZ(value: number | Array<number> | string | null | undefined, showUnit = true) {
	const machineStore = useMachineStore();
	const settingsStore = useSettingsStore();
	const imperial = settingsStore.displayUnits === UnitOfMeasure.imperial;
	// CNC defaults to 3 decimals for Z, FFF to 2; never go below the user's chosen precision
	const decimals = Math.max(
		(machineStore.model.state.machineMode === MachineMode.cnc) ? 3 : 2,
		settingsStore.decimalPlaces
	);
	return display(value, decimals, showUnit ? (imperial ? "in" : "mm") : undefined);
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
 * Display the name of an extra (non-heater) analog sensor, dropping a trailing [unit] suffix
 * @param sensor Sensor
 * @param index Index of the sensor, used as a fallback when it has no name
 * @returns Formatted sensor name
 */
export function formatExtraSensorName(sensor: AnalogSensor, index: number): string {
	if (sensor.name) {
		const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
		if (matches) {
			return matches[1];
		}
		return sensor.name;
	}
	return i18n.global.t("panel.tools.extra.sensorIndex", [index]);
}

/**
 * Display a size with proper units
 * @param bytes Size to format
 * @returns Formatted string
 */
export function displaySize(bytes: number | null | undefined) {
	if (typeof bytes !== "number") {
		return i18n.global.t("generic.noValue");
	}

	const settingsStore = useSettingsStore();
	if (settingsStore.useBinaryPrefix) {
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
 * @returns Formatted move speed in mm/s (or mm/min in CNC mode, or ipm in imperial mode)
 */
export function displayMoveSpeed(speed: number | null | undefined) {
	if (typeof speed === "number") {
		const settingsStore = useSettingsStore();
		const machineStore = useMachineStore();
		if (settingsStore.displayUnits === UnitOfMeasure.imperial) {
			return display(speed * 60 / MM_PER_INCH, 1, "ipm");
		}
		if (machineStore.model.state.machineMode === MachineMode.cnc) {
			return display(speed * 60, 1, "mm/min");
		}
	}
	return display(speed, 1, "mm/s");
}

/**
 * Display a transfer speed with proper units
 * @param bytesPerSecond Speed to format
 * @returns Formatted string
 */
export function displayTransferSpeed(bytesPerSecond: number | null | undefined) {
	if (typeof bytesPerSecond !== "number") {
		return i18n.global.t("generic.noValue");
	}

	const settingsStore = useSettingsStore();
	if (settingsStore.useBinaryPrefix) {
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
		return i18n.global.t("generic.noValue");
	}

	value = Math.round(value);
	if (value < 0) {
		value = 0;
	}

	const timeLeft = [];
	let temp;
	if (value >= 3600) {
		temp = Math.floor(value / 3600);
		if (temp > 0) {
			timeLeft.push(temp + 'h');
			value = value % 3600;
		}
	}
	if (value >= 60) {
		temp = Math.floor(value / 60);
		if (temp > 0) {
			timeLeft.push(((value > 9 || !showTrailingZeroes) ? temp : '0' + temp) + 'm');
			value = value % 60;
		}
	}
	timeLeft.push(((value > 9 || !showTrailingZeroes) ? value.toFixed(0) : '0' + value.toFixed(0)) + 's');

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
			const command = line.substring(0, commentIndex).trimEnd(); const comment = line.substring(commentIndex);

			let indentation = "";
			for (let i = command.length; i < maxCommandLength + 1; i++) {
				indentation += ' ';
			}

			newResult += command + indentation + comment + '\n';
		}
	}
	return newResult.trim();
}
