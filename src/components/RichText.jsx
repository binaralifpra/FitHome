// Penampil markdown ringan untuk jawaban AI: paragraf, daftar (- / * / 1.), dan **tebal**.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part.replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$|[.,!?])/g, '$1$2')
    ),
  )
}

export default function RichText({ text }) {
  const blocks = []
  let list = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const m = line.match(/^([-*•]|\d+[.)])\s+(.*)$/)
    if (m) {
      const ordered = /\d/.test(m[1])
      if (!list || list.ordered !== ordered) {
        list = { ordered, items: [] }
        blocks.push(list)
      }
      list.items.push(m[2])
    } else {
      list = null
      if (line) blocks.push(line.replace(/^#+\s*/, ''))
    }
  }
  return (
    <div className="space-y-2.5 leading-relaxed">
      {blocks.map((b, i) =>
        typeof b === 'string' ? (
          <p key={i}>{inline(b)}</p>
        ) : b.ordered ? (
          <ol key={i} className="list-decimal space-y-1 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ol>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
