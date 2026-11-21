// Fast, dependency-free implementation of csv-reader 1.0.0's documented dialect.
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1, recordLine = 1, width = -1, columns = null;
  const rows = [], errors = [];
  let recordRow = null;
  const err = code => errors.push({ code, line: recordLine, row: recordRow });

  function unquoted(start) {
    let value = '', added = 0;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) { value += text.slice(start, pos); pos++; return { value, ended: 0, added: added + pos - 1 - start }; }
      if (c === 10) { value += text.slice(start, pos); pos++; line++; return { value, ended: 1, added: added + pos - 1 - start }; }
      if (c === 13) {
        value += text.slice(start, pos); added += pos - start;
        if (text.charCodeAt(pos + 1) === 10) { pos += 2; line++; return { value, ended: 1, added }; }
        err('stray_cr'); pos++; start = pos; continue;
      }
      pos++;
    }
    value += text.slice(start, n);
    return { value, ended: 2, added: added + n - start };
  }

  function quoted() {
    const open = pos, startLine = line;
    let cursor = ++pos, pieces = null, closed = false;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 34) {
        if (text.charCodeAt(pos + 1) === 34) {
          if (!pieces) pieces = [];
          pieces.push(text.slice(cursor, pos), '"'); pos += 2; cursor = pos; continue;
        }
        if (pieces) pieces.push(text.slice(cursor, pos));
        pos++; closed = true; break;
      }
      if (c === 13) {
        if (!pieces) pieces = [];
        pieces.push(text.slice(cursor, pos), '\n'); pos += text.charCodeAt(pos + 1) === 10 ? 2 : 1;
        line++; cursor = pos; continue;
      }
      if (c === 10) line++;
      pos++;
    }
    if (!closed) {
      pos = open + 1; line = startLine; err('unterminated_quote');
      return unquoted(open);
    }
    let value = pieces ? pieces.join('') : text.slice(open + 1, pos - 1);
    if (pos >= n) return { value, ended: 2 };
    let c = text.charCodeAt(pos);
    if (c === 44) { pos++; return { value, ended: 0 }; }
    if (c === 10) { pos++; line++; return { value, ended: 1 }; }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; return { value, ended: 1 }; }
    const junk = unquoted(pos);
    value += junk.value;
    if (junk.added > 0) err('quote_junk');
    junk.value = value;
    return junk;
  }

  while (true) {
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos++; line++; }
      else if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line++; }
      else break;
    }
    if (pos >= n) break;
    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let f, wasQuoted;
    do {
      wasQuoted = text.charCodeAt(pos) === 34;
      if (wasQuoted) f = quoted();
      else f = unquoted(pos);
      fields.push(f.value);
    } while (f.ended === 0);
    if (fields.length === 1 && fields[0] === '' && !wasQuoted) continue;
    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; continue; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      const extra = fields.splice(width);
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
