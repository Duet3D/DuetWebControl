declare module "turbo-crc32/crc32" {
	export default function crc32(input: ArrayBuffer | string): number;
}

declare module "turbo-crc32/crc32c" {
	export default function crc32c(input: ArrayBuffer | string): number;
}
