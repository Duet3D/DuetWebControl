import { FileListItem } from "@duet3d/connectors";
import { DataTableHeader } from "vuetify";

interface ExtraFileListItemOptions {
	filaments?: Array<number>;
}

export type BaseFileListHeader = DataTableHeader & { precision?: number, unit?: string };
export type BaseFileListItem = FileListItem & ExtraFileListItemOptions;

export interface BaseFileListDataTransfer {
	type: string;
	directory: string;
	items: Array<BaseFileListItem>;
}

export function isBaseFileListDataTransfer(data: any): data is BaseFileListDataTransfer {
	return (data.type === "dwcFiles" && typeof data.directory === "string" && data.items instanceof Array);
}
