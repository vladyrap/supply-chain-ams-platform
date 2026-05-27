"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownView({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Anclas externas seguras
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          // Asegurar que las imágenes generadas por el modelo no exploten el layout
          // (en la respuesta del agente no se esperan, pero por si acaso)
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          img: (props) => <img {...props} style={{ maxWidth: "100%", borderRadius: 6 }} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
