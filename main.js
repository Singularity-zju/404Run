/**
 * main js file
 * 
 * @author shenyi bm2736892@gmail.com
 * @author 
 *
 * @dependencies
 *  three.js		https://github.com/mrdoob/three.js/
 *  ammo.js			https://github.com/kripken/ammo.js/
 *	dat.gui			http://code.google.com/p/dat-gui/
 *	backbone.js		http://documentcloud.github.com/backbone
 *	--undercore.js	htttp://underscorejs.org/
 *	stats.js		https://github.com/mrdoob/stats.js/
 */

var Run = {
	sceneData : {},
	rigidBodyList : [],

	activeCamera : null,
	renderer : null,
	mainScene : null,
	strokeComposer : null,
	finalComposer : null
}

Run.config = {

	brickWidth : 4,
	brickLength : 2,
	brickHeight : 0.5,
	brickNumber : 100,
	brickSpacing : 0,

	normalEdgeDetect : {
		nPixels : 3,
		threshhold : 0.2
	}
}

window.onload = function(){

	Run.gui = new dat.GUI();

	//初始化场景
	Run.init();

	//描边的后处理
	Run.strokeScene();

	Run.initPhysics();
	//运行
	Run.runApp();
}


Run.init = function(){
	
	var me = this;	//在回调函数中使用

	var width = window.innerWidth,
		height = window.innerHeight,
		mainCanvas = document.getElementById('MainCanvas');

	//渲染器
	this.renderer = new THREE.WebGLRenderer({
			canvas : mainCanvas	
		});
	//主要场景
	this.mainScene = new THREE.Scene();

	this.renderer.setSize(width, height);

	//创建角色
	var character = this.createCharacter();
	character.position.y = 4 ;
	this.mainScene.add(character);

	//创建道路
	var road = this.createRoad();
	this.mainScene.add(road);

	//主摄像机，默认单位是meter
	var mainCamera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
	mainCamera.position = new THREE.Vector3(10, 10, 3);
	mainCamera.lookAt(character.position);
	//设置当前的相机
	this.activeCamera = character.getChildByName('camera');
	// this.activeCamera = mainCamera;
	//灯光
	var dirLight = new THREE.DirectionalLight(0xffffff);
	dirLight.position = new THREE.Vector3(0, 10, 0).normalize();	//这里position就是平行光的方向
	this.mainScene.add(dirLight);

	//////////////////////////save the scene data
	Run.sceneData['character'] = character;
	Run.sceneData['road'] = road;
}

Run.createCharacter = function(){

	var characterGeo = new THREE.CubeGeometry(2, 2, 2, 2, 2, 2),
		characterMat = this.createToonMaterial(),
		characterMesh = new THREE.Mesh(characterGeo, characterMat),
		//跟踪角色的第三人称摄像机，默认单位是meter
		characterCamera = new THREE.PerspectiveCamera(45, this.renderer.domElement.width/this.renderer.domElement.height, 0.1, 10000);

	var character = new THREE.Object3D;
	character.add(characterMesh);
	character.add(characterCamera);

	characterCamera.name = 'camera';
	characterMesh.name = 'mesh';

	//摄像机后移
	// characterCamera.position = new THREE.Vector3(0.1, 0.9, 4);
	characterCamera.position = new THREE.Vector3(10, 10, 3);
	characterCamera.lookAt(character.position);
	
	//subdivision modifier
	var modifier = new THREE.SubdivisionModifier(2);
	modifier.modify(characterGeo);
	//
	characterMat.uniforms['color'].value = new THREE.Color(0xE71800);

	return character;
}

// Run.createCharacter = function(){
// 	var loader = new THREE.JSONLoader(),
// 		character = new THREE.Object3D(),
// 		characterCamera = new THREE.PerspectiveCamera(45, this.renderer.domElement.width/this.renderer.domElement.height, 0.1, 100);
// 		me = this;
// 	characterCamera.name = 'camera';
// 	characterCamera.position = new THREE.Vector3(1.0, 0.9, 3);
// 	character.add(characterCamera);

