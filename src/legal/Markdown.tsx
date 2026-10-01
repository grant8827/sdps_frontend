import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * A deliberately small Markdown renderer for the legal/policy pages:
 * headings (#, ##, ###), paragraphs, bullet and numbered lists, simple
 * pipe tables, "> " callouts, **bold**, *italic* and [links](url).
 * It builds React elements — never raw HTML — so document text can't
 * inject markup. Internal links (starting with "/") use the router.
 */
export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  const key = () => blocks.length;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2]);
      blocks.push(level === 1 ? <h1 key={key()} className="legal-h1">{content}</h1>
        : level === 2 ? <h2 key={key()} className="legal-h2">{content}</h2>
        : <h3 key={key()} className="legal-h3">{content}</h3>);
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) quoted.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<div key={key()} className="legal-callout">{inline(quoted.join(' '))}</div>);
      continue;
    }

    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
        i++;
      }
      const [header, ...body] = rows;
      blocks.push(
        <div key={key()} className="table-wrap legal-table">
          <table className="data-table">
            <thead><tr>{header.map((cell, c) => <th key={c}>{inline(cell)}</th>)}</tr></thead>
            <tbody>{body.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{inline(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const pattern = ordered ? numbered : bullet;
      // A list interrupted by an indented sub-list keeps its numbering
      // (start=), and the indented sub-list itself is shown nested.
      const start = ordered ? Number(/\d+/.exec(line)![0]) : undefined;
      const nested = /^\s{2,}/.test(line);
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        let item = lines[i++].replace(pattern, '');
        // Indented continuation lines belong to the same item.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !bullet.test(lines[i]) && !numbered.test(lines[i])) item += ` ${lines[i++].trim()}`;
        items.push(item);
      }
      const children = items.map((item, n) => <li key={n}>{inline(item)}</li>);
      const className = `legal-list${nested ? ' legal-list-nested' : ''}`;
      blocks.push(ordered ? <ol key={key()} className={className} start={start}>{children}</ol> : <ul key={key()} className={className}>{children}</ul>);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) paragraph.push(lines[i++].trim());
    blocks.push(<p key={key()} className="legal-p">{inline(paragraph.join(' '))}</p>);
  }

  return <>{blocks}</>;
}

// **bold**, *italic*, [text](url)
function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const n = parts.length;
    if (match[1] !== undefined) parts.push(<strong key={n}>{match[1]}</strong>);
    else if (match[2] !== undefined) parts.push(<em key={n}>{match[2]}</em>);
    else {
      const [label, href] = [match[3], match[4]];
      parts.push(href.startsWith('/')
        ? <Link key={n} to={href}>{label}</Link>
        : <a key={n} href={/^(https?:|mailto:)/.test(href) ? href : '#'} target="_blank" rel="noopener noreferrer">{label}</a>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((part, n) => <Fragment key={n}>{part}</Fragment>);
}
