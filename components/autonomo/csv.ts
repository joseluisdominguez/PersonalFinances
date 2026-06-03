export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export const readFileAsText = async (
  file: File,
  encoding: string = 'windows-1252'
): Promise<string> => {
  const buffer = await file.arrayBuffer();
  return new TextDecoder(encoding).decode(buffer);
};

export const parseCsv = (text: string, delimiter: string = ';'): ParsedCsv => {
  const lines = splitLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(lines[0], delimiter).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '') continue;
    const values = parseLine(raw, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return { headers, rows };
};

const splitLines = (text: string): string[] => {
  // Respeta saltos de línea dentro de campos entrecomillados
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        buf += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        buf += ch;
      }
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.length > 0) out.push(buf);
  return out;
};

const parseLine = (line: string, delimiter: string): string[] => {
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  out.push(buf);
  return out;
};
