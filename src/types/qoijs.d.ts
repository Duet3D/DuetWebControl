declare module "qoijs" {
    interface DecodeResult {
        channels: number;
        data: Uint8Array;
        colorspace: number;
        width: number;
        error: boolean;
        height: number;
    }
    export function decode(arrayBuffer: ArrayBuffer, byteOffset: number | null, byteLength: number | null, outputChannels: number | null): DecodeResult;
    export function encode(colorData: Uint8Array | Uint8ClampedArray, description: { width: number, height: number, channels: number, colorspace: number }): ArrayBuffer;
}