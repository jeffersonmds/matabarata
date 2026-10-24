import Phaser from 'phaser';

// Tela de tubo: curvatura leve, linhas de varredura e vinheta. Só existe no WebGL (no Canvas o jogo fica sem o efeito).
const frag = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uResolution;
varying vec2 outTexCoord;

void main() {
  vec2 c = outTexCoord * 2.0 - 1.0;
  vec2 uv = c * (1.0 + dot(c.yx, c.yx) * 0.04) * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec3 color = texture2D(uMainSampler, uv).rgb;
  float scan = 0.82 + 0.18 * sin(uv.y * uResolution.y * 2.0);
  float vignette = smoothstep(1.5, 0.5, length(c));
  gl_FragColor = vec4(color * scan * vignette, 1.0);
}`;

export class CrtPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'crt', fragShader: frag });
  }

  onPreRender() {
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}
