// Ambient declaration for the piecon library, which has no bundled TypeScript types.
// Surface only the methods actually used by App.vue
declare module "piecon" {
	interface PieconOptions {
		color?: string;
		background?: string;
		shadow?: string;
		fallback?: boolean | "force";
	}

	const Piecon: {
		setOptions(options: PieconOptions): void;
		setProgress(percentage: number): void;
		reset(): void;
	};

	export default Piecon;
}
