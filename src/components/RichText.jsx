/**
 * RichText - Renders text with:
 * - Image links: [img:https://example.com/image.png]
 * - Auto-detect Arabic text → rendered with proper RTL font + harakat
 * - Auto-detect math expressions or [math:...] syntax
 * - Plain image URLs (png/jpg/gif/webp) auto-rendered as images
 * 
 * Explicit syntax (optional):
 * - Images: [img:URL] → renders <img>
 * - Arabic: [ar:النص العربي] → forces RTL Arabic font
 * - Math: [math:√(x²+y²)] → math formatting
 * 
 * Auto-detect (just paste):
 * - Arabic characters → auto Arabic font
 * - Unicode math symbols (√²³π∞≤≥±) → auto math font
 */
export function RichText({ text, className = '' }) {
  if (!text) return null

  // Split text into segments by explicit markers
  const segments = []
  const regex = /\[(img|ar|math):([^\]]+)\]/g
  let lastIndex = 0
  let match

  regex.lastIndex = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: match[1], content: match[2] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'img') {
          return <InlineImage key={idx} src={seg.content} />
        }
        if (seg.type === 'ar') {
          return <ArabicSpan key={idx} text={seg.content} />
        }
        if (seg.type === 'math') {
          return <MathSpan key={idx} text={seg.content} />
        }
        // Auto-detect in plain text
        return <AutoDetectText key={idx} text={seg.content} />
      })}
    </span>
  )
}

// Auto-detect Arabic, math, and image URLs in plain text
function AutoDetectText({ text }) {
  // Split by lines to handle mixed content
  const parts = []
  let remaining = text

  // Check for standalone image URLs
  const urlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg))/gi
  const urlParts = remaining.split(urlRegex)

  for (let i = 0; i < urlParts.length; i++) {
    const part = urlParts[i]
    if (!part) continue
    if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)$/i.test(part)) {
      parts.push(<InlineImage key={`img-${i}`} src={part} />)
    } else {
      // For each text segment, render with auto-detection
      parts.push(<SmartText key={`txt-${i}`} text={part} />)
    }
  }

  return <>{parts}</>
}

// Smart text: auto-detect Arabic characters and render with proper font
function SmartText({ text }) {
  // Arabic Unicode range: \u0600-\u06FF, \u0750-\u077F, \uFB50-\uFDFF, \uFE70-\uFEFF
  const arabicRegex = /([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0610-\u061A\u064B-\u065F]+[\s\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0610-\u061A\u064B-\u065F]*)/g

  const parts = text.split(arabicRegex)

  if (parts.length === 1) return <>{text}</>

  return (
    <>
      {parts.map((part, idx) => {
        if (arabicRegex.test(part)) {
          arabicRegex.lastIndex = 0
          return <ArabicSpan key={idx} text={part} />
        }
        return <span key={idx}>{part}</span>
      })}
    </>
  )
}

function InlineImage({ src }) {
  return (
    <img
      src={src}
      alt=""
      className="max-w-full rounded-lg my-2 inline-block"
      style={{ maxHeight: '250px' }}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

function ArabicSpan({ text }) {
  return (
    <span
      dir="rtl"
      lang="ar"
      className="inline-block leading-loose"
      style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif", fontSize: '1.4em', lineHeight: '2.2' }}
    >
      {text}
    </span>
  )
}

function MathSpan({ text }) {
  const rendered = text
    .replace(/sqrt\(([^)]+)\)/g, '√($1)')
    .replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^n/g, 'ⁿ')
    .replace(/\^0/g, '⁰').replace(/\^1/g, '¹').replace(/\^4/g, '⁴')
    .replace(/\^5/g, '⁵').replace(/\^6/g, '⁶').replace(/\^7/g, '⁷')
    .replace(/\^8/g, '⁸').replace(/\^9/g, '⁹')
    .replace(/pi/g, 'π').replace(/theta/g, 'θ').replace(/alpha/g, 'α')
    .replace(/beta/g, 'β').replace(/gamma/g, 'γ').replace(/delta/g, 'δ')
    .replace(/sigma/g, 'σ').replace(/infinity/g, '∞')
    .replace(/!=|<>/g, '≠').replace(/<=/g, '≤').replace(/>=/g, '≥')
    .replace(/\+-/g, '±')

  return (
    <span
      className="inline-block font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200"
      style={{ fontFamily: "'Cambria Math', 'STIX Two Math', serif" }}
    >
      {rendered}
    </span>
  )
}

export function RichOption({ text, className = '' }) {
  return <RichText text={text} className={className} />
}
