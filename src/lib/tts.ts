// Limpia texto markdown/format antes de pasárselo al sintetizador de voz.
// Objetivo: que TTS pronuncie sólo lo accionable, respetando puntuación
// natural (. , ; : ¿ ¡) y SIN leer símbolos (asteriscos, almohadillas, etc.).

const HEADER_MARKERS = [
  "resumen ejecutivo", "diagnóstico", "causa raíz", "solución",
  "pasos", "validación", "rollback", "riesgos",
  "comunicación", "documentación", "seguimiento", "nivel de confianza",
];

export function cleanForTTS(text: string): string {
  if (!text) return "";
  let t = text;

  // 1) Code fences ```...``` y código inline `...` — quitar el contenido (no se lee bien)
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");

  // 2) Links markdown [texto](url) → texto
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 3) Imágenes ![alt](url) → alt
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // 4) URLs sueltas (no se leen bien)
  t = t.replace(/https?:\/\/\S+/g, "");

  // 5) Bold / italic: **texto** *texto* __texto__ _texto_
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  t = t.replace(/\*([^*\n]+)\*/g, "$1");
  t = t.replace(/__([^_\n]+)__/g, "$1");
  t = t.replace(/\b_([^_\n]+)_\b/g, "$1");

  // 6) Headers ## ### etc al inicio de línea
  t = t.replace(/^#{1,6}\s+/gm, "");

  // 7) Bullets al inicio de línea: -, *, •, ●
  t = t.replace(/^[ \t]*[-*•●▪]\s+/gm, "");

  // 8) Tablas / separadores | --- |
  t = t.replace(/\|/g, " ");
  t = t.replace(/^\s*-{3,}\s*$/gm, "");

  // 9) Asteriscos / símbolos sueltos que sobrevivieron (e.g. " * " al medio)
  t = t.replace(/[*_`~#]+/g, "");

  // 10) Bullet points decorativos comunes
  t = t.replace(/[►▶➤➡→]/g, ",");

  // 11) Emojis y pictogramas (Web Speech a veces los lee como "símbolo dos puntos")
  // Rango aproximado del bloque emoji unicode
  t = t.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu,
    "",
  );

  // 12) Normalizar saltos de línea a puntos (mejor pausa que respiraciones largas)
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, ", ");

  // 13) Espacios múltiples y puntuación duplicada
  t = t.replace(/\s+/g, " ");
  t = t.replace(/\s+([,.;:!?])/g, "$1");
  t = t.replace(/([,.;:!?])\1+/g, "$1");
  t = t.replace(/\.\s*,/g, ".");

  return t.trim();
}

// Para respuestas del agente AMS que vienen en 12 bloques, nos quedamos solo con
// el resumen ejecutivo + diagnóstico para que el TTS sea conciso (~700 chars).
export function shortenForTTS(text: string, maxChars = 700): string {
  const lower = text.toLowerCase();
  const exec = lower.indexOf("resumen ejecutivo");
  let slice = text;
  if (exec >= 0) {
    slice = text.slice(exec);
    // Cortar al inicio del siguiente bloque mayor
    const stopAt = HEADER_MARKERS.slice(1)
      .map((m) => slice.toLowerCase().indexOf(m))
      .filter((i) => i > 60)
      .reduce((min, cur) => Math.min(min, cur), slice.length);
    slice = slice.slice(0, stopAt);
  }
  return cleanForTTS(slice).slice(0, maxChars);
}
