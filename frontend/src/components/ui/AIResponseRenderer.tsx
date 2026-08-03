import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIResponseRendererProps {
  content: string;
  className?: string;
}

export const AIResponseRenderer: React.FC<AIResponseRendererProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:text-main prose-headings:font-bold prose-p:text-main prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-main prose-strong:font-bold prose-ul:text-main prose-ol:text-main prose-li:marker:text-primary ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || ""}
      </ReactMarkdown>
    </div>
  );
};
