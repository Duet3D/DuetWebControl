declare module "turbo-crc32/crc32" {
	export function crc32(input: ArrayBuffer | string): number;
	export function crc32c(input: ArrayBuffer | string): number;
}