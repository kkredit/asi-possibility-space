/**
 * Greedily wrap a label into at most `maxLines` lines of ~`maxChars` each, for SVG
 * <text> that has no native wrapping. With `ellipsis`, an overflowing final line ends
 * in "…"; without it, overflow is simply dropped.
 */
export function wrapLabel(text: string, maxChars: number, maxLines: number, ellipsis = false): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxChars) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  else if (current && ellipsis) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/.$/, '')}…`;
  return lines;
}

/** Signed value with a true minus sign: "+0.12" / "−0.30". One formatter for every
 *  EV/delta readout, so panels don't disagree between "-" and "−". */
export function fmtSigned(v: number, digits = 2): string {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;
}
