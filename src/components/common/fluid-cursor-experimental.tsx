'use client';

import { useEffect, useRef } from 'react';

type FluidCursorExperimentalProps = {
  onFatalError?: () => void;
};

type Splat = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  hue: number;
};

const MAX_SPLATS = 32;

const vertexSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentSource = `
precision highp float;

uniform vec2 u_resolution;
uniform int u_count;
uniform vec4 u_data[${MAX_SPLATS}];
uniform vec3 u_color[${MAX_SPLATS}];

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  vec3 color = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < ${MAX_SPLATS}; i++) {
    if (i >= u_count) {
      break;
    }

    vec2 p = u_data[i].xy;
    float radius = max(u_data[i].z, 0.0001);
    float life = max(u_data[i].w, 0.0);

    vec2 diff = uv - p;
    float d2 = dot(diff, diff);
    float blob = exp(-d2 / (radius * radius)) * life;

    color += u_color[i] * blob;
    alpha += blob;
  }

  color = pow(color, vec3(0.9));
  alpha = clamp(alpha * 0.65, 0.0, 0.92);

  gl_FragColor = vec4(color, alpha);
}
`;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hh >= 0 && hh < 1) {
    r = c;
    g = x;
  } else if (hh < 2) {
    r = x;
    g = c;
  } else if (hh < 3) {
    g = c;
    b = x;
  } else if (hh < 4) {
    g = x;
    b = c;
  } else if (hh < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error('Failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown program link error';
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

export default function FluidCursorExperimental({ onFatalError }: FluidCursorExperimentalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isFinePointer = window.matchMedia('(pointer:fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || reducedMotion) return;

    let raf = 0;
    let running = true;
    const splats: Splat[] = [];

    const fatal = () => {
      if (!running) return;
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      onFatalError?.();
    };

    try {
      const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
      if (!gl) {
        fatal();
        return;
      }

      const program = createProgram(gl, vertexSource, fragmentSource);
      gl.useProgram(program);

      const positionLoc = gl.getAttribLocation(program, 'a_position');
      const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
      const countLoc = gl.getUniformLocation(program, 'u_count');
      const dataLoc = gl.getUniformLocation(program, 'u_data');
      const colorLoc = gl.getUniformLocation(program, 'u_color');

      if (!resolutionLoc || !countLoc || !dataLoc || !colorLoc || positionLoc < 0) {
        fatal();
        return;
      }

      const quad = gl.createBuffer();
      if (!quad) {
        fatal();
        return;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

      const resize = () => {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const width = Math.floor(window.innerWidth * dpr);
        const height = Math.floor(window.innerHeight * dpr);
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        gl.viewport(0, 0, width, height);
      };

      const spawnSplat = (clientX: number, clientY: number) => {
        const x = clientX / Math.max(1, window.innerWidth);
        const y = 1 - clientY / Math.max(1, window.innerHeight);

        for (let i = 0; i < 3; i++) {
          const jitter = 0.01;
          const jx = x + (Math.random() - 0.5) * jitter;
          const jy = y + (Math.random() - 0.5) * jitter;
          splats.push({
            x: Math.min(1, Math.max(0, jx)),
            y: Math.min(1, Math.max(0, jy)),
            vx: (Math.random() - 0.5) * 0.003,
            vy: Math.random() * 0.004 + 0.001,
            radius: 0.045 + Math.random() * 0.028,
            life: 1,
            hue: (Date.now() * 0.08 + Math.random() * 60) % 360,
          });
        }

        while (splats.length > MAX_SPLATS) {
          splats.shift();
        }
      };

      const onMove = (event: MouseEvent) => {
        spawnSplat(event.clientX, event.clientY);
      };

      const onContextLost = (event: Event) => {
        event.preventDefault();
        fatal();
      };

      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', onMove, { passive: true });
      canvas.addEventListener('webglcontextlost', onContextLost);

      const frame = () => {
        if (!running) return;

        try {
          for (let i = splats.length - 1; i >= 0; i--) {
            const s = splats[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx += (Math.random() - 0.5) * 0.0003;
            s.vy += 0.00005;
            s.vx *= 0.985;
            s.vy *= 0.99;
            s.radius *= 1.006;
            s.life -= 0.012;
            s.hue = (s.hue + 0.45) % 360;

            if (s.life <= 0 || s.y > 1.25) {
              splats.splice(i, 1);
            }
          }

          const data = new Float32Array(MAX_SPLATS * 4);
          const colors = new Float32Array(MAX_SPLATS * 3);

          for (let i = 0; i < splats.length; i++) {
            const s = splats[i];
            const d = i * 4;
            const c = i * 3;
            data[d] = s.x;
            data[d + 1] = s.y;
            data[d + 2] = s.radius;
            data[d + 3] = s.life;

            const rgb = hslToRgb(s.hue, 1, 0.65);
            colors[c] = rgb[0];
            colors[c + 1] = rgb[1];
            colors[c + 2] = rgb[2];
          }

          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);
          gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
          gl.uniform1i(countLoc, splats.length);
          gl.uniform4fv(dataLoc, data);
          gl.uniform3fv(colorLoc, colors);
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          raf = window.requestAnimationFrame(frame);
        } catch {
          fatal();
        }
      };

      raf = window.requestAnimationFrame(frame);

      return () => {
        running = false;
        if (raf) window.cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('webglcontextlost', onContextLost);
      };
    } catch {
      fatal();
      return;
    }
  }, [onFatalError]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 h-full w-full pointer-events-none z-[100]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
