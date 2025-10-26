
'use client';

import { useEffect, useRef } from 'react';

const FluidCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationHandle: number;
    
    const initFluid = () => {
      resizeCanvas();

      let config = {
        SIM_RESOLUTION: 128,
        DYE_RESOLUTION: 1024,
        CAPTURE_RESOLUTION: 512,
        DENSITY_DISSIPATION: 4,
        VELOCITY_DISSIPATION: 0.8,
        PRESSURE: 0.8,
        PRESSURE_ITERATIONS: 20,
        CURL: 30,
        SPLAT_RADIUS: 0.02,
        SPLAT_FORCE: 2000,
        SHADING: true,
        COLORFUL: true,
        COLOR_UPDATE_SPEED: 10,
        PAUSED: false,
        BACK_COLOR: { r: 0, g: 0, b: 0 },
        TRANSPARENT: true,
      };

      function pointerPrototype(this: any) {
        this.id = -1;
        this.texcoordX = 0;
        this.texcoordY = 0;
        this.prevTexcoordX = 0;
        this.prevTexcoordY = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.down = false;
        this.moved = false;
        this.color = [30, 0, 300];
      }

      let pointers: any[] = [];
      pointers.push(new (pointerPrototype as any)());

      const { gl, ext } = getWebGLContext(canvas);

      if (!gl) {
        console.error("WebGL context could not be initialized.");
        return;
      }
      
      if (isMobile()) {
        config.DYE_RESOLUTION = 512;
      }
      if (!ext.supportLinearFiltering) {
        config.DYE_RESOLUTION = 512;
        config.SHADING = false;
      }

      function getWebGLContext(canvas: HTMLCanvasElement) {
        const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

        let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvas.getContext('webgl2', params);
        const isWebGL2 = !!gl;
        if (!isWebGL2)
          gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);

        if (!gl) {
          alert('WebGL is not supported.');
          return { gl: null, ext: {} };
        }

        let halfFloat: OES_texture_half_float | null = null;
        let supportLinearFiltering: OES_texture_float_linear | null = null;
        if (isWebGL2) {
          (gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float');
          supportLinearFiltering = (gl as WebGL2RenderingContext).getExtension('OES_texture_float_linear');
        } else {
          halfFloat = gl.getExtension('OES_texture_half_float');
          supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : (halfFloat as OES_texture_half_float).HALF_FLOAT_OES;
        let formatRGBA;
        let formatRG;
        let formatR;

        if (isWebGL2) {
          formatRGBA = getSupportedFormat(gl, (gl as WebGL2RenderingContext).RGBA16F, gl.RGBA, halfFloatTexType);
          formatRG = getSupportedFormat(gl, (gl as WebGL2RenderingContext).RG16F, (gl as WebGL2RenderingContext).RG, halfFloatTexType);
          formatR = getSupportedFormat(gl, (gl as WebGL2RenderingContext).R16F, gl.RED, halfFloatTexType);
        } else {
          formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
          formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
          formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        }

        if (!formatRGBA || !formatRG || !formatR) {
             console.error("WebGL failed to get supported format.");
             return { gl: null, ext: {} };
        }

        return {
          gl,
          ext: {
            formatRGBA,
            formatRG,
            formatR,
            halfFloatTexType,
            supportLinearFiltering
          }
        };
      }

      function getSupportedFormat(gl: WebGLRenderingContext | WebGL2RenderingContext, internalFormat: number, format: number, type: number) {
        if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
          switch (internalFormat) {
            case (gl as WebGL2RenderingContext).R16F:
              return getSupportedFormat(gl, (gl as WebGL2RenderingContext).RG16F, (gl as WebGL2RenderingContext).RG, type);
            case (gl as WebGL2RenderingContext).RG16F:
              return getSupportedFormat(gl, (gl as WebGL2RenderingContext).RGBA16F, gl.RGBA, type);
            default:
              return null;
          }
        }
        return { internalFormat, format };
      }

      function supportRenderTextureFormat(gl: WebGLRenderingContext | WebGL2RenderingContext, internalFormat: number, format: number, type: number) {
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

        let fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(fbo);

        return status == gl.FRAMEBUFFER_COMPLETE;
      }

      class Material {
        vertexShader: WebGLShader;
        fragmentShaderSource: string;
        programs: WebGLProgram[];
        activeProgram: WebGLProgram | null;
        uniforms: { [key: string]: WebGLUniformLocation | null };
      
        constructor(vertexShader: WebGLShader, fragmentShaderSource: string) {
          this.vertexShader = vertexShader;
          this.fragmentShaderSource = fragmentShaderSource;
          this.programs = [];
          this.activeProgram = null;
          this.uniforms = {};
        }
      
        setKeywords(keywords: string[]) {
          let hash = 0;
          for (let i = 0; i < keywords.length; i++) hash += hashCode(keywords[i]);
      
          let program = this.programs[hash];
          if (program == null) {
            const fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
            if (!fragmentShader) return;
            program = createProgram(this.vertexShader, fragmentShader);
            if (!program) return;
            this.programs[hash] = program;
          }
      
          if (program == this.activeProgram) return;
      
          this.uniforms = getUniforms(program);
          this.activeProgram = program;
        }
      
        bind() {
          if (this.activeProgram) {
            gl.useProgram(this.activeProgram);
          }
        }
      }

      class Program {
        uniforms: { [key: string]: WebGLUniformLocation | null };
        program: WebGLProgram;
      
        constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
          this.program = createProgram(vertexShader, fragmentShader) as WebGLProgram;
          this.uniforms = getUniforms(this.program);
        }
      
        bind() {
          gl.useProgram(this.program);
        }
      }

      function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        let program = gl.createProgram();
        if (!program) return null;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          console.trace(gl.getProgramInfoLog(program));
        return program;
      }

      function getUniforms(program: WebGLProgram) {
        let uniforms: { [key: string]: WebGLUniformLocation | null } = {};
        let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
          let uniformInfo = gl.getActiveUniform(program, i);
          if (uniformInfo) {
            uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
          }
        }
        return uniforms;
      }

      function compileShader(type: number, source: string, keywords?: string[] | null): WebGLShader | null {
        source = addKeywords(source, keywords);
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.trace(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
      }

      function addKeywords(source: string, keywords?: string[] | null) {
        if (keywords == null) return source;
        let keywordsString = '';
        keywords.forEach(keyword => {
          keywordsString += '#define ' + keyword + '\n';
        });
        return keywordsString + source;
      }

      const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
          precision highp float;
          attribute vec2 aPosition;
          varying vec2 vUv;
          varying vec2 vL;
          varying vec2 vR;
          varying vec2 vT;
          varying vec2 vB;
          uniform vec2 texelSize;
          void main () {
              vUv = aPosition * 0.5 + 0.5;
              vL = vUv - vec2(texelSize.x, 0.0);
              vR = vUv + vec2(texelSize.x, 0.0);
              vT = vUv + vec2(0.0, texelSize.y);
              vB = vUv - vec2(0.0, texelSize.y);
              gl_Position = vec4(aPosition, 0.0, 1.0);
          }
      `);

      const copyShader = compileShader(gl.FRAGMENT_SHADER, `
          precision mediump float;
          precision mediump sampler2D;
          varying highp vec2 vUv;
          uniform sampler2D uTexture;
          void main () {
              gl_FragColor = texture2D(uTexture, vUv);
          }
      `);

      const clearShader = compileShader(gl.FRAGMENT_SHADER, `
          precision mediump float;
          precision mediump sampler2D;
          varying highp vec2 vUv;
          uniform sampler2D uTexture;
          uniform float value;
          void main () {
              gl_FragColor = value * texture2D(uTexture, vUv);
          }
      `);

      const splatShader = compileShader(gl.FRAGMENT_SHADER, `
          precision highp float;
          precision highp sampler2D;
          varying vec2 vUv;
          uniform sampler2D uTarget;
          uniform float aspectRatio;
          uniform vec3 color;
          uniform vec2 point;
          uniform float radius;
          void main () {
              vec2 p = vUv - point.xy;
              p.x *= aspectRatio;
              vec3 splat = exp(-dot(p, p) / radius) * color;
              vec3 base = texture2D(uTarget, vUv).xyz;
              gl_FragColor = vec4(base + splat, 1.0);
          }
      `);

      const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
          precision highp float;
          precision highp sampler2D;
          varying vec2 vUv;
          uniform sampler2D uVelocity;
          uniform sampler2D uSource;
          uniform vec2 texelSize;
          uniform vec2 dyeTexelSize;
          uniform float dt;
          uniform float dissipation;
          vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
              vec2 st = uv / tsize - 0.5;
              vec2 iuv = floor(st);
              vec2 fuv = fract(st);
              vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
              vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
              vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
              vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
              return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
          }
          void main () {
          #ifdef MANUAL_FILTERING
              vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
              gl_FragColor = bilerp(uSource, coord, dyeTexelSize);
          #else
              vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
              gl_FragColor = texture2D(uSource, coord);
          #endif
              gl_FragColor *= dissipation;
          }`,
        ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
      );

      const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
          precision mediump float;
          precision mediump sampler2D;
          varying highp vec2 vUv;
          varying highp vec2 vL;
          varying highp vec2 vR;
          varying highp vec2 vT;
          varying highp vec2 vB;
          uniform sampler2D uVelocity;
          void main () {
              float L = texture2D(uVelocity, vL).x;
              float R = texture2D(uVelocity, vR).x;
              float T = texture2D(uVelocity, vT).y;
              float B = texture2D(uVelocity, vB).y;
              vec2 C = texture2D(uVelocity, vUv).xy;
              if (vL.x < 0.0) { L = -C.x; }
              if (vR.x > 1.0) { R = -C.x; }
              if (vT.y > 1.0) { T = -C.y; }
              if (vB.y < 0.0) { B = -C.y; }
              float div = 0.5 * (R - L + T - B);
              gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
          }
      `);

      const curlShader = compileShader(gl.FRAGMENT_SHADER, `
          precision mediump float;
          precision mediump sampler2D;
          varying highp vec2 vUv;
          varying highp vec2 vL;
          varying highp vec2 vR;
          varying highp vec2 vT;
          varying highp vec2 vB;
          uniform sampler2D uVelocity;
          void main () {
              float L = texture2D(uVelocity, vL).y;
              float R = texture2D(uVelocity, vR).y;
              float T = texture2D(uVelocity, vT).x;
              float B = texture2D(uVelocity, vB).x;
              float vorticity = R - L - T + B;
              gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
          }
      `);

      const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
          precision highp float;
          precision highp sampler2D;
          varying vec2 vUv;
          varying vec2 vL;
          varying vec2 vR;
          varying vec2 vT;
          varying vec2 vB;
          uniform sampler2D uVelocity;
          uniform sampler2D uCurl;
          uniform float curl;
          uniform float dt;
          void main () {
              float L = texture2D(uCurl, vL).x;
              float R = texture2D(uCurl, vR).x;
              float T = texture2D(uCurl, vT).x;
              float B = texture2D(uCurl, vB).x;
              float C = texture2D(uCurl, vUv).x;
              vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
              force /= length(force) + 0.0001;
              force *= curl * C;
              force.y *= -1.0;
              vec2 velocity = texture2D(uVelocity, vUv).xy;
              velocity += force * dt;
              velocity = min(max(velocity, -1000.0), 1000.0);
              gl_FragColor = vec4(velocity, 0.0, 1.0);
          }
      `);

      const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
          precision mediump float;
          precision mediump sampler2D;
          varying highp vec2 vUv;
          varying highp vec2 vL;
          varying highp vec2 vR;
          varying highp vec2 vT;
          varying highp vec2 vB;
          uniform sampler2D uPressure;
          uniform sampler2D uDivergence;
          void main () {
              float L = texture2D(uPressure, vL).x;
              float R = texture2D(uPressure, vR).x;
              float T = texture2D(uPressure, vT).x;
              float B = texture2D(uPressure, vB).x;
              float divergence = texture2D(uDivergence, vUv).x;
              float pressure = (L + R + B + T - divergence) * 0.25;
              gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
          }
      `);

      const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
          precision mediump float;
          precision mediump sampler2D;
          varying highp vec2 vUv;
          varying highp vec2 vL;
          varying highp vec2 vR;
          varying highp vec2 vT;
          varying highp vec2 vB;
          uniform sampler2D uPressure;
          uniform sampler2D uVelocity;
          void main () {
              float L = texture2D(uPressure, vL).x;
              float R = texture2D(uPressure, vR).x;
              float T = texture2D(uPressure, vT).x;
              float B = texture2D(uPressure, vB).x;
              vec2 velocity = texture2D(uVelocity, vUv).xy;
              velocity.xy -= vec2(R - L, T - B);
              gl_FragColor = vec4(velocity, 0.0, 1.0);
          }
      `);
      
      const displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        #ifdef SHADING
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform vec2 texelSize;
        #endif
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
            float contrast = 0.6;
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;

            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);

            c.rgb = normalize(c.rgb);

            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);

            float diffuse = clamp(dot(n, l) + contrast, 0.0, 1.0);
            c *= diffuse;
        #endif
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `;

      if (!baseVertexShader || !copyShader || !clearShader || !splatShader || !advectionShader || !divergenceShader || !curlShader || !vorticityShader || !pressureShader || !gradientSubtractShader) {
        console.error("Failed to compile one or more shaders.");
        return;
      }
      
      const blit = (() => {
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        const elBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

        return (destination: any, clear = false) => {
          if (destination == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          } else {
            gl.viewport(0, 0, destination.width, destination.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, destination.fbo);
          }
          if (clear) {
            gl.clearColor(config.BACK_COLOR.r, config.BACK_COLOR.g, config.BACK_COLOR.b, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
          }
          gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
      })();

      let dye: any;
      let velocity: any;
      let divergence: any;
      let curl: any;
      let pressure: any;
      
      const copyProgram = new Program(baseVertexShader, copyShader);
      const clearProgram = new Program(baseVertexShader, clearShader);
      const splatProgram = new Program(baseVertexShader, splatShader);
      const advectionProgram = new Program(baseVertexShader, advectionShader);
      const divergenceProgram = new Program(baseVertexShader, divergenceShader);
      const curlProgram = new Program(baseVertexShader, curlShader);
      const vorticityProgram = new Program(baseVertexShader, vorticityShader);
      const pressureProgram = new Program(baseVertexShader, pressureShader);
      const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
      const displayMaterial = new Material(baseVertexShader, displayShaderSource);
      
      const pos_loc = gl.getAttribLocation(copyProgram.program, "aPosition");
      if(pos_loc !== -1) {
        gl.enableVertexAttribArray(pos_loc);
        gl.vertexAttribPointer(pos_loc, 2, gl.FLOAT, false, 0, 0);
      } else {
        console.error("aPosition attribute not found in copyProgram");
        return;
      }


      function initFramebuffers() {
        let simRes = getResolution(config.SIM_RESOLUTION);
        let dyeRes = getResolution(config.DYE_RESOLUTION);

        const texType = ext.halfFloatTexType;
        const rgba = ext.formatRGBA;
        const rg = ext.formatRG;
        const r = ext.formatR;
        const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
        
        if (dye == null)
            dye = createDoubleFBO(dyeRes.width, dyeRes.height, (rgba as any).internalFormat, (rgba as any).format, texType, filtering);
        else
            dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, (rgba as any).internalFormat, (rgba as any).format, texType, filtering);

        if (velocity == null)
            velocity = createDoubleFBO(simRes.width, simRes.height, (rg as any).internalFormat, (rg as any).format, texType, filtering);
        else
            velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, (rg as any).internalFormat, (rg as any).format, texType, filtering);

        divergence = createFBO(simRes.width, simRes.height, (r as any).internalFormat, (r as any).format, texType, gl.NEAREST);
        curl = createFBO(simRes.width, simRes.height, (r as any).internalFormat, (r as any).format, texType, gl.NEAREST);
        pressure = createDoubleFBO(simRes.width, simRes.height, (r as any).internalFormat, (r as any).format, texType, gl.NEAREST);
      }

      function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
        gl.activeTexture(gl.TEXTURE0);
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

        let fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);

        let texelSizeX = 1.0 / w;
        let texelSizeY = 1.0 / h;

        return {
          texture, fbo, width: w, height: h, texelSizeX, texelSizeY,
          attach(id: number) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
          }
        };
      }

      function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
        let fbo1 = createFBO(w, h, internalFormat, format, type, param);
        let fbo2 = createFBO(w, h, internalFormat, format, type, param);
        return {
          width: w, height: h, texelSizeX: fbo1.texelSizeX, texelSizeY: fbo1.texelSizeY,
          get read() { return fbo1; },
          set read(value) { fbo1 = value; },
          get write() { return fbo2; },
          set write(value) { fbo2 = value; },
          swap() {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
          }
        };
      }

      function resizeFBO(target: any, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
        let newFBO = createFBO(w, h, internalFormat, format, type, param);
        copyProgram.bind();
        gl.uniform1i(copyProgram.uniforms.uTexture!, target.attach(0));
        blit(newFBO);
        return newFBO;
      }
      
      function resizeDoubleFBO(target: any, w: number, h: number, internalFormat: number, format: number, type: number, param: number) {
        if (target.width == w && target.height == h)
            return target;
        target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
        target.write = createFBO(w, h, internalFormat, format, type, param);
        target.width = w;
        target.height = h;
        target.texelSizeX = 1.0 / w;
        target.texelSizeY = 1.0 / h;
        return target;
      }

      function updateKeywords() {
        let displayKeywords = [];
        if (config.SHADING) displayKeywords.push("SHADING");
        displayMaterial.setKeywords(displayKeywords);
      }

      updateKeywords();
      initFramebuffers();
      multipleSplats(parseInt((Math.random() * 20 + 5).toString()));

      let lastUpdateTime = Date.now();
      let colorUpdateTimer = 0.0;
      
      function update() {
        const dt = calcDeltaTime();
        if (resizeCanvas())
          initFramebuffers();
        updateColors(dt);
        applyInputs();
        if (!config.PAUSED)
          step(dt);
        render(null);
        animationHandle = requestAnimationFrame(update);
      }

      function calcDeltaTime() {
        let now = Date.now();
        let dt = (now - lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016666);
        lastUpdateTime = now;
        return dt;
      }

      function resizeCanvas() {
        let width = scaleByPixelRatio(canvas.clientWidth);
        let height = scaleByPixelRatio(canvas.clientHeight);
        if (canvas.width != width || canvas.height != height) {
          canvas.width = width;
          canvas.height = height;
          return true;
        }
        return false;
      }

      function updateColors(dt: number) {
        if (!config.COLORFUL) return;

        colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
        if (colorUpdateTimer >= 1) {
          colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
          pointers.forEach(p => {
            p.color = generateColor();
          });
        }
      }

      function applyInputs() {
        pointers.forEach(p => {
          if (p.moved) {
            p.moved = false;
            splatPointer(p);
          }
        });
      }

      function step(dt: number) {
        gl.disable(gl.BLEND);
        gl.viewport(0, 0, velocity.width, velocity.height);

        curlProgram.bind();
        gl.uniform2f(curlProgram.uniforms.texelSize!, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(curlProgram.uniforms.uVelocity!, velocity.read.attach(0));
        blit(curl);

        vorticityProgram.bind();
        gl.uniform2f(vorticityProgram.uniforms.texelSize!, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(vorticityProgram.uniforms.uVelocity!, velocity.read.attach(0));
        gl.uniform1i(vorticityProgram.uniforms.uCurl!, curl.attach(1));
        gl.uniform1f(vorticityProgram.uniforms.curl!, config.CURL);
        gl.uniform1f(vorticityProgram.uniforms.dt!, dt);
        blit(velocity.write);
        velocity.swap();

        divergenceProgram.bind();
        gl.uniform2f(divergenceProgram.uniforms.texelSize!, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(divergenceProgram.uniforms.uVelocity!, velocity.read.attach(0));
        blit(divergence);

        clearProgram.bind();
        gl.uniform1i(clearProgram.uniforms.uTexture!, pressure.read.attach(0));
        gl.uniform1f(clearProgram.uniforms.value!, config.PRESSURE);
        blit(pressure.write);
        pressure.swap();

        pressureProgram.bind();
        gl.uniform2f(pressureProgram.uniforms.texelSize!, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(pressureProgram.uniforms.uDivergence!, divergence.attach(0));
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
          gl.uniform1i(pressureProgram.uniforms.uPressure!, pressure.read.attach(1));
          blit(pressure.write);
          pressure.swap();
        }

        gradienSubtractProgram.bind();
        gl.uniform2f(gradienSubtractProgram.uniforms.texelSize!, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(gradienSubtractProgram.uniforms.uPressure!, pressure.read.attach(0));
        gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity!, velocity.read.attach(1));
        blit(velocity.write);
        velocity.swap();

        advectionProgram.bind();
        gl.uniform2f(advectionProgram.uniforms.texelSize!, velocity.texelSizeX, velocity.texelSizeY);
        if (!ext.supportLinearFiltering)
          gl.uniform2f(advectionProgram.uniforms.dyeTexelSize!, velocity.texelSizeX, velocity.texelSizeY);
        let velocityId = velocity.read.attach(0);
        gl.uniform1i(advectionProgram.uniforms.uVelocity!, velocityId);
        gl.uniform1i(advectionProgram.uniforms.uSource!, velocityId);
        gl.uniform1f(advectionProgram.uniforms.dt!, dt);
        gl.uniform1f(advectionProgram.uniforms.dissipation!, 1.0 - config.VELOCITY_DISSIPATION * dt);
        blit(velocity.write);
        velocity.swap();

        gl.viewport(0, 0, dye.width, dye.height);

        if (!ext.supportLinearFiltering)
          gl.uniform2f(advectionProgram.uniforms.dyeTexelSize!, dye.texelSizeX, dye.texelSizeY);
        gl.uniform1i(advectionProgram.uniforms.uVelocity!, velocity.read.attach(0));
        gl.uniform1i(advectionProgram.uniforms.uSource!, dye.read.attach(1));
        gl.uniform1f(advectionProgram.uniforms.dissipation!, 1.0 - config.DENSITY_DISSIPATION * dt);
        blit(dye.write);
        dye.swap();
      }

      function render(target: any) {
        if (config.TRANSPARENT) {
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.enable(gl.BLEND);
        } else {
          gl.disable(gl.BLEND);
        }
        let width = target == null ? gl.drawingBufferWidth : target.width;
        let height = target == null ? gl.drawingBufferHeight : target.height;
        gl.viewport(0, 0, width, height);

        displayMaterial.bind();
        if (config.SHADING)
          gl.uniform2f(displayMaterial.uniforms.texelSize!, 1.0 / width, 1.0 / height);
        gl.uniform1i(displayMaterial.uniforms.uTexture!, dye.read.attach(0));

        blit(target);
      }

      function splatPointer(pointer: any) {
        let dx = pointer.deltaX * config.SPLAT_FORCE;
        let dy = pointer.deltaY * config.SPLAT_FORCE;
        splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
      }
      
      function multipleSplats(amount: number) {
        for (let i = 0; i < amount; i++) {
            const color = generateColor();
            color.r *= 10.0;
            color.g *= 10.0;
            color.b *= 10.0;
            const x = Math.random();
            const y = Math.random();
            const dx = 1000 * (Math.random() - 0.5);
            const dy = 1000 * (Math.random() - 0.5);
            splat(x, y, dx, dy, color);
        }
      }

      function splat(x: number, y: number, dx: number, dy: number, color: { r: number, g: number, b: number }) {
        gl.viewport(0, 0, velocity.width, velocity.height);
        splatProgram.bind();
        gl.uniform1i(splatProgram.uniforms.uTarget!, velocity.read.attach(0));
        gl.uniform1f(splatProgram.uniforms.aspectRatio!, canvas.width / canvas.height);
        gl.uniform2f(splatProgram.uniforms.point!, x, y);
        gl.uniform3f(splatProgram.uniforms.color!, dx, dy, 0.0);
        gl.uniform1f(splatProgram.uniforms.radius!, correctRadius(config.SPLAT_RADIUS / 100.0));
        blit(velocity.write);
        velocity.swap();

        gl.viewport(0, 0, dye.width, dye.height);
        gl.uniform1i(splatProgram.uniforms.uTarget!, dye.read.attach(0));
        gl.uniform3f(splatProgram.uniforms.color!, color.r, color.g, color.b);
        blit(dye.write);
        dye.swap();
      }

      function correctRadius(radius: number) {
        let aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1)
          radius *= aspectRatio;
        return radius;
      }

      const mouseMove = (e: MouseEvent) => {
        let pointer = pointers[0];
        if (!pointer) return;
        let posX = scaleByPixelRatio(e.clientX);
        let posY = scaleByPixelRatio(e.clientY);
        updatePointerMoveData(pointer, posX, posY);
      };
      
      const mouseDown = (e: MouseEvent) => {
          let posX = scaleByPixelRatio(e.clientX);
          let posY = scaleByPixelRatio(e.clientY);
          let pointer = pointers.find(p => p.id == -1);
          if (pointer == null) {
              pointer = new (pointerPrototype as any)();
          }
          updatePointerDownData(pointer, -1, posX, posY);
      };
      
      const touchStart = (e: TouchEvent) => {
          const touches = e.targetTouches;
          for (let i = 0; i < touches.length; i++) {
              let pointer = pointers[i];
              if (pointer == null) {
                  pointer = new (pointerPrototype as any)();
                  pointers.push(pointer);
              }
              let posX = scaleByPixelRatio(touches[i].pageX);
              let posY = scaleByPixelRatio(touches[i].pageY);
              updatePointerDownData(pointer, touches[i].identifier, posX, posY);
          }
      };
      
      const touchMove = (e: TouchEvent) => {
          e.preventDefault();
          const touches = e.targetTouches;
          for (let i = 0; i < touches.length; i++) {
              let pointer = pointers[i];
              if (pointer == null) continue;
              let posX = scaleByPixelRatio(touches[i].pageX);
              let posY = scaleByPixelRatio(touches[i].pageY);
              updatePointerMoveData(pointer, posX, posY);
          }
      };
      
      const mouseUp = () => {
          if (pointers[0]) {
             updatePointerUpData(pointers[0]);
          }
      };

      const touchEnd = (e: TouchEvent) => {
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            let pointer = pointers.find(p => p.id == touches[i].identifier);
            if (pointer == null) continue;
            updatePointerUpData(pointer);
        }
      };


      window.addEventListener('mousemove', mouseMove);
      window.addEventListener('mousedown', mouseDown);
      window.addEventListener('mouseup', mouseUp);
      window.addEventListener('touchstart', touchStart);
      window.addEventListener('touchmove', touchMove, { passive: false });
      window.addEventListener('touchend', touchEnd);


      function updatePointerDownData(pointer: any, id: number, posX: number, posY: number) {
        pointer.id = id;
        pointer.down = true;
        pointer.moved = false;
        pointer.texcoordX = posX / canvas.width;
        pointer.texcoordY = 1.0 - posY / canvas.height;
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
        pointer.deltaX = 0;
        pointer.deltaY = 0;
        pointer.color = generateColor();
      }

      function updatePointerMoveData(pointer: any, posX: number, posY: number) {
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
        pointer.texcoordX = posX / canvas.width;
        pointer.texcoordY = 1.0 - posY / canvas.height;
        pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
        pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
        pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
      }

      function updatePointerUpData(pointer: any) {
        pointer.down = false;
      }

      function correctDeltaX(delta: number) {
        let aspectRatio = canvas.width / canvas.height;
        if (aspectRatio < 1) delta *= aspectRatio;
        return delta;
      }

      function correctDeltaY(delta: number) {
        let aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1) delta /= aspectRatio;
        return delta;
      }

      function generateColor() {
        let c = HSVtoRGB(Math.random(), 1.0, 1.0);
        c.r *= 0.15;
        c.g *= 0.15;
        c.b *= 0.15;
        return c;
      }

      function HSVtoRGB(h: number, s: number, v: number) {
        let r, g, b, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        let r_temp = 0, g_temp = 0, b_temp = 0;
        switch (i % 6) {
          case 0: r_temp = v, g_temp = t, b_temp = p; break;
          case 1: r_temp = q, g_temp = v, b_temp = p; break;
          case 2: r_temp = p, g_temp = v, b_temp = t; break;
          case 3: r_temp = p, g_temp = q, b_temp = v; break;
          case 4: r_temp = t, g_temp = p, b_temp = v; break;
          case 5: r_temp = v, g_temp = p, b_temp = q; break;
        }
        return { r: r_temp, g: g_temp, b: b_temp };
      }

      function wrap(value: number, min: number, max: number) {
        let range = max - min;
        if (range == 0) return min;
        return (value - min) % range + min;
      }

      function getResolution(resolution: number) {
        let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspectRatio < 1)
          aspectRatio = 1.0 / aspectRatio;
        let min = Math.round(resolution);
        let max = Math.round(resolution * aspectRatio);
        if (gl.drawingBufferWidth > gl.drawingBufferHeight)
          return { width: max, height: min };
        else
          return { width: min, height: max };
      }
      
      function isMobile() {
        return /Mobi|Android/i.test(navigator.userAgent);
      }

      function scaleByPixelRatio(input: number) {
        let pixelRatio = window.devicePixelRatio || 1;
        return Math.floor(input * pixelRatio);
      }

      function hashCode(s: string) {
        if (s.length == 0) return 0;
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
          hash = (hash << 5) - hash + s.charCodeAt(i);
          hash |= 0;
        }
        return hash;
      }
      
      update();

      return () => {
        if(animationHandle) cancelAnimationFrame(animationHandle);
        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mousedown', mouseDown);
        window.removeEventListener('mouseup', mouseUp);
        window.removeEventListener('touchstart', touchStart);
        window.removeEventListener('touchmove', touchMove);
        window.removeEventListener('touchend', touchEnd);
      }
    };
    
    // The component was unmounted, so we should stop the animation
    let cleanup: (() => void) | undefined;
    if (canvas) {
      cleanup = initFluid();
    }
    
    return () => {
      if(cleanup) cleanup();
    };

  }, []);

  return <canvas id="fluid-canvas" ref={canvasRef}></canvas>;
};

export default FluidCursor;

    