// 	loader.load('media/models/monkey.js', function(geometry){
// 		var mat = me.createToonMaterial();

// 		// mat.uniforms['map'].texture = geometry.materials[0].map;
// 		mat.uniforms['color'].value = new THREE.Color(0xE71800);
// 		// mat.map = true;	//这个也是必须要加的

// 		var mesh = new THREE.Mesh(geometry, mat);
// 		mesh.name = 'mesh';
// 		character.add(mesh);

// 	})

// 	return character;

// }

Run.createToonMaterial = function(){
	var toonMat = new THREE.ShaderMaterial();
	//配置材质
	toonMat.vertexShader = Run.shaders['toon'].vertexShader;
	toonMat.fragmentShader = Run.shaders['toon'].fragmentShader;
	toonMat.uniforms = THREE.UniformsUtils.clone(Run.shaders['toon'].uniforms);

	toonMat.lights = true;	//lights不设成true的话不会设置shader中的光照参数的，坑爹啊!!!还要看源代码才知道!!!
	
	//加载纹理
	var texture = THREE.ImageUtils.loadTexture('media/texture/celMap.jpg');
	toonMat.uniforms.celMap.texture = texture;

	return toonMat;
}

Run.createNormalMaterial = function(){

	var normalMat = new THREE.ShaderMaterial();
	normalMat.vertexShader = Run.shaders['normal'].vertexShader;
	normalMat.fragmentShader = Run.shaders['normal'].fragmentShader;
	normalMat.uniforms = {};

	return normalMat;
}

Run.createRoad = function(){

	var road = new THREE.Object3D(),
		brickGeo = new THREE.CubeGeometry(1, 1, 1),
		mat = this.createToonMaterial();

	brickGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0) );
	
	for(var i =0; i < this.config.brickNumber; i++){

		var cube = new THREE.Mesh(brickGeo, mat);
		cube.position.z = 10-i * (this.config.brickLength+this.config.brickSpacing);

		cube.scale = new THREE.Vector3(this.config.brickWidth, this.config.brickHeight, this.config.brickLength);
		if(Math.random() < 0.2 && i > 10){

			cube.scale.y *= Math.random()*10;
		}
		road.add(cube);
	}

	return road;
}

Run.runApp = function(){

	var stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	document.body.appendChild(stats.domElement);

	var me = this;

	var startTime = Date.now();

	function step(timestamp){

		requestAnimationFrame(step);

		var now = timestamp || Date.now();
		var delta = now - startTime;
		startTime = now;

		me.updateScene(delta);
		me.render();

		stats.update();
	}

	step();
}
//使用normal based edge detect对场景描边
Run.strokeScene = function(){

	// var edgeTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat });

	this.strokeComposer = new THREE.EffectComposer(this.renderer);

	var edgeDetectPass = new THREE.ShaderPass(Run.shaders['edgeDetectWithNormal'], 'tNormal');
	var renderSceneNoTex = new THREE.RenderPass(this.mainScene, this.activeCamera, this.createNormalMaterial());

	// edgeDetectPass.renderToScreen = true;
	// renderSceneNoTex.clearAlpha = 0;
	// renderSceneNoTex.clearColor = new THREE.Color();
	var edgeDetectMat = edgeDetectPass.material;
	edgeDetectMat.uniforms['offsetX'].value = 1/this.renderer.domElement.width;
	edgeDetectMat.uniforms['offsetY'].value = 1/this.renderer.domElement.height;

	var controller = this.gui.add(this.config.normalEdgeDetect, 'nPixels', 0.2, 6.0);
	controller.onChange(function(value){
		
		edgeDetectMat.uniforms['nPixels'].value = value;
	})
	
	controller = this.gui.add(this.config.normalEdgeDetect, 'threshhold', 0.0, 1.0);
	controller.onChange(function(value){

		edgeDetectMat.uniforms['threshhold'].value = value;
	})

	this.strokeComposer.addPass(renderSceneNoTex);	//toon shading to the rendertarget1(writeBuffer)
	this.strokeComposer.addPass(edgeDetectPass);	//edge to the rendertarget2(readbuffer)

	///////////////////////////////////////////////////////////
	this.finalComposer = new THREE.EffectComposer(this.renderer);
	var finalPass = new THREE.ShaderPass(Run.shaders['final']);
	finalPass.renderToScreen = true;
	finalPass.uniforms.tEdge.texture = this.strokeComposer.writeBuffer;

	var renderScene = new THREE.RenderPass(this.mainScene, this.activeCamera);
	renderScene.clearColor = new THREE.Color();

	this.finalComposer.addPass(renderScene);
	this.finalComposer.addPass(finalPass);
}

