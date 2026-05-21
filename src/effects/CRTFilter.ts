import { Filter, GlProgram } from 'pixi.js';

const vertexSrc = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragmentSrc = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

void main(void) {
    vec2 uv = vTextureCoord;
    
    // Scanline effect
    float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.04;
    
    // Slight RGB separation
    float offset = 0.001;
    float r = texture(uTexture, vec2(uv.x + offset, uv.y)).r;
    float g = texture(uTexture, uv).g;
    float b = texture(uTexture, vec2(uv.x - offset, uv.y)).b;
    
    vec3 color = vec3(r, g, b);
    
    // Apply scanlines
    color -= scanline;
    
    // Vignette
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.5;
    color *= vignette;
    
    // Slight brightness boost to compensate
    color *= 1.1;
    
    finalColor = vec4(color, 1.0);
}
`;

export class CRTFilter extends Filter {
  private _time = 0;

  constructor() {
    const glProgram = GlProgram.from({
      vertex: vertexSrc,
      fragment: fragmentSrc,
    });

    super({
      glProgram,
      resources: {
        crtUniforms: {
          uTime: { value: 0, type: 'f32' },
          uResolution: { value: new Float32Array([800, 600]), type: 'vec2<f32>' },
        },
      },
    });
  }

  update(dt: number): void {
    this._time += dt;
    this.resources.crtUniforms.uniforms.uTime = this._time;
  }

  setResolution(width: number, height: number): void {
    this.resources.crtUniforms.uniforms.uResolution = new Float32Array([width, height]);
  }
}
