import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { gcodeFDMLanguage, gcodeCNCLanguage } from "@duet3d/monacotokens";

monaco.languages.register({ id: "gcode-fdm" });
monaco.languages.setMonarchTokensProvider("gcode-fdm", gcodeFDMLanguage);

monaco.languages.register({ id: "gcode-cnc" });
monaco.languages.setMonarchTokensProvider("gcode-cnc", gcodeCNCLanguage);
