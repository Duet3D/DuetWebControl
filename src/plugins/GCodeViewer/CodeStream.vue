<style>
.cm-activeLine {
   background-color: #333 !important;
}
</style>

<template>
   <div class="editor-monaco" @mouseup="cursorChange" @keydown="cursorChange" @keyup="cursorChange">
      <div v-if="monacoLoading" class="d-flex justify-center align-center fill-height">
         <v-progress-circular indeterminate color="primary" />
      </div>
      <div ref="editor" class="fill-height"></div>
   </div>
</template>

<script lang="ts">
import type * as Monaco from "monaco-editor";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
   props: {
      shown: {
         type: Boolean,
         required: true
      },
      currentline: {
         type: Number,
         required: true
      },
      document: {
         type: String,
         required: true
      },
      isSimulating: {
         type: Boolean,
         default: true
      }
   },
   data: function () {
      return {
         innerDocument: ' ',
         monacoLoading: false,
         editor: null as Monaco.editor.IStandaloneCodeEditor | null
      };
   },
   created() {
      // Redefine `editor` as a plain (non-reactive) property. Vue 2's Observer otherwise walks the Monaco
      // editor instance on assignment and installs getter/setters on its internal state, which breaks
      // Monaco's internal bookkeeping (widget position caches etc). The template does not bind to
      // `editor` directly, so losing reactivity is safe
      Object.defineProperty(this, "editor", {
         value: null,
         writable: true,
         configurable: true,
         enumerable: true
      });
   },
   computed: {
      darkTheme() {
         return store.state.settings.darkTheme;
      }
   },
   async mounted() {
      this.monacoLoading = true;
      const { monaco } = await import('@/utils/monaco');
      this.monacoLoading = false;
      this.$nextTick(() => {
         this.editor = monaco.editor.create(this.$refs.editor as HTMLElement, {
            automaticLayout: true,
            language: 'gcode',
            scrollBeyondLastLine: false,
            theme: store.state.settings.darkTheme ? 'vs-dark' : 'vs',
            value: this.innerDocument,
            readOnly: true,
            occurrencesHighlight: 'off',
            matchBrackets: 'never',
            minimap: {
               enabled: false
            }
         });
         this.editor.focus();
      });
   },
   methods: {
      cursorChange(e: any) {
         if (this.isSimulating || !this.editor) return;
         const currentPosition = this.editor.getPosition() ?? { lineNumber: 1, column: 9999 };
         const position = this.editor.getModel()?.getOffsetAt({ lineNumber: currentPosition.lineNumber, column: 9999 }) ?? 0;
         this.$emit('changed', position);
      }
   },
   watch: {
      currentline(to) {
         if (!this.shown || !this.editor) return;
         const currentPosition = this.editor.getPosition() ?? { lineNumber: 1, column: 9999 };
         const position = this.editor.getModel()?.getPositionAt(to) ?? { lineNumber: 1, column: 9999 };
         if (currentPosition.lineNumber === position.lineNumber && currentPosition.column === position.column) return;
         const direction = Math.sign(position.lineNumber - currentPosition.lineNumber);
         const newpos = { lineNumber: position.lineNumber, column: 9999 };
         this.editor.setPosition(newpos);
         this.editor.revealLine(newpos.lineNumber + 5 * direction);
      },
      document(to) {
         this.innerDocument = to;
         if (this.editor) {
            this.editor.setValue(this.innerDocument);
         }
      }
   }
});
</script>
