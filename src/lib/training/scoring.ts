// Lógica de scoring + matching local para el simulador del agente.
// Sin IA real: similitud por palabras clave + bonus por módulo.
//
// Cuando exista RAG real, esta misma interfaz se reemplaza por una
// llamada al backend manteniendo el shape del resultado.

import type { KnowledgeItem, TrainingSettings } from "@/types/training";

const STOPWORDS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","y","o","u","en","con",
  "sin","por","para","que","se","es","ser","esta","estoy","esta","están","esto","eso",
  "no","si","sí","como","cómo","cuando","cuándo","donde","dónde","qué","cual","cuál",
  "hace","hacer","hago","tengo","tiene","tienes","tener","puede","puedo","podemos",
  "the","of","to","and","in","on","at","for","with","by","is","are","was","were","be",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúñü0-9\s/_-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  return inter / (a.size + b.size - inter);
}

export interface MatchScore {
  item: KnowledgeItem;
  score: number;       // 0..1
  reasons: string[];
}

/**
 * Encuentra los k ítems más relevantes para una pregunta.
 * Considera: similitud Jaccard sobre tokens, bonus por módulo,
 * bonus por tags exactos en la pregunta, penaliza items no publicados.
 */
export function findRelevantKnowledge(
  question: string,
  items: KnowledgeItem[],
  opts: { module?: string; topK?: number; minScore?: number } = {},
): MatchScore[] {
  const qTokens = new Set(tokenize(question));
  if (qTokens.size === 0) return [];
  const topK = opts.topK ?? 3;
  const minScore = opts.minScore ?? 0.06;

  const scored: MatchScore[] = items.map((item) => {
    const reasons: string[] = [];
    const itemText = `${item.title} ${item.summary} ${item.content} ${item.tags.join(" ")}`;
    const itemTokens = new Set(tokenize(itemText));
    let s = jaccard(qTokens, itemTokens);
    if (s > 0) reasons.push(`coincidencia léxica ${(s * 100).toFixed(0)}%`);

    // Bonus por módulo SAP coincidente
    if (opts.module && opts.module !== "auto" && item.module === opts.module) {
      s += 0.15;
      reasons.push(`módulo ${item.module} coincide`);
    } else if (item.module && qTokens.has(item.module.toLowerCase())) {
      s += 0.10;
      reasons.push(`mencionás ${item.module}`);
    }

    // Bonus por tags exactos en la pregunta
    const tagHits = item.tags.filter((t) => qTokens.has(t.toLowerCase()));
    if (tagHits.length) {
      s += 0.05 * tagHits.length;
      reasons.push(`tags: ${tagHits.join(", ")}`);
    }

    // Penalización si no está publicado o validado (preferimos contenido aprobado)
    if (item.status === "PUBLISHED") s += 0.08;
    else if (item.status === "VALIDATED") s += 0.04;
    else if (item.status === "DRAFT" || item.status === "REJECTED") s -= 0.05;

    return { item, score: Math.max(0, Math.min(1, s)), reasons };
  });

  return scored
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export interface SimulatedAnswer {
  text: string;
  confidence: "alta" | "media" | "baja";
  usedKnowledge: MatchScore[];
  gapDetected: { title: string; reason: string } | null;
  recommendation: string | null;
}

/**
 * Construye una respuesta simulada combinando los ítems más relevantes.
 * No llama al backend. Si no encuentra suficientes matches sugiere brecha.
 */
export function simulateAnswer(
  question: string,
  items: KnowledgeItem[],
  settings: TrainingSettings,
  opts: { module?: string; role?: string; serviceLevel?: string } = {},
): SimulatedAnswer {
  const matches = findRelevantKnowledge(question, items, { module: opts.module, topK: 3 });

  if (matches.length === 0) {
    return {
      text: "El agente no encontró conocimiento suficiente para responder con confianza. Recomendado: derivar a un consultor AMS y registrar este caso como brecha de conocimiento.",
      confidence: "baja",
      usedKnowledge: [],
      gapDetected: {
        title: `Pregunta sin cobertura suficiente — ${opts.module ?? "sin módulo"}`,
        reason: "Ningún ítem de conocimiento alcanzó el umbral mínimo de similitud para esta pregunta.",
      },
      recommendation: "Cargar conocimiento sobre este tema para mejorar la cobertura del agente.",
    };
  }

  const top = matches[0];
  // Confianza basada en score del top + estado del item
  let confidence: SimulatedAnswer["confidence"] = "baja";
  if (top.score >= 0.5 && top.item.status === "PUBLISHED") confidence = "alta";
  else if (top.score >= 0.30) confidence = "media";

  // Si el modo estricto está activo y la confianza es baja, recomendar derivar
  const strict = settings.strictMode && confidence === "baja";

  const lines: string[] = [];
  if (settings.responseFormat === "structured") {
    lines.push("**Diagnóstico sugerido por el agente:**", "");
    matches.forEach((m, i) => {
      lines.push(`${i + 1}. ${m.item.title}`);
      lines.push(`   - ${m.item.summary}`);
    });
    lines.push("");
    lines.push(`**Nivel de confianza:** ${confidence}`);
    if (strict) lines.push("**Modo estricto activo**: derivar a consultor humano antes de aplicar la solución.");
  } else if (settings.responseFormat === "concise") {
    lines.push(top.item.summary);
    if (strict) lines.push("(modo estricto: validar con consultor antes de aplicar)");
  } else {
    lines.push(`Para "${question}", el agente debería seguir estos pasos:`, "");
    matches.forEach((m, i) => lines.push(`${i + 1}. ${m.item.summary}`));
  }

  // Detección de brecha si confianza no es alta
  let gap: SimulatedAnswer["gapDetected"] = null;
  if (confidence !== "alta") {
    gap = {
      title: `Mejora sugerida para ${top.item.module} · ${top.item.process}`,
      reason: confidence === "media"
        ? "Score de similitud medio: convendría ampliar contenido o ejemplos."
        : "Confianza baja: faltan ítems específicos sobre este escenario.",
    };
  }

  // Recomendación contextual
  let rec: string | null = null;
  if (confidence === "alta" && top.item.status !== "PUBLISHED") {
    rec = "Considerar publicar este artículo para que el agente lo use en producción.";
  } else if (confidence === "media") {
    rec = "Reforzar el ítem con más detalles del flujo y agregar 2-3 Q&A demo.";
  }

  return {
    text: lines.join("\n"),
    confidence,
    usedKnowledge: matches,
    gapDetected: gap,
    recommendation: rec,
  };
}

/**
 * Genera Q&A demo a partir de un ítem (sin LLM). Lógica simple:
 * usa el título y los tags para construir preguntas plausibles.
 */
export function generateQAFromItem(item: KnowledgeItem, count: number): { question: string; expectedAnswer: string }[] {
  const out: { question: string; expectedAnswer: string }[] = [];
  const baseAnswer = item.summary || item.content.slice(0, 280);
  const tagsList = item.tags.slice(0, 3).join(", ");

  const templates = [
    {
      q: `¿Cómo resuelvo "${item.title.replace(/^[A-Z]+\s*·\s*/, "")}"?`,
      a: baseAnswer,
    },
    {
      q: `Estoy con un problema de ${item.module} relacionado a ${item.process}. ¿Qué reviso primero?`,
      a: `Para casos de ${item.module} en ${item.process}: ${baseAnswer}`,
    },
    {
      q: `¿Cuáles son los pasos para diagnosticar este caso en ${item.module}?`,
      a: baseAnswer,
    },
    {
      q: `¿Qué transacción SAP debería usar en este caso?`,
      a: tagsList
        ? `Revisar: ${tagsList}. Luego: ${baseAnswer}`
        : baseAnswer,
    },
    {
      q: `Si el cliente reporta "${item.title.split("·").pop()?.trim() || item.title}", ¿qué le respondés?`,
      a: baseAnswer,
    },
    {
      q: `¿Cuándo se debe escalar este escenario a Nivel 2?`,
      a: `Escalar a Nivel 2 si: el incidente afecta operación crítica, supera tolerancia SLA o tras 2 reintentos del paso "${tagsList || "indicado"}" persiste el síntoma.`,
    },
    {
      q: `Dame un workaround temporal para este caso de ${item.module}.`,
      a: `Workaround posible: ${baseAnswer}. Documentar como solución temporal y abrir ticket para causa raíz.`,
    },
    {
      q: `¿Qué información mínima necesitás del cliente para diagnosticar?`,
      a: `Solicitar: número de documento (OC/OV/orden), centro/almacén, mensaje exacto, usuario afectado y hora del evento.`,
    },
    {
      q: `¿Este caso aplica para el módulo ${item.module} en todas las versiones?`,
      a: `Sí, aplica desde S/4HANA 2020. Verificar nota OSS relacionada antes de aplicar.`,
    },
    {
      q: `¿Cómo verifico que la solución fue exitosa?`,
      a: `Reproducir el caso original, validar el log y confirmar con el usuario. ${baseAnswer}`,
    },
  ];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    out.push({ question: templates[i].q, expectedAnswer: templates[i].a });
  }
  return out;
}

/** Recalcula score 0-100 de un knowledge item según completitud + estado. */
export function recomputeScore(item: KnowledgeItem): number {
  let s = 50;
  if (item.title.length >= 20) s += 5;
  if (item.summary.length >= 60) s += 6;
  if (item.content.length >= 200) s += 10;
  if (item.content.length >= 600) s += 6;
  if (item.tags.length >= 2) s += 5;
  if (item.tags.length >= 4) s += 4;
  if (item.module && item.module !== "AMS") s += 5;
  if (item.process && item.process !== "AMS Genérico") s += 3;
  if (item.validationStage === "FULLY_VALIDATED") s += 8;
  if (item.status === "PUBLISHED") s += 3;
  if (item.status === "REJECTED") s -= 30;
  return Math.max(0, Math.min(100, Math.round(s)));
}
