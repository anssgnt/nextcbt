/**
 * RichText - Renders text with:
 * - Image links: [img:https://example.com/image.png]
 * - Arabic text with harakat: rendered with proper RTL font
 * - Math symbols: rendered with KaTeX-like formatting
 * 
 * Syntax:
 * - Images: [img:URL] → renders <img>
 * - Arabic: [ar:النص العربي] → renders RTL with Arabic font
 * - Math: [math:√(x²+y²)] or standard Unicode math symbols
 */
export function RichText({ text, className = '' }) {
  if (!text) return null

  // Split text into segments by special markers
  const segments = []
  let remaining = text
  const regex = /\[(img|ar|math):([^\]]+)\]/g
  let match
  let lastIndex = 0

  // Reset regex
  regex.lastIndex = 0

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: match[1], content: match[2] })
    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }

  // If no special markers found, check if entire text might be an image URL
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={`whitespace-pre-wrap ${className}`}>{renderPlainText(text)}</span>
  }

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'img') {
          return (
            <img
              key={idx}
              src={seg.content}
              alt=""
              className="max-w-full rounded-lg my-2 inline-block"
              style={{ maxHeight: '200px' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )
        }
        if (seg.type === 'ar') {
          return (
            <span
              key={idx}
              dir="rtl"
              lang="ar"
              className="inline-block font-arabic text-lg leading-loose"
              style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif", fontSize: '1.3em', lineHeight: '2' }}
            >
              {seg.content}
            </span>
          )
        }
        if (seg.type === 'math') {
          return (
            <span
              key={idx}
              className="inline-block font-mono bg-gray-50 px-1.5 py-0.5 rounded text-sm border border-gray-200"
              style={{ fontFamily: "'Cambria Math', 'STIX Two Math', serif" }}
            >
              {renderMath(seg.content)}
            </span>
          )
        }
        // Plain text
        return <span key={idx}>{renderPlainText(seg.content)}</span>
      })}
    </span>
  )
}

// Render plain text — detect inline image URLs (http...png/jpg/gif/webp)
function renderPlainText(text) {
  // Check for standalone image URLs
  const urlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg))/gi
  const parts = text.split(urlRegex)

  if (parts.length === 1) return text

  return parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0
      return (
        <img
          key={idx}
          src={part}
          alt=""
          className="max-w-full rounded-lg my-2 block"
          style={{ maxHeight: '200px' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )
    }
    return part
  })
}

// Render math — convert common notation to Unicode symbols
function renderMath(expr) {
  return expr
    .replace(/sqrt\(([^)]+)\)/g, '√($1)')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^n/g, 'ⁿ')
    .replace(/\^0/g, '⁰')
    .replace(/\^1/g, '¹')
    .replace(/\^4/g, '⁴')
    .replace(/\^5/g, '⁵')
    .replace(/\^6/g, '⁶')
    .replace(/\^7/g, '⁷')
    .replace(/\^8/g, '⁸')
    .replace(/\^9/g, '⁹')
    .replace(/pi/g, 'π')
    .replace(/theta/g, 'θ')
    .replace(/alpha/g, 'α')
    .replace(/beta/g, 'β')
    .replace(/gamma/g, 'γ')
    .replace(/delta/g, 'δ')
    .replace(/sigma/g, 'σ')
    .replace(/infinity/g, '∞')
    .replace(/!=|<>/g, '≠')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/\+-/g, '±')
    .replace(/x/g, '×')
    .replace(/\//g, '÷')
}

// Option text renderer (same logic, for answer options)
export function RichOption({ text, className = '' }) {
  return <RichText text={text} className={className} />
}
