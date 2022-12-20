<template>
    <codemirror v-show="shown" v-model="innerDocument" :options="cmOptions" @cursorActivity="cursorChange" ref="view"></codemirror>
</template>

<style scoped></style>

<style>
.cm-activeLine {
   background-color: #333 !important;
}
</style>

<script lang="js">

import { mapState } from 'vuex'
import { codemirror } from 'vue-codemirror'
import 'codemirror/addon/dialog/dialog.js'
import 'codemirror/addon/dialog/dialog.css'
import 'codemirror/addon/selection/active-line.js'
import 'codemirror/addon/search/search.js'
import 'codemirror/addon/search/searchcursor.js'
import 'codemirror/addon/search/jump-to-line.js'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/blackboard.css'

export default {
    components: {
        codemirror
    },
    props: {
        shown: {
            type:Boolean,
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
         view: undefined,
         innerDocument: ''
      };
   },
   computed: {
    ...mapState('settings', ['darkTheme']),
    cmOptions() {
			return {
				mode: 'application/x-gcode',
				theme: this.darkTheme ? 'blackboard' : 'default',
				indentWithTabs: true,
				inputStyle: 'textarea',
				lineNumbers: true,
				styleActiveLine: true,
                readOnly: true
			}
		},
   },
   mounted() {

   },
   methods: {
      mouseUp() {

      },
      cursorChange(e){
        if(this.isSimulating) return;
        var pos = e.doc.indexFromPos(e.doc.getCursor());
        this.$emit('update:currentline', pos);
        
      }
   },
   watch: {
      currentline(to) {
        if(!this.shown) return;
        let codemirror = this.$refs.view.codemirror;
        codemirror.doc.setCursor(codemirror.doc.posFromIndex(to));
      },
      document(to){
        console.log('update')
        this.innerDocument = to;
      }
   }
};
</script>
