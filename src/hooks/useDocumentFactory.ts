"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AMS_MODULES_STORAGE,
  type GeneratedDocument, type DocumentType, type DocumentStatus, type DocumentSourceType,
} from "@/types/ams-modules";
import { TEMPLATES } from "@/lib/documents/templates";
import { documentsApi } from "@/services/ams-modules.api";

const EVT = "ams-documents-changed";
const log = {
  debug: (...a: unknown[]) => { if (process.env.NODE_ENV !== "production") console.debug("[documents]", ...a); },
};
function fireSync<T>(p: Promise<T>): void {
  p.catch((err) => log.debug("documents sync failed:", (err as Error)?.message || err));
}

function safe<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
const now = () => new Date().toISOString();

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export interface UseDocumentFactory {
  documents: GeneratedDocument[];
  generate: (input: {
    type: DocumentType;
    sourceType: DocumentSourceType;
    sourceId?: string;
    formData: Record<string, string>;
    title?: string;
    createdBy?: string;
    tags?: string[];
  }) => GeneratedDocument;
  updateDocument: (id: string, patch: Partial<GeneratedDocument>) => void;
  deleteDocument: (id: string) => void;
  exportMarkdown: (id: string) => void;
  copyToClipboard: (id: string) => Promise<boolean>;
}

export function useDocumentFactory(): UseDocumentFactory {
  // SSR-safe: initializer determinista (no leer localStorage acá → rompe hidratación).
  // El cache local se hidrata en el useEffect de abajo tras montar.
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);

  useEffect(() => {
    function reload() {
      if (typeof window === "undefined") return;
      const fresh = safe<GeneratedDocument[]>(localStorage.getItem(AMS_MODULES_STORAGE.documents)) ?? [];
      setDocuments(fresh);
    }
    reload();  // hidratar cache de localStorage tras montar (post-hidratación)
    function onStorage(e: StorageEvent) {
      if (e.key === AMS_MODULES_STORAGE.documents) reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, reload);
    };
  }, []);

  // Hidratar desde backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await documentsApi.getSnapshot();
        if (cancelled) return;
        setDocuments(snap.documents);
        if (typeof window !== "undefined") {
          localStorage.setItem(AMS_MODULES_STORAGE.documents, JSON.stringify(snap.documents));
        }
      } catch (err) {
        log.debug("backend offline:", (err as Error)?.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback((next: GeneratedDocument[]) => {
    setDocuments(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(AMS_MODULES_STORAGE.documents, JSON.stringify(next));
      emit();
    }
  }, []);

  const generate: UseDocumentFactory["generate"] = useCallback((input) => {
    const tpl = TEMPLATES[input.type];
    const content = tpl.generate(input.formData);
    const doc: GeneratedDocument = {
      id: uid("doc"),
      title: input.title?.trim() || (input.formData.title || `${input.type} · ${now().slice(0, 10)}`),
      documentType: input.type,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      content,
      status: "GENERATED",
      createdBy: input.createdBy ?? "Consultor AMS",
      createdAt: now(),
      updatedAt: now(),
      tags: input.tags ?? [],
      formData: input.formData,
    };
    save([doc, ...documents]);
    fireSync(documentsApi.upsertDocument(doc));
    return doc;
  }, [documents, save]);

  const updateDocument: UseDocumentFactory["updateDocument"] = useCallback((id, patch) => {
    const next = documents.map((d) => d.id === id ? { ...d, ...patch, updatedAt: now() } : d);
    save(next);
    const updated = next.find((d) => d.id === id);
    if (updated) fireSync(documentsApi.upsertDocument(updated));
  }, [documents, save]);

  const deleteDocument: UseDocumentFactory["deleteDocument"] = useCallback((id) => {
    save(documents.filter((d) => d.id !== id));
    fireSync(documentsApi.deleteDocument(id));
  }, [documents, save]);

  const exportMarkdown: UseDocumentFactory["exportMarkdown"] = useCallback((id) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    const blob = new Blob([doc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    updateDocument(id, { status: "EXPORTED" as DocumentStatus });
  }, [documents, updateDocument]);

  const copyToClipboard: UseDocumentFactory["copyToClipboard"] = useCallback(async (id) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return false;
    try {
      await navigator.clipboard.writeText(doc.content);
      return true;
    } catch {
      return false;
    }
  }, [documents]);

  return { documents, generate, updateDocument, deleteDocument, exportMarkdown, copyToClipboard };
}
