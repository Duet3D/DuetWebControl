<template>
   <div ref="editor" class="editor-monaco" @mouseup="cursorChange" @keydown="cursorChange" @keyup="cursorChange"></div>
</template>

<style scoped></style>

<style>
.cm-activeLine {
   background-color: #333 !important;
}
</style>

<script lang="ts">
import Vue from 'vue';
import * as monaco from 'monaco-editor';
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
         editor: null as monaco.editor.IStandaloneCodeEditor | null
      };
   },
   computed: {
      darkTheme() {
         return store.state.settings.darkTheme;
      }
   },
   mounted() {
      this.$nextTick(() => {
         this.editor = monaco.editor.create(this.$refs.editor as HTMLElement, {
            automaticLayout: true,
            language: 'gcode',
            scrollBeyondLastLine: false,
            theme: store.state.settings.darkTheme ? 'vs-dark' : 'vs',
            value: this.innerDocument,
            readOnly: true,
            occurrencesHighlight: false,
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
         const currentPosition = this.editor?.getPosition() ?? new monaco.Position(1, 9999);
         const newPosition = new monaco.Position(currentPosition.lineNumber, 9999);
         const position = this.editor?.getModel()?.getOffsetAt(newPosition) ?? 0;
         this.$emit('changed', position);
      }
   },
   watch: {
      currentline(to) {
         if (!this.shown || !this.editor) return;
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