Run.render = function(){
	
	// this.mainScene.overrideMaterial = this.createNormalMaterial();
	// this.renderer.render(this.mainScene, this.activeCamera);
	this.strokeComposer.render();

	this.finalComposer.render();
}

Run.updateScene = function(delta){

	delta = delta/1000;

	this.mainScene.world.stepSimulation(delta, 5);

	var me = this,
		transform = new Ammo.btTransform(),
		origin, rotation;

	_.each(this.rigidBodyList, function(rigidBody){
		
		rigidBody.getMotionState().getWorldTransform( transform);

		origin = transform.getOrigin();
		rotation = transform.getOrigin();
		
		// rigidBody._mesh.useQuaternion = true;
		rigidBody._mesh.position = new THREE.Vector3().add(new THREE.Vector3(origin.x(), origin.y(), origin.z()),
														rigidBody._offset);
		rigidBody._mesh.quaternion = new THREE.Quaternion(rotation.x(), rotation.y(), rotation.z(), rotation.w());
	})
}

//
Run.initPhysics = function(){

	var me = this;
	var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
	var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);

	var overlappingPairCache = new Ammo.btDbvtBroadphase();
	//约束解算器
	var solver = new Ammo.btSequentialImpulseConstraintSolver();
	//物理世界
	this.mainScene.world = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
	//设置重力
	this.mainScene.world.setGravity(new Ammo.btVector3(0, -10, 0));

	//为每个box创建对象
	var characterMesh = this.sceneData['character'].getChildByName('mesh'),
		road = this.sceneData['road'];

	var body = this.createBtRigidBodyFromBoundingBox(characterMesh, 10, this.sceneData['character'].position);
	body._mesh = this.sceneData['character'];
	this.mainScene.world.addRigidBody(body);
	this.rigidBodyList.push(body);

	_.each(road.children, function(mesh){

		var body = me.createBtRigidBodyFromBoundingBox(mesh, 0);
		me.mainScene.world.addRigidBody(body);
		me.rigidBodyList.push(body);
		
	})
}

//根据mesh的bounding box创建btRigidBody
Run.createBtRigidBodyFromBoundingBox = function(mesh, mass, position){
	
	if( ! mesh.geometry.boundingBox){

		mesh.geometry.computeBoundingBox();
	}

	var bb = mesh.geometry.boundingBox,
		size = new THREE.Vector3().sub(bb.max, bb.min),
		center = new THREE.Vector3().add(bb.max, bb.min).multiplyScalar(0.5),
		position = position || mesh.position;

	var transform = new Ammo.btTransform();
	transform.setIdentity();
	transform.setOrigin(new Ammo.btVector3(center.x+position.x, center.y+position.y, center.z+position.z));
	
	var localIntertia = new Ammo.btVector3(0, 0, 0);
	//计算大小
	var shape = new Ammo.btBoxShape(new Ammo.btVector3(size.x*mesh.scale.x, size.y*mesh.scale.y, size.z*mesh.scale.z));
	//计算惯性
	if( ! mass){	//mass 为0的话为固定物体

		shape.calculateLocalInertia(mass, localIntertia);
	}

	var motionState = new Ammo.btDefaultMotionState(transform);
	//创建刚体需要的参数
	var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localIntertia);
	//创建刚体
	var rigidBody = new Ammo.btRigidBody( rbInfo );

	rigidBody._mesh = mesh;
	//计算出boundingbox与position的位移
	rigidBody._offset = center;
	var transform = new Ammo.btTransform();
	rigidBody.getMotionState().getWorldTransform(transform);

	return rigidBody;
}