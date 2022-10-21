declare module "piecon" {
	export function setOptions(custom: any): {
		setOptions(custom: any): any;
		setProgress(percentage: any): false | void;
		reset(): void;
	};
	export function setProgress(percentage: any): false | void;
	export function reset(): void;
}