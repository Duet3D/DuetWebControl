<template>
   <div class="editor-monaco" @mouseup="cursorChange" @keydown="cursorChange" @keyup="cursorChange">
      <div v-if="monacoLoading" class="d-flex justify-center align-center fill-height">
         <v-progress-circular indeterminate color="primary" />
      </div>
      <div ref="editor" class="fill-height"></div>
   </div>
</template>

<style scoped></style>

<style>
.cm-activeLine {
   background-color: #333 !important;
}
</style>

<script lang="ts">
import type * as Monaco from 'monaco-editor';
import Vue from 'vue';
import store from '@/store';

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
   computed: {
      darkTheme() {
         return store.state.settings.darkTheme;
      }
   },
   async mounted() {
      this.monacoLoading = true;
      const { monaco } = await import('@/utils/monaco');
      this.monacoLoading = false;
      (this as any)._monaco = monaco;
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
         if (this.isSimulating) return;
         const monaco: typeof Monaco = (this as any)._monaco;
         if (!monaco) return;
         const currentPosition = this.editor?.getPosition() ?? new monaco.Position(1, 9999);
         const newPosition = new monaco.Position(currentPosition.lineNumber, 9999);
         const position = this.editor?.getModel()?.getOffsetAt(newPosition) ?? 0;
         this.$emit('changed', position);
      }
   },
   watch: {
      currentline(to) {
         if (!this.shown || !this.editor) return;
         const monaco: typeof Monaco = (this as any)._monaco;
         if (!monaco) return;
         to = to
         const currentPosition = this.editor.getPosition() ?? new monaco.Position(1,9999);
         const position = this.editor.getModel()?.getPositionAt(to) ?? new monaco.Position(1, 9999);
         if (currentPosition.equals(position)) return;
         const direction = Math.sign(position.lineNumber - currentPosition?.lineNumber);
         let newpos = new monaco.Position(position.lineNumber, 9999);
         if (newpos) {
            this.editor.setPosition(newpos);
            this.editor.revealLine(newpos.lineNumber + 5 * direction);
         }
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
