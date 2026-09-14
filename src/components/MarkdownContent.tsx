// ═══════════════════════════════════════════════════════════════════
// CouponPilot — Clean Markdown Content Renderer
// Renders Headings, Unordered/Ordered Lists, Bold Text, Links, and Paragraphs
// ═══════════════════════════════════════════════════════════════════

import React from "react";

function renderFormattedInlineText(text: string): React.ReactNode[] {
  // Regex to capture **bold** or [text](url)
  const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      const isExternal = url.startsWith("http://") || url.startsWith("https://");
      return (
        <a
          key={index}
          href={url}
          className="text-ink underline hover:text-muted font-medium transition-colors"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {label}
        </a>
      );
    }
    return part;
  });
}

export function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
  if (!content) return null;

  // Split into raw section blocks by 2+ newlines
  const rawBlocks = content.split(/\n{2,}/);
  const elements: React.ReactNode[] = [];

  rawBlocks.forEach((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Check for Headings
    if (/^#\s+/.test(trimmed)) {
      elements.push(
        <h1 key={`h1-${blockIdx}`} className="font-display font-bold text-display-md text-ink pt-4 border-b border-rule pb-2">
          {renderFormattedInlineText(trimmed.replace(/^#\s+/, ""))}
        </h1>
      );
      return;
    }
    if (/^##\s+/.test(trimmed)) {
      elements.push(
        <h2 key={`h2-${blockIdx}`} className="font-display font-bold text-[20px] text-ink pt-4 border-b border-rule/60 pb-2 mt-2">
          {renderFormattedInlineText(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
      return;
    }
    if (/^###\s+/.test(trimmed)) {
      elements.push(
        <h3 key={`h3-${blockIdx}`} className="font-display font-bold text-[17px] text-ink pt-3">
          {renderFormattedInlineText(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      return;
    }
    if (/^####\s+/.test(trimmed)) {
      elements.push(
        <h4 key={`h4-${blockIdx}`} className="font-display font-semibold text-[15px] text-ink pt-2">
          {renderFormattedInlineText(trimmed.replace(/^####\s+/, ""))}
        </h4>
      );
      return;
    }

    // Process mixed lines inside a block (paragraphs + list items)
    const lines = trimmed.split("\n");
    let currentParagraphLines: string[] = [];
    let currentListType: "unordered" | "ordered" | null = null;
    let currentListItems: string[] = [];

    const flushParagraph = (key: string) => {
      if (currentParagraphLines.length > 0) {
        elements.push(
          <p key={key} className="whitespace-pre-wrap leading-relaxed text-body-md text-ink/90">
            {renderFormattedInlineText(currentParagraphLines.join("\n"))}
          </p>
        );
        currentParagraphLines = [];
      }
    };

    const flushList = (key: string) => {
      if (currentListItems.length > 0 && currentListType) {
        if (currentListType === "unordered") {
          elements.push(
            <ul key={key} className="list-disc list-inside space-y-2 my-2 text-body-md text-ink/90 pl-1">
              {currentListItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {renderFormattedInlineText(item)}
                </li>
              ))}
            </ul>
          );
        } else {
          elements.push(
            <ol key={key} className="list-decimal list-inside space-y-2 my-2 text-body-md text-ink/90 pl-1">
              {currentListItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {renderFormattedInlineText(item)}
                </li>
              ))}
            </ol>
          );
        }
        currentListItems = [];
        currentListType = null;
      }
    };

    lines.forEach((line, lIdx) => {
      const lineTrimmed = line.trim();
      const isUnorderedItem = /^\s*[-*]\s+/.test(lineTrimmed);
      const isOrderedItem = /^\s*\d+\.\s+/.test(lineTrimmed);

      if (isUnorderedItem) {
        if (currentListType && currentListType !== "unordered") {
          flushList(`list-${blockIdx}-${lIdx}-prev`);
        }
        flushParagraph(`p-${blockIdx}-${lIdx}-prev`);
        currentListType = "unordered";
        currentListItems.push(lineTrimmed.replace(/^\s*[-*]\s+/, ""));
      } else if (isOrderedItem) {
        if (currentListType && currentListType !== "ordered") {
          flushList(`list-${blockIdx}-${lIdx}-prev`);
        }
        flushParagraph(`p-${blockIdx}-${lIdx}-prev`);
        currentListType = "ordered";
        currentListItems.push(lineTrimmed.replace(/^\s*\d+\.\s+/, ""));
      } else {
        if (currentListType) {
          flushList(`list-${blockIdx}-${lIdx}-prev`);
        }
        if (lineTrimmed !== "") {
          currentParagraphLines.push(line);
        }
      }
    });

    flushParagraph(`p-${blockIdx}-final`);
    flushList(`list-${blockIdx}-final`);
  });

  return <div className={`space-y-4 ${className}`}>{elements}</div>;
}
