// Shiz
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';


class CharacterControls {
  constructor(params){
    this._Init(params) // on call with arg to params
  }

  _Init(params){
    this._params = params
    this._move = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    }
    this._deccel = new THREE.Vector3(-0.0005, -0.0001, -5.0)
    this._accel = new THREE.Vector3(1,0.25, 50.0)
    this._velocity = new THREE.Vector3(0,0,0) // default velo

    document.addEventListener('keydown', (e) => this._onKeyDown(e), false)
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false)
    
  }
  // COPY PASTED CONTROLS 
  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // w
        this._move.forward = true
        break
      case 65: // a
        this._move.left = true
        break
      case 83: // s
        this._move.backward = true
        break
      case 68: // d
        this._move.right = true
        break
      case 38: // up
      case 37: // left
      case 40: // down
      case 39: // right
        break
    }
  }

  _onKeyUp(event) {
    switch(event.keyCode) {
      case 87: // w
        this._move.forward = false
        break
      case 65: // a
        this._move.left = false
        break
      case 83: // s
        this._move.backward = false
        break
      case 68: // d
        this._move.right = false
        break
      case 38: // up
      case 37: // left
      case 40: // down
      case 39: // right
        break
    }
  }

  Update(timeInSeconds) {
    const velocity = this._velocity
    const frameDecceleration = new THREE.Vector3(
        velocity.x * this._deccel.x,
        velocity.y * this._deccel.y,
        velocity.z * this._deccel.z
    )
    frameDecceleration.multiplyScalar(timeInSeconds)
    frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z))

    velocity.add(frameDecceleration)

    const controlObject = this._params.target
    const _Q = new THREE.Quaternion()
    const _A = new THREE.Vector3()
    const _R = controlObject.quaternion.clone()

    if (this._move.forward) {
      velocity.z += this._accel.z * timeInSeconds
    }
    if (this._move.backward) {
      velocity.z -= this._accel.z * timeInSeconds
    }
    if (this._move.left) {
      _A.set(0, 1, 0)
      _Q.setFromAxisAngle(_A, Math.PI * timeInSeconds * this._accel.y)
      _R.multiply(_Q)
    }
    if (this._move.right) {
      _A.set(0, 1, 0)
      _Q.setFromAxisAngle(_A, -Math.PI * timeInSeconds * this._accel.y)
      _R.multiply(_Q)
    }

    controlObject.quaternion.copy(_R)

    const oldPosition = new THREE.Vector3()
    oldPosition.copy(controlObject.position)

    const forward = new THREE.Vector3(0, 0, 1)
    forward.applyQuaternion(controlObject.quaternion)
    forward.normalize()

    const sideways = new THREE.Vector3(1, 0, 0)
    sideways.applyQuaternion(controlObject.quaternion)
    sideways.normalize()

    sideways.multiplyScalar(velocity.x * timeInSeconds)
    forward.multiplyScalar(velocity.z * timeInSeconds)

    controlObject.position.add(forward)
    controlObject.position.add(sideways)

    oldPosition.copy(controlObject.position)
  }
}


class CreateWorld{
  constructor(){
    this._Init(); // On Run
  }

  _Init(){
    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
    })
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    
    // Attach to DOM ele
    document.body.appendChild(this._renderer.domElement)
    // Listen for Resizing
    window.addEventListener('resize', () => {
      this._OnWindowResize()
    }, false)

    // Camera Vars
    const fov = 60
    const aspect = 1920 / 1080
    const near = 1.0
    const far = 1000.0
    //Camera
    this._Camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this._Camera.position.set(75, 20, 0)

    // Scene
    this._Scene = new THREE.Scene()

    // Lighting
    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0)
    light.position.set(20, 100, 10)
    light.target.position.set(0, 0, 0)
    light.castShadow = true
    light.shadow.bias = -0.001
    light.shadow.mapSize.width = 2048
    light.shadow.mapSize.height = 2048
    light.shadow.camera.near = 0.1
    light.shadow.camera.far = 500.0
    light.shadow.camera.near = 0.5
    light.shadow.camera.far = 500.0
    light.shadow.camera.left = 100
    light.shadow.camera.right = -100
    light.shadow.camera.top = 100
    light.shadow.camera.bottom = -100
    this._Scene.add(light)
    light = new THREE.AmbientLight(0xFFFFFF, 4.0)
    this._Scene.add(light)

    // Dev Orbit Controls
    const controls = new OrbitControls(
      this._Camera, this._renderer.domElement);
    controls.target.set(0, 20, 0);
    controls.enablePan = false;
    controls.update();

    // Basic Ground plane
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 10, 10),
      new THREE.MeshStandardMaterial({
          color: 0x202020,
        }))
    plane.castShadow = false
    plane.receiveShadow = true
    plane.rotation.x = -Math.PI / 2
    this._Scene.add(plane)

    this._mixers = []
    this._previousRAF = null

    this._LoadModel()
    this._RAF()
  }
  // FBX loading
  _LoadModel(){
    const loader = new FBXLoader();
    loader.setPath('./resources/');
    loader.load('mannequin.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });

      const params = {
        target: fbx,
        camera: this._Camera,
      }
      this._controls = new CharacterControls(params)

      const anim = new FBXLoader();
      anim.setPath('./resources/');
      anim.load('Walking.fbx', (anim) => {
        const m = new THREE.AnimationMixer(fbx);
        this._mixers.push(m);
        const idle = m.clipAction(anim.animations[0]);
        idle.play();
      });
      this._Scene.add(fbx);
    });
  }

  _OnWindowResize() {
    this._Camera.aspect = window.innerWidth / window.innerHeight
    this._Camera.updateProjectionMatrix()
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t
      }

      this._RAF()

      this._renderer.render(this._Scene, this._Camera)
      this._Step(t - this._previousRAF)
      this._previousRAF = t
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001
    if (this._mixers) {
      this._mixers.map(m => m.update(timeElapsedS))
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS)
    }
  }
}

/*
 * Wait for content to load to begin rendering 
*/
let _APP = null
window.addEventListener('DOMContentLoaded', () => {
  _APP = new CreateWorld() 
})
