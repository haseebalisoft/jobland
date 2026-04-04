function tokenizeForDiff(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function computeInlineWordDiff(beforeText, afterText) {
  const beforeTokens = tokenizeForDiff(beforeText);
  const afterTokens = tokenizeForDiff(afterText);
  const n = beforeTokens.length;
  const m = afterTokens.length;
  if (n === 0 && m === 0) return [];
  if (n === 0) return afterTokens.map((t) => ({ type: 'added', token: t }));
  if (m === 0) return beforeTokens.map((t) => ({ type: 'removed', token: t }));
  const cellCount = (n + 1) * (m + 1);
  if (cellCount > 120000) {
    return [
      ...beforeTokens.map((t) => ({ type: 'removed', token: t })),
      ...afterTokens.map((t) => ({ type: 'added', token: t })),
    ];
  }
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      dp[i][j] =
        beforeTokens[i - 1] === afterTokens[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const itemsReversed = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (beforeTokens[i - 1] === afterTokens[j - 1]) {
      itemsReversed.push({ type: 'equal', token: beforeTokens[i - 1] });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      itemsReversed.push({ type: 'removed', token: beforeTokens[i - 1] });
      i -= 1;
    } else {
      itemsReversed.push({ type: 'added', token: afterTokens[j - 1] });
      j -= 1;
    }
  }
  while (i > 0) {
    itemsReversed.push({ type: 'removed', token: beforeTokens[i - 1] });
    i -= 1;
  }
  while (j > 0) {
    itemsReversed.push({ type: 'added', token: afterTokens[j - 1] });
    j -= 1;
  }
  return itemsReversed.reverse();
}

export function InlineDiffText({ before, after, style = {} }) {
  const items = computeInlineWordDiff(before, after);
  const baseStyle = {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.6,
    ...style,
  };
  const tokenStyle = (type) => {
    if (type === 'equal') return { background: 'transparent', color: '#0f172a' };
    if (type === 'removed') return { background: '#fee2e2', color: '#b91c1c', textDecoration: 'line-through' };
    if (type === 'added') return { background: '#dcfce7', color: '#14532d', textDecoration: 'none' };
    return {};
  };
  return (
    <span style={baseStyle}>
      {items.map((it, idx) => (
        <span key={`${idx}-${it.type}`} style={tokenStyle(it.type)}>
          {it.token}
          {idx < items.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
