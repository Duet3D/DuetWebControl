// monaco-editor-core ships only editor.worker.start.js (the worker boot logic) and leaves the
// actual web-worker entry to the consumer. Wrap it so vite's `?worker` query can spin it up
import "monaco-editor-core/esm/vs/editor/editor.worker.start.js";
