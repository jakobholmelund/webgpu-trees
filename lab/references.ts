// The reference photographs, read from REFERENCE.md's table: that file is where they are kept (it is the
// one people read and edit), and the gallery shows its links beside each species. The repository holds
// links only, never the photographs: a thumbnail is loaded by the reader's browser from Wikimedia Commons.

export interface Photo {
  title: string;
  /** Its page on Wikimedia Commons (or wherever the table points). */
  url: string;
  /** Who took it and its licence, as the table has them. */
  credit: string;
  /** A small copy of it from Commons, for the browser to load, or null if the page is not a Commons file. */
  thumb: string | null;
}

export interface Reference {
  /** The species' name, as the lab's species have it (the table's first column, before the parentheses). */
  name: string;
  /** What the table says in parentheses after it (its botanical name, or what stands in for a generic row). */
  about: string;
  whole: Photo[];
  foliage: Photo[];
}

/** A small copy of a Commons file, at about `width` pixels across: Commons makes it from the file's page address. */
export function commonsThumb(url: string, width = 240): string | null {
  const m = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:(.+)$/.exec(url);
  return m ? `https://commons.wikimedia.org/wiki/Special:FilePath/${m[1]}?width=${width}` : null;
}

/** The links in one cell of the table: `[title](url), credit; [title](url), credit`. (An address may hold parentheses.) */
function photos(cell: string): Photo[] {
  const out: Photo[] = [];
  const link = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)([^;]*)/g;
  for (const m of cell.matchAll(link)) {
    out.push({ title: m[1], url: m[2], credit: m[3].replace(/^\s*,\s*/, "").trim(), thumb: commonsThumb(m[2]) });
  }
  return out;
}

/** The rows of REFERENCE.md's table (its text): species, whole tree, foliage. */
export function readReferences(markdown: string): Reference[] {
  const out: Reference[] = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|") || /^\|\s*(Species|-)/.test(line)) continue;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/\s\|(?=\s|$)/).map((c) => c.trim());
    if (cells.length < 3) continue;
    const m = /^([^(]+?)\s*(?:\((.*)\))?$/.exec(cells[0]);
    if (!m) continue;
    out.push({ name: m[1].trim(), about: (m[2] ?? "").replace(/\*/g, ""), whole: photos(cells[1]), foliage: photos(cells[2] ?? "") });
  }
  return out;
}
