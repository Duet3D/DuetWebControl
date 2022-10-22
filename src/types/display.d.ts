import { Axis } from '@duet3d/objectmodel';
import Vue from 'vue';

declare module 'vue/types/vue' {
    interface Vue {
        /**
         * Display a numeric value with a given precision and an optional unit.
         * @param value Value(s) to display
         * @param precision Optional number precision
         * @param unit Optional unit to append
         * @returns Formatted string
         */
        $display(value: number | Array<number> | string | null | undefined, precision?: number, unit?: string): string;

        /**
         * Display an axis position
         * @param axis Axis position to display
         * @returns Formatted axis position
         */
        $displayAxisPosition(axis: Axis, machinePosition = false): string;

        /**
         * Display a Z height (typically higher precision than other values)
         * @param value Z height value
         * @param showUnit Append the currently configured distance unit
         * @returns Formatted string
         */
        $displayZ(value: number | Array<number> | string | null | undefined, showUnit = true): string;

        /**
         * Display a size with proper units
         * @param bytes Size to format
         * @returns Formatted string
         */
        $displaySize(bytes: number | null | undefined): string;

        /**
         * Display a move speed
         * @param speed Speed in mm/s
         * @returns Formatted move speed in mm/s or ipm
         */
        $displayMoveSpeed(speed: number | null | undefined): string;

        /**
         * Display a transfer speed with proper units
         * @param bytesPerSecond Speed to format
         * @returns Formatted string
         */
        $displayTransferSpeed(bytesPerSecond: number): string;

        /**
         * Display remaining time
         * @param value Time to format (in s)
         * @param showTrailingZeroes Show trailing zeroes (defaults to false)
         * @returns Formatted string
         */
        $displayTime(value: number | null | undefined, showTrailingZeroes = false): string;
    }
}