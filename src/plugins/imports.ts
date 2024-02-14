/**
 * DO NOT MODIFY THIS FILE! IT IS AUTO-GENERATED ON COMPILATION!
*/
import { initCollection } from "@duet3d/objectmodel";
import DwcPlugin from "./DwcPlugin";

export default initCollection(DwcPlugin, [
	{
        id: "GCodeViewer",
        name: "G-Code Viewer",
        author: "Juan Rosario",
        version: "3.5.0",
        loadDwcResources: () => import(
            /* webpackChunkName: "GCodeViewer" */
            "./GCodeViewer/index"
        )
    },
	{
        id: "HeightMap",
        name: "Height Map",
        author: "Duet3D Ltd",
        version: "3.5.0",
        loadDwcResources: () => import(
            /* webpackChunkName: "HeightMap" */
            "./HeightMap/index"
        )
    },
	{
        id: "InputShaping",
        name: "Input Shaping",
        author: "Duet3D Ltd",
        version: "3.5.0",
        loadDwcResources: () => import(
            /* webpackChunkName: "InputShaping" */
            "./InputShaping/index"
        )
    },
	{
        id: "ObjectModelBrowser",
        name: "Object Model Browser",
        author: "Duet3D Ltd",
        version: "3.5.0",
        loadDwcResources: () => import(
            /* webpackChunkName: "ObjectModelBrowser" */
            "./ObjectModelBrowser/index"
        )
    },
	{
        id: "OnScreenKeyboard",
        name: "On-Screen Keyboard",
        author: "Duet3D Ltd",
        version: "3.5.0",
        loadDwcResources: () => import(
            /* webpackChunkName: "OnScreenKeyboard" */
            "./OnScreenKeyboard/index"
        )
    },
]);
