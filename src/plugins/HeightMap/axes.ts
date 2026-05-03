import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'


export default class Axes {
	visible: boolean;
	scene: Scene;
	registerClipIgnore: (mesh: any) => void;
	axesMesh: Mesh | undefined;
	axesMeshPosition: Vector3 | undefined;
	size: number;
	debug: boolean;

	// Persistence of `visible` is the owning Vue component's job (HeightMap.vue routes it
	// through the cache store so the user's preference survives in the same per-plugin cache
	// blob as everything else). The class itself just owns the in-scene state
	constructor(scene: Scene, initialVisible: boolean = true) {
		this.visible = initialVisible;
		this.scene = scene;
		this.registerClipIgnore = () => {};
		this.axesMesh = undefined;
		this.axesMeshPosition = undefined;
		this.size = 50;
		this.debug = false;
	}

	show(visible: boolean): void {
		this.visible = visible;
		if (this.axesMesh) {
			this.axesMesh.setEnabled(visible);
		}
		this.scene.render();
	}

	makeTextPlane(text: string, color: string, size: number): Mesh {
		const dynamicTexture = new DynamicTexture('DynamicTexture', 50, this.scene, true);
		dynamicTexture.hasAlpha = true;
		dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);
		const plane = Mesh.CreatePlane('TextPlane', size, this.scene, true);
		const mat = new StandardMaterial('TextPlaneMaterial', this.scene);
		mat.backFaceCulling = false;
		mat.specularColor = new Color3(0, 0, 0);
		mat.diffuseTexture = dynamicTexture;
		plane.material = mat;
		return plane;
	}

	resize(size: number): void {
		this.size = size;
		this.axesMesh!.dispose(false, true);
		this.render();
	}

	render(position?: Vector3): void {
		if (this.debug) return;
		if (this.axesMesh && !this.axesMesh.isDisposed()) {
			if (position) {
				this.axesMesh.position = position;
			}
			return;
		}

		this.axesMesh = new Mesh('axis', this.scene);
		this.registerClipIgnore(this.axesMesh);

		const axisX = Mesh.CreateLines('axisX', [Vector3.Zero(), new Vector3(this.size, 0, 0), new Vector3(this.size * 0.95, 0.05 * this.size, 0), new Vector3(this.size, 0, 0), new Vector3(this.size * 0.95, -0.05 * this.size, 0)], this.scene, false);
		axisX.color = new Color3(1, 0, 0);
		axisX.parent = this.axesMesh;
		const xChar = this.makeTextPlane('X', 'red', this.size / 10);
		xChar.position = new Vector3(0.9 * this.size, 0.05 * this.size, 0);
		xChar.parent = this.axesMesh;

		const axisY = Mesh.CreateLines('axisZ', [Vector3.Zero(), new Vector3(0, 0, this.size), new Vector3(0, -0.05 * this.size, this.size * 0.95), new Vector3(0, 0, this.size), new Vector3(0, 0.05 * this.size, this.size * 0.95)], this.scene, false);
		axisY.color = new Color3(0, 1, 0);
		axisY.parent = this.axesMesh;
		const yChar = this.makeTextPlane('Y', 'green', this.size / 10);
		yChar.position = new Vector3(0, 0.05 * this.size, 0.9 * this.size);
		yChar.parent = this.axesMesh;

		const axisZ = Mesh.CreateLines('axisY', [Vector3.Zero(), new Vector3(0, this.size, 0), new Vector3(-0.05 * this.size, this.size * 0.95, 0), new Vector3(0, this.size, 0), new Vector3(0.05 * this.size, this.size * 0.95, 0)], this.scene, false);
		axisZ.color = new Color3(0, 0, 1);
		axisZ.parent = this.axesMesh;
		const zChar = this.makeTextPlane('Z', 'blue', this.size / 10);
		zChar.position = new Vector3(0, 0.9 * this.size, -0.05 * this.size);
		zChar.parent = this.axesMesh;

		this.axesMesh.setEnabled(this.visible);
		this.axesMesh.getChildren().forEach((mesh) => this.registerClipIgnore(mesh));
		if (position) {
			this.axesMesh.position = position;
		}
	}

	dispose(): void {
		if (this.axesMesh) {
			this.axesMesh.dispose(false, true);
		}
	}
}
