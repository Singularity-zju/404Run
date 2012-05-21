/**
 * shader file
 * 
 * @author shenyi bm2736892@gmail.com
 */

Run.shaders = {
	/**
	 * 卡通着色，还有聚光灯没加
	 */
	'toon' : {

		uniforms : THREE.UniformsUtils.merge([

			THREE.UniformsLib['common'],
			THREE.UniformsLib['fog'],
			THREE.UniformsLib['lights'],
			THREE.UniformsLib['shadowmap'],

			{
				'celMap' : { type : 't', value : 10, texture : null},
				'color' : {type : 'c', value : new THREE.Color(0xffffff)}
			}

		]),

		vertexShader : [

			'varying vec3 vViewPosition;',
			'varying vec3 vNormal;',

			THREE.ShaderChunk['map_pars_vertex'],
			/*
			THREE.ShaderChunk['lightmap_pars_vertex'],	//dropped
			THREE.ShaderChunk['envmap_pars_vertex'],	//dropped
			*/
			THREE.ShaderChunk['lights_phong_pars_vertex'],
			THREE.ShaderChunk['color_pars_vertex'],
			THREE.ShaderChunk['skinning_pars_vertex'],
			THREE.ShaderChunk['morphtarget_pars_vertex'],
			THREE.ShaderChunk['shadowmap_pars_vertex'],

			'void main(){',

				'vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',

				THREE.ShaderChunk['map_vertex'],
				THREE.ShaderChunk['color_vertex'],

				'vec4 mPosition = objectMatrix * vec4(position, 1.0);',

				THREE.ShaderChunk['morphnormal_vertex'],

				'vNormal = normalize(transformedNormal);',

				THREE.ShaderChunk['lights_phong_vertex'],
				THREE.ShaderChunk['skinning_vertex'],
				THREE.ShaderChunk['morphtarget_vertex'],
				THREE.ShaderChunk['default_vertex'],
				THREE.ShaderChunk['shadowmap_vertex'],
			'}'
		].join('\n'),

		fragmentShader : [
			'uniform vec3 color;',
			'uniform float opacity;',

			'uniform sampler2D celMap;',

			THREE.ShaderChunk['color_pars_fragment'],
			THREE.ShaderChunk['map_pars_fragment'],
			THREE.ShaderChunk['fog_par_fragment'],
			THREE.ShaderChunk['lights_phong_pars_fragment'],
			THREE.ShaderChunk['shadowmap_pars_fragment'],

			'void main(){',

				'gl_FragColor = vec4(color, opacity);',

				THREE.ShaderChunk['map_fragment'],
				THREE.ShaderChunk['alphatest_fragment'],

				'vec3 vLightFront = vec3(0.0);',
				
				// '#ifdef DOUBLE_SIDED',
				// 	'vec3 vLightBack = vec3(0.0);',
				// '#endif',

				//平行光源
				'#if MAX_DIR_LIGHTS > 0',

				'for(int i = 0; i < MAX_DIR_LIGHTS; i ++){',

					'vec4 lDirection = viewMatrix * vec4( directionalLightDirection[i], 0.0);',
					'vec3 dirVector = normalize(lDirection.xyz);',

					'float dotProduct = clamp(dot(vNormal, dirVector), 0.0, 1.0);',
					'vec4 directionalLightCelColor = texture2D(celMap, vec2(dotProduct, 0.0));',
					'vLightFront += directionalLightColor[i] * directionalLightCelColor.xyz;',
				'}',
				'#endif',

				//点光源
				'#if MAX_POINT_LIGHTS > 0',

				'for(int i = 0; i < MAX_POINT_LIGHTS; i++){',
					'vec4 lPosition = viewMatrix * vec4(pointLightPosition[i], 1.0);',
					'vec3 lVector = lPosition.xyz - mvPosition.xyz;',

					// 'float lDistance = 1.0;',
					// 'if( pointLightDistance[i] > 0.0)',
					// 	'lDistance = 1.0 - min(length(lVector)/pointLightDistance[i]), 1.0);',
					
					'lVector = normalize(lVector);',
					'float dotProduct = clamp(dot(vNormal, dirVector), 0.0, 1.0);',
					'vec4 directionalLightCelColor = texture2D(celMap, vec2(dotProduct, 0.0));',
					'vLightFront += pointLightColor[i] * directionalLightCelColor.xyz;',
				'}',
				'#endif',

				'gl_FragColor.xyz = gl_FragColor.xyz * vLightFront;',

				THREE.ShaderChunk['linear_to_gamma_fragment'],
				THREE.ShaderChunk['fog_fragment'],

			'}'

		].join('\n')
	},
	/**
	 *保存法线
	 */
	'normal' : {
		uniforms : {},

		vertexShader : [
			'varying vec3 vNormal;',

			THREE.ShaderChunk['skinning_pars_vertex'],
			THREE.ShaderChunk['morphtarget_pars_vertex'],
			'void main(){',

				'vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',

				THREE.ShaderChunk['morphnormal_vertex'],

				'vNormal = normalize(transformedNormal);',

				THREE.ShaderChunk['skinning_vertex'],
				THREE.ShaderChunk['morphtarget_vertex'],
				THREE.ShaderChunk['default_vertex'],
			'}'


		].join('\n'),

		fragmentShader : [

			'varying vec3 vNormal;',

			'void main(){',

				'gl_FragColor = vec4((vNormal+1.0)*0.5, 1.0);;',


			'}'

		].join('\n')
	},
	/**
	 * 使用法线做边缘检测
	 */
	 'edgeDetectWithNormal' : {

	 	uniforms : {

	 		tNormal : { type : 't', value : 0, texture : null},
	 		offsetX : {type : 'f', value : 512.0},
	 		offsetY : {type : 'f', value : 512.0},
	 		nPixels : {type : 'f', value : 2.0},
	 		threshhold : {type : 'f', value : 0.3}

	 	},

	 	vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

				"vUv = vec2( uv.x, 1.0 - uv.y );",
				"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader : [

			'uniform sampler2D tNormal;',
			'uniform float offsetX;',
			'uniform float offsetY;',
			'uniform float nPixels;',
			'uniform float threshhold;',

			'varying vec2 vUv;',

			'void main(){',
				'vec2 ox = vec2(offsetX*nPixels, 0.0);',
				'vec2 oy = vec2(0.0, offsetY*nPixels);',
				'float dotProduct = 0.0;',
				'vec3 center = texture2D(tNormal, vUv).xyz*2.0-1.0;',

       			'dotProduct += clamp( 1.0 - dot( center, texture2D( tNormal, vUv + ox).xyz*2.0-1.0), 0.0, 1.0);',
       			'dotProduct += clamp( 1.0 - dot( center, texture2D( tNormal, vUv + oy).xyz*2.0-1.0), 0.0, 1.0 );',
       			'dotProduct += clamp( 1.0 - dot( center, texture2D( tNormal, vUv - ox).xyz*2.0-1.0), 0.0, 1.0 );',
       			'dotProduct += clamp( 1.0 - dot( center, texture2D( tNormal, vUv - oy).xyz*2.0-1.0), 0.0, 1.0 );',
       			'float result = 1.0;',
       			'if(dotProduct > threshhold) result = 0.0;',
				'gl_FragColor = vec4(vec3(result), 1.0);',
			'}'
		].join('\n')
	 },

	'final' : {
		uniforms : {
			'tDiffuse' : {type : 't', value : 0, texture:null},
			'tEdge' : {type : 't', value : 1, texture:null},
		},

		vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

				"vUv = vec2( uv.x, 1.0 - uv.y );",
				"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join("\n"),

		fragmentShader: [

			"uniform sampler2D tDiffuse;",
			"uniform sampler2D tEdge;",

			"varying vec2 vUv;",

			"void main() {",

				"vec4 texel1 = texture2D( tDiffuse, vUv );",
				"vec4 texel2 = texture2D( tEdge, vUv );",
				"gl_FragColor = texel1 * texel2;",

			"}"

		].join("\n")
	}
}