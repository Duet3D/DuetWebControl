declare module 'vue/types/vue' {
    interface Vue {
        $display(value: number | Array<number> | string, precision: number, unit?: string);
        $displayZ(value: number | Array<number> | string, showUnit = true);
        $displaySize(bytes: number);
        $displaySpeed(bytesPerSecond: number);
        $displayTime(value: number, showTrailingZeroes = false);
    }
}
