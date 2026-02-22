"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

function preprocessLatex(text: string): string {
  let result = text;
  // Convert \[ ... \] to $$ ... $$ (display math)
  result = result.replace(/\\\[/g, "\n$$\n").replace(/\\\]/g, "\n$$\n");
  // Convert \( ... \) to $ ... $ (inline math)
  result = result.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
  return result;
}

interface MarkdownMathProps {
  content: string;
  className?: string;
}

export default function MarkdownMath({ content, className = "" }: MarkdownMathProps) {
  const processed = preprocessLatex(content);

  return (
    <div className={`markdown-math prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-5 mb-2 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1 text-foreground">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed text-gray-800">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-800 leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          code: ({ children, className: codeClassName }) => {
            const isBlock = codeClassName?.includes("language-");
            if (isBlock) {
              return (
                <code className="block bg-gray-100 rounded-lg p-3 text-sm font-mono overflow-x-auto my-2">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-gray-100 text-primary px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 italic text-gray-600 my-3">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-border rounded-lg text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-gray-50 px-3 py-2 text-left font-semibold border-b border-border">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border">{children}</td>
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
