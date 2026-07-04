import type { ReactNode } from "react";

// r.jina.ai returns real markdown, and showing that raw (with visible #, **,
// [text](url), ![alt](url), and table syntax) would look unfinished, not
// deliberately designed. A full markdown library (react-markdown +
// remark/rehype) is real bundle weight this app doesn't need — this covers
// the actual subset jina's output uses (headings, bold/italic, links,
// images, tables, lists, paragraphs) with zero new dependencies.

const INLINE_PATTERN = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${i++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${i++}`}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {match[3]}
        </a>
      );
    }
    lastIndex = INLINE_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const HEADING_SIZE_CLASS: Record<number, string> = {
  1: "text-xl font-bold",
  2: "text-lg font-bold",
  3: "text-base font-semibold",
};

const IMAGE_PATTERN = /!\[(.*?)\]\((.+?)\)/g;

// A line can hold one or more images back-to-back with nothing else on it
// (observed live: jina sometimes emits "![Image 1: ...](url)![Image 2:
// ...](url)" concatenated with no separator) — extracting all of them only
// when the line is composed entirely of image syntax keeps a normal
// paragraph that merely *mentions* an inline image from being misdetected.
function extractImageOnlyLine(line: string): { alt: string; url: string }[] | null {
  const images: { alt: string; url: string }[] = [];
  let match: RegExpExecArray | null;
  IMAGE_PATTERN.lastIndex = 0;
  while ((match = IMAGE_PATTERN.exec(line))) {
    images.push({ alt: match[1], url: match[2] });
  }
  if (images.length === 0) return null;
  const stripped = line.replace(IMAGE_PATTERN, "").trim();
  return stripped === "" ? images : null;
}

function isTableSeparatorRow(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    const items = listItems;
    blocks.push(
      <ul key={`ul-${key++}`} className="mb-3 list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${key}-${i}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList();
      continue;
    }

    const images = extractImageOnlyLine(line);
    if (images) {
      flushList();
      for (const img of images) {
        blocks.push(
          <img
            key={`img-${key++}`}
            src={img.url}
            alt={img.alt}
            loading="lazy"
            className="my-3 max-w-full rounded-md"
          />
        );
      }
      continue;
    }

    // A "| a | b |" row followed by a "| --- | --- |" separator is a
    // table header — jina's output puts a blank line between every row
    // (observed live), so body rows are gathered by skipping blanks
    // rather than requiring them on strictly consecutive lines — including
    // between the header row and the separator row itself (observed live).
    let separatorIdx = line.startsWith("|") ? i + 1 : -1;
    while (separatorIdx !== -1 && separatorIdx < lines.length && !lines[separatorIdx].trim()) separatorIdx++;

    if (separatorIdx !== -1 && separatorIdx < lines.length && isTableSeparatorRow(lines[separatorIdx])) {
      flushList();
      const headerCells = splitTableRow(line);
      const bodyRows: string[][] = [];
      let j = separatorIdx + 1;
      while (j < lines.length) {
        const candidate = lines[j].trim();
        if (!candidate) {
          j++;
          continue;
        }
        if (!candidate.startsWith("|")) break;
        bodyRows.push(splitTableRow(candidate));
        j++;
      }
      const tableKey = key++;
      blocks.push(
        <div key={`table-wrap-${tableKey}`} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className="border border-border bg-surface-2 px-3 py-2 text-left font-semibold text-text-primary"
                  >
                    {renderInline(cell, `th-${tableKey}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-border px-3 py-2 align-top">
                      {renderInline(cell, `td-${tableKey}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j - 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const sizeClass = HEADING_SIZE_CLASS[level];
      const headingKey = key++;
      const heading =
        level === 1 ? (
          <h2 key={headingKey} className={`${sizeClass} mt-4 mb-2 text-text-primary`}>
            {renderInline(content, `h-${headingKey}`)}
          </h2>
        ) : level === 2 ? (
          <h3 key={headingKey} className={`${sizeClass} mt-4 mb-2 text-text-primary`}>
            {renderInline(content, `h-${headingKey}`)}
          </h3>
        ) : (
          <h4 key={headingKey} className={`${sizeClass} mt-4 mb-2 text-text-primary`}>
            {renderInline(content, `h-${headingKey}`)}
          </h4>
        );
      blocks.push(heading);
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.*)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${key++}`} className="mb-3 leading-relaxed">
        {renderInline(line, `p-${key}`)}
      </p>
    );
  }
  flushList();

  return <div className="font-sans text-sm text-text-primary">{blocks}</div>;
}
