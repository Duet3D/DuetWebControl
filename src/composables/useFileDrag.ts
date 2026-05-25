import { readonly, ref } from "vue";

// Single source of truth for "are files being dragged over the window". One set of window
// listeners maintains a depth counter; both upload backdrops - the global overlay and the
// Explorer file list - read this shared flag instead of each running its own per-element
// detection. Element-level detection drifts when the drop zone's own subtree re-renders
// mid-drag (file rows mounting/unmounting), which is why the file list got stuck "ready to
// drop"; window-level events fire against a stable target and stay balanced.
//
// dragover is prevented here so the whole document is a valid drop target and the browser
// never navigates away to a dropped file. drop and dragend reset the counter because neither
// is followed by a balancing dragleave; capture phase keeps that reset working even when a
// downstream handler stops propagation (the editor's drop handler does)

let depth = 0;
const dragging = ref(false);

function isFileDrag(event: DragEvent): boolean {
	return !!event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files");
}

function reset() {
	depth = 0;
	dragging.value = false;
}

window.addEventListener("dragenter", (event) => {
	if (isFileDrag(event)) {
		depth += 1;
		dragging.value = true;
	}
}, true);

window.addEventListener("dragleave", (event) => {
	if (isFileDrag(event)) {
		depth = Math.max(0, depth - 1);
		dragging.value = depth > 0;
	}
}, true);

window.addEventListener("dragover", (event) => {
	if (isFileDrag(event)) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = "copy";
		}
	}
}, true);

window.addEventListener("drop", reset, true);
window.addEventListener("dragend", reset, true);

const draggingFiles = readonly(dragging);

/**
 * Access the shared file-drag flag, true while one or more files are dragged anywhere over the
 * window. Used by the upload backdrops to decide when to show.
 */
export function useFileDrag() {
	return { draggingFiles };
}
