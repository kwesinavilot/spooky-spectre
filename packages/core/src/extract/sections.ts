import type { Section } from '../schema';
import { anchorFor, textQuote } from '../dom/anchors';
import type { Block } from './blocks';

const NUMBERED = /^\s*(?:section\s+|§\s*|article\s+|clause\s+)?(\d+(?:\.\d+)*)[.)]?(?=\s|$)/i;

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/g, '') || 'section'
  );
}

/**
 * Deterministic section ids (FR-EXT-05): heading numbering when present
 * ("4.2 Renewal" -> "s-4-2"), otherwise a slug plus its occurrence among
 * headings with the same slug. Repeated ids get -2, -3 suffixes.
 */
export function makeIdAllocator() {
  const slugCounts = new Map<string, number>();
  const used = new Set<string>();
  return (heading: string): string => {
    const m = NUMBERED.exec(heading);
    let id: string;
    if (m) {
      id = `s-${m[1]!.replace(/\./g, '-')}`;
    } else {
      const slug = slugify(heading);
      const n = (slugCounts.get(slug) ?? 0) + 1;
      slugCounts.set(slug, n);
      id = `s-${slug}-${n}`;
    }
    let unique = id;
    for (let i = 2; used.has(unique); i++) unique = `${id}-${i}`;
    used.add(unique);
    return unique;
  };
}

export interface Joined {
  text: string;
  starts: number[];
}

/** Joins blocks with a single newline and records where each block starts. */
export function joinBlocks(blocks: Block[]): Joined {
  const starts: number[] = [];
  let text = '';
  blocks.forEach((b, i) => {
    if (i > 0) text += '\n';
    starts.push(text.length);
    text += b.text;
  });
  return { text, starts };
}

/**
 * Splits the text into flat, non-overlapping sections at every heading
 * (FR-EXT-04). Text before the first heading becomes "s-intro". Each section
 * ends where the next one starts, minus the separating newline.
 */
export function buildSections(blocks: Block[], joined: Joined): Section[] {
  const { text, starts } = joined;
  const nextId = makeIdAllocator();
  const sections: Section[] = [];
  const headingIdx = blocks.map((b, i) => (b.level > 0 ? i : -1)).filter((i) => i >= 0);

  if (blocks.length === 0) return sections;

  const firstHeading = headingIdx[0] ?? blocks.length;
  if (firstHeading > 0) {
    const end = firstHeading < blocks.length ? starts[firstHeading]! - 1 : text.length;
    sections.push({
      id: 's-intro',
      heading: '',
      level: 1,
      startOffset: 0,
      endOffset: end,
      anchor: anchorFor(blocks[0]!.el, textQuote(text, 0, end)),
    });
  }

  headingIdx.forEach((bi, k) => {
    const block = blocks[bi]!;
    const start = starts[bi]!;
    const nextBi = headingIdx[k + 1];
    const end = nextBi !== undefined ? starts[nextBi]! - 1 : text.length;
    sections.push({
      id: nextId(block.text),
      heading: block.text,
      level: block.level,
      startOffset: start,
      endOffset: end,
      anchor: anchorFor(block.el, textQuote(text, start, end)),
    });
  });
  return sections;
}
