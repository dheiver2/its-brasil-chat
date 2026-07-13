"use client";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./CodeBlock";
import { SheetCard } from "./SheetCard";
import { DocCard } from "./DocCard";
import { ArtifactCard } from "./ArtifactCard";
import { Sources } from "./Sources";
import type { Source } from "./types";

function balanceCodeFences(text: string): string {
  const fences = (text.match(/```/g) || []).length;
  return fences % 2 === 1 ? text + "\n```" : text;
}

/** Remove os blocos de raciocínio <think>…</think> que alguns modelos emitem
 *  (incl. um <think> ainda não fechado, durante o streaming). */
export function stripThink(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .replace(/^\s*\n/, "");
}

function splitCitations(text: string, sources: Source[]): any[] {
  const out: any[] = [];
  const re = /\[(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= sources.length) {
      if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
      out.push({
        type: "element",
        tagName: "a",
        properties: {
          href: sources[n - 1].url,
          target: "_blank",
          rel: "noreferrer noopener",
          className: ["cite-ref"],
          title: sources[n - 1].title,
        },
        children: [{ type: "text", value: `[${n}]` }],
      });
      last = m.index + m[0].length;
    }
  }
  if (out.length === 0) return [{ type: "text", value: text }];
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

function rehypeCitations(sources?: Source[]) {
  return (tree: any) => {
    if (!sources || !sources.length) return;
    const walk = (node: any, skip: boolean) => {
      if (!node || !Array.isArray(node.children)) return;
      const next: any[] = [];
      for (const child of node.children) {
        if (child.type === "element") {
          const childSkip = skip || ["code", "pre", "a"].includes(child.tagName);
          walk(child, childSkip);
          next.push(child);
        } else if (child.type === "text" && !skip && /\[\d+\]/.test(child.value)) {
          next.push(...splitCitations(child.value, sources));
        } else {
          next.push(child);
        }
      }
      node.children = next;
    };
    walk(tree, false);
  };
}

export const MessageContent = memo(function MessageContent({ content, sources }: { content: string; sources?: Source[] }) {
  const safe = balanceCodeFences(stripThink(content));
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeCitations(sources)]}
      components={{
        pre: ({ children }) => <>{children}</>,
        code({ className, children, ...rest }) {
          const match = /language-([\w-]+)/.exec(className || "");
          const text = String(children).replace(/\n$/, "");
          if (match?.[1] === "its-sheet") return <SheetCard json={text} />;
          if (match?.[1] === "its-doc") return <DocCard json={text} />;
          // Artifacts: HTML/SVG/Mermaid/React ganham preview ao vivo (claude.ai).
          if (match && ["html", "svg", "mermaid", "jsx", "tsx", "react"].includes(match[1]))
            return <ArtifactCard code={text} lang={match[1]} />;
          if (match || text.includes("\n")) return <CodeBlock code={text} lang={match?.[1] || ""} />;
          return <code className={className} {...rest}>{children}</code>;
        },
        a: ({ href, children, className }) => {
          const ok = href && (href.startsWith("http://") || href.startsWith("https://"));
          return ok ? (
            <a href={href} className={className as string | undefined} target="_blank" rel="noreferrer noopener">{children}</a>
          ) : <span>{children}</span>;
        },
        table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
      }}
    >
      {safe}
    </ReactMarkdown>
  );
});
