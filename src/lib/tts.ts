// Limpia texto markdown/format antes de pasárselo al sintetizador de voz.
// Objetivo: que TTS pronuncie sólo lo accionable, respetando puntuación
// natural (. , ; : ¿ ¡) y SIN leer símbolos (asteriscos, almohadillas, etc.).

const HEADER_MARKERS = [
  "resumen ejecutivo", "diagnóstico", "causa raíz", "solución",
  "pasos", "validación", "rollback", "riesgos",
  "comunicación", "documentación", "seguimiento", "nivel de confianza",
];

// Diccionario de pronunciación de transacciones SAP que las voces TTS
// españolas suelen leer mal. Solo para casos críticos — el resto suena bien.
const SAP_PRONUNCIATION: Array<[RegExp, string]> = [
  // Transacciones que empiezan con / (custom S/4)
  [/\/SCWM\//gi, "ese ce uve eme "],
  [/\/IWFND\//gi, "i uve efe ene de "],
  [/\bSAP\b/g, "ese-a-pe"],
  [/\bIDoc\b/g, "i-doc"],
  [/\bOData\b/g, "o-data"],
  [/\bRCA\b/g, "erre ce a"],
  [/\bSLA\b/g, "ese ele a"],
  [/\bUD\b/g, "u de"],
  [/\bBOM\b/g, "be o eme"],
  [/\bBTP\b/g, "be te pe"],
  [/\bWT\b/g, "doble u te"],
];

export function cleanForTTS(text: string): string {
  if (!text) return "";
  let t = text;

  // 1) Code fences ```...``` (multilinea) — sacarlos completos
  t = t.replace(/```[\s\S]*?```/g, " ");
  // Código inline `...` → solo el contenido
  t = t.replace(/`([^`]+)`/g, "$1");

  // 2) Links markdown [texto](url) → texto
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 3) Imágenes ![alt](url) → alt
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // 4) URLs sueltas
  t = t.replace(/https?:\/\/\S+/g, "");

  // 5) Bold / italic
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  t = t.replace(/\*([^*\n]+)\*/g, "$1");
  t = t.replace(/__([^_\n]+)__/g, "$1");
  t = t.replace(/\b_([^_\n]+)_\b/g, "$1");

  // 6) Headers markdown
  t = t.replace(/^#{1,6}\s+/gm, "");

  // 7) Bullets
  t = t.replace(/^[ \t]*[-*•●▪◦▸▶]\s+/gm, "");
  // numeración tipo "1) " o "1. "
  t = t.replace(/^[ \t]*\d+[).]\s+/gm, "");

  // 8) Tablas y separadores
  t = t.replace(/\|/g, " ");
  t = t.replace(/^\s*-{3,}\s*$/gm, "");

  // 9) Símbolos sueltos
  t = t.replace(/[*_`~#]+/g, "");

  // 10) Decorativos / flechas → ","
  t = t.replace(/[►▶➤➡→←↑↓⇒⇐]/g, ", ");

  // 11) Emojis y pictogramas
  t = t.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{2700}-\u{27BF}]/gu,
    "",
  );

  // 12) Aplicar diccionario SAP — ANTES de tocar la puntuación
  for (const [rx, replacement] of SAP_PRONUNCIATION) {
    t = t.replace(rx, replacement);
  }

  // 13) Paréntesis, corchetes y llaves → comas (no decir "abre paréntesis")
  t = t.replace(/[\(\[\{]/g, ", ");
  t = t.replace(/[\)\]\}]/g, ", ");

  // 14) Guiones largos / em-dash / en-dash → coma
  t = t.replace(/\s*[—–]+\s*/g, ", ");

  // 15) Comillas dobles y simples raras
  t = t.replace(/["""''`´]/g, "");

  // 16) Dos puntos `:` → coma (la voz NO lo lee literal de esta forma)
  //     Excepto en horas tipo "14:30" → dejarlas
  t = t.replace(/(?<!\d):(?!\d)/g, ", ");
  // Punto y coma → coma (algunas voces lo leen como "punto y coma")
  t = t.replace(/;/g, ", ");

  // 17) Saltos de línea
  //  - 2+ saltos: pausa fuerte = punto
  //  - 1 salto: pausa media = coma
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, ", ");

  // 18) Normalización agresiva de puntuación adyacente
  //     Cualquier mezcla de ., , adyacentes (con espacios) → el más fuerte gana
  //     "Hola , . Como . , estás" → "Hola. Como. estás"
  // a) colapsar runs de puntos a "."
  t = t.replace(/(\s*\.\s*){2,}/g, ". ");
  // b) colapsar runs de comas a ","
  t = t.replace(/(\s*,\s*){2,}/g, ", ");
  // c) si quedan mixtos "., " o ",. " o " , . " etc → "."
  t = t.replace(/[\s,.]*\.[\s,.]*/g, ". ");
  // d) volver a colapsar ", ," que pueda haber generado el anterior
  t = t.replace(/(\s*,\s*){2,}/g, ", ");

  // 19) Espacio antes de puntuación
  t = t.replace(/\s+([,.!?])/g, "$1");

  // 20) Asegurar espacio después de puntuación si vino pegado
  t = t.replace(/([,.!?])([A-Za-zÁÉÍÓÚÑáéíóúñ])/g, "$1 $2");

  // 21) Múltiples espacios → 1
  t = t.replace(/[ \t]+/g, " ");

  // 22) Limpiar coma final
  t = t.replace(/[,.\s]+$/, ".");
  // y coma al inicio
  t = t.replace(/^[,.\s]+/, "");

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
