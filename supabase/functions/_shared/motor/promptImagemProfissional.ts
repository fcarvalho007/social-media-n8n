// Optional professional image-prompt structure. It is deterministic and server-side:
// the original user prompt remains visible/editable and no extra AI call is made.
export const PROMPT_PROFISSIONAL_VERSAO = "professional-image-v1";

export function aplicarPromptProfissional(prompt: string, proporcao: string): string {
  const p = prompt.trim();
  return [
    `SUBJECT — ${p}`,
    "SCENE — A coherent contemporary setting that supports the subject and intended action.",
    "MOOD — Professional, credible and emotionally precise.",
    `COMPOSITION — Eye-level editorial framing, natural perspective, ${proporcao} aspect ratio, deliberate negative space and a clear focal point.`,
    "LIGHTING — Motivated soft directional light, realistic contrast and natural atmospheric depth.",
    "STYLE — Photorealistic, ultra-detailed, high-end editorial photography with natural material texture.",
    "PALETTE — Controlled colour grade, accurate skin and material tones, balanced contrast.",
    "STRICT PRESERVATION — Preserve the requested subject, action, composition and distinguishing details across versions.",
    "CONSTRAINTS — Clean, sharp image suitable for professional publishing; coherent anatomy, perspective and material detail.",
    `Summary — ${p} in a coherent professional setting. Eye-level editorial frame. Soft motivated light. Photorealistic high-detail finish. Controlled natural palette. Credible mood. Clear focal point and useful negative space.`,
  ].join("\n");
}