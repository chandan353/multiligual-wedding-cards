import type { BorderId, MotifId, TextureId } from "@/lib/types";

/* All artwork here is original vector art drawn for this project. */

function petals(n: number, r: number, len: number, w: number, cx = 60, cy = 60) {
  return Array.from({ length: n }, (_, i) => {
    const a = (360 / n) * i;
    return <ellipse key={i} cx={cx} cy={cy - r - len / 2} rx={w} ry={len / 2} transform={`rotate(${a} ${cx} ${cy})`} />;
  });
}

export function Motif({ id, size = 120, className }: { id: MotifId; size?: number; className?: string }) {
  if (id === "none") return null;
  const common = { width: size, height: size, viewBox: "0 0 120 120", className, "aria-hidden": true, focusable: false } as const;
  switch (id) {
    case "mandala":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.2">
          <circle cx="60" cy="60" r="8" />
          <circle cx="60" cy="60" r="18" strokeDasharray="2 3" />
          <g>{petals(12, 18, 22, 5)}</g>
          <circle cx="60" cy="60" r="44" />
          <g>{petals(24, 44, 10, 3)}</g>
        </svg>
      );
    case "lotus":
      return (
        <svg {...common} fill="currentColor" fillOpacity="0.85">
          <path d="M60 30c10 14 10 34 0 50-10-16-10-36 0-50z" />
          <path d="M60 80c-6-18-20-30-36-32 4 18 18 30 36 32z" opacity=".8" />
          <path d="M60 80c6-18 20-30 36-32-4 18-18 30-36 32z" opacity=".8" />
          <path d="M60 80c-14-8-30-10-44-4 12 10 30 10 44 4z" opacity=".55" />
          <path d="M60 80c14-8 30-10 44-4-12 10-30 10-44 4z" opacity=".55" />
          <rect x="30" y="86" width="60" height="2" rx="1" opacity=".6" />
        </svg>
      );
    case "marigold":
      return (
        <svg {...common} width={size * 2} viewBox="0 0 240 120" fill="currentColor">
          <path d="M10 20 Q120 90 230 20" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
          {Array.from({ length: 11 }, (_, i) => {
            const t = i / 10;
            const x = 10 + 220 * t;
            const y = 20 + 140 * t * (1 - t) * 0.9 * 2;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle r="7" opacity=".9" />
                <circle r="4" fill="#fff" opacity=".25" />
                {i % 2 === 0 && <ellipse cy="14" rx="2" ry="6" opacity=".6" />}
              </g>
            );
          })}
        </svg>
      );
    case "florals":
      return (
        <svg {...common} fill="currentColor">
          <g opacity=".85">{petals(6, 2, 18, 7, 60, 52)}</g>
          <circle cx="60" cy="52" r="6" fill="#fff" opacity=".5" />
          <path d="M60 70 C 50 90, 30 96, 18 92" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6" />
          <path d="M60 70 C 70 90, 90 96, 102 92" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6" />
          <ellipse cx="34" cy="90" rx="9" ry="4" transform="rotate(-20 34 90)" opacity=".5" />
          <ellipse cx="86" cy="90" rx="9" ry="4" transform="rotate(20 86 90)" opacity=".5" />
        </svg>
      );
    case "leaves":
      return (
        <svg {...common} width={size * 2} viewBox="0 0 240 120" fill="currentColor">
          <path d="M20 70 Q120 40 220 70" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".6" />
          {Array.from({ length: 9 }, (_, i) => {
            const x = 32 + i * 22;
            const y = 62 - Math.sin((i / 8) * Math.PI) * 14;
            return (
              <g key={i} opacity={0.5 + (i % 3) * 0.15}>
                <ellipse cx={x} cy={y - 10} rx="7" ry="11" transform={`rotate(-25 ${x} ${y - 10})`} />
                <ellipse cx={x + 6} cy={y + 9} rx="6" ry="9" transform={`rotate(30 ${x + 6} ${y + 9})`} />
              </g>
            );
          })}
        </svg>
      );
    case "deco":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.2">
          {Array.from({ length: 9 }, (_, i) => {
            const a = -80 + i * 20;
            return <line key={i} x1="60" y1="96" x2={60 + 70 * Math.sin((a * Math.PI) / 180)} y2={96 - 70 * Math.cos((a * Math.PI) / 180)} />;
          })}
          <path d="M10 96 A50 50 0 0 1 110 96" />
          <path d="M30 96 A30 30 0 0 1 90 96" />
          <line x1="4" y1="100" x2="116" y2="100" />
        </svg>
      );
    case "crest":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M60 14 L94 28 V60 C94 82 78 98 60 106 C42 98 26 82 26 60 V28 Z" />
          <path d="M60 22 L86 33 V60 C86 77 74 90 60 97 C46 90 34 77 34 60 V33 Z" strokeDasharray="2 3" />
          <path d="M20 70 C6 60 8 40 18 30 M100 70 C114 60 112 40 102 30" />
          <path d="M42 8 L50 14 L60 6 L70 14 L78 8 L74 20 H46 Z" fill="currentColor" fillOpacity=".6" />
        </svg>
      );
    case "sunflower":
      return (
        <svg {...common} fill="currentColor">
          <g opacity=".9">{petals(16, 14, 20, 5)}</g>
          <circle cx="60" cy="60" r="15" fill="#5b3a1a" opacity=".85" />
          <circle cx="60" cy="60" r="9" fill="#3b2410" opacity=".6" />
        </svg>
      );
    default:
      return null;
  }
}

function Corner({ id }: { id: BorderId }) {
  switch (id) {
    case "floral":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="currentColor" aria-hidden>
          <path d="M4 96 C4 50 30 20 96 4" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".6" />
          <g opacity=".75">
            <circle cx="14" cy="14" r="7" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="14" cy="4" rx="4" ry="6" transform={`rotate(${a} 14 14)`} opacity=".7" />
            ))}
          </g>
          <ellipse cx="30" cy="52" rx="8" ry="3.5" transform="rotate(-50 30 52)" opacity=".5" />
          <ellipse cx="52" cy="28" rx="8" ry="3.5" transform="rotate(-30 52 28)" opacity=".5" />
        </svg>
      );
    case "mandala":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
          <path d="M0 0 H100 M0 0 V100" strokeWidth="2" opacity=".5" />
          <path d="M0 40 A40 40 0 0 0 40 0" />
          <path d="M0 26 A26 26 0 0 0 26 0" strokeDasharray="2 3" />
          {Array.from({ length: 7 }, (_, i) => {
            const a = (i / 6) * 90;
            const r = (a * Math.PI) / 180;
            return <ellipse key={i} cx={52 * Math.sin(r)} cy={52 * Math.cos(r)} rx="4" ry="9" transform={`rotate(${-a} ${52 * Math.sin(r)} ${52 * Math.cos(r)})`} />;
          })}
        </svg>
      );
    case "deco":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
          <path d="M6 100 V6 H100" />
          <path d="M14 100 V14 H100" opacity=".6" />
          <path d="M6 30 L30 6 M6 50 L50 6" opacity=".6" />
          <rect x="18" y="18" width="10" height="10" transform="rotate(45 23 23)" fill="currentColor" />
        </svg>
      );
    case "filigree":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
          <path d="M8 100 C8 40 40 8 100 8" />
          <path d="M8 60 C20 60 26 50 22 40 C18 30 8 34 12 42" />
          <path d="M60 8 C60 20 50 26 40 22 C30 18 34 8 42 12" />
          <path d="M16 16 C30 16 34 30 26 34 C18 38 14 26 22 24" />
          <circle cx="8" cy="8" r="4" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

export function Border({ id }: { id: BorderId }) {
  if (id === "none") return null;
  if (id === "thin" || id === "double") return <div className={`wc-frame wc-frame-${id}`} aria-hidden />;
  return (
    <div className="wc-corners" aria-hidden>
      {["tl", "tr", "bl", "br"].map((pos) => (
        <div key={pos} className={`wc-corner wc-corner-${pos}`}>
          <Corner id={id} />
        </div>
      ))}
    </div>
  );
}

const enc = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** CSS background for a texture, tinted with the card's accent colour. */
export function textureBackground(id: TextureId, accent: string): string {
  const c = accent;
  switch (id) {
    case "paper":
      return enc(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 .07 0'/></filter><rect width='200' height='200' filter='url(#n)'/></svg>`);
    case "grain":
      return enc(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 .06 0'/></filter><rect width='160' height='160' filter='url(#n)'/></svg>`);
    case "linen":
      return enc(`<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M0 0h8M0 4h8' stroke='${c}' stroke-opacity='.06'/><path d='M0 0v8M4 0v8' stroke='${c}' stroke-opacity='.05'/></svg>`);
    case "dots":
      return enc(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><circle cx='4' cy='4' r='1.6' fill='${c}' fill-opacity='.18'/><circle cx='18' cy='18' r='1.6' fill='${c}' fill-opacity='.18'/></svg>`);
    case "damask":
      return enc(`<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='none' stroke='${c}' stroke-opacity='.12'><path d='M40 8c10 10 10 22 0 32-10-10-10-22 0-32zM40 40c10 10 10 22 0 32-10-10-10-22 0-32zM8 40c10-10 22-10 32 0-10 10-22 10-32 0zM40 40c10-10 22-10 32 0-10 10-22 10-32 0z'/><circle cx='40' cy='40' r='3' fill='${c}' fill-opacity='.12'/></svg>`);
    case "watercolor":
      return `radial-gradient(60% 40% at 10% 0%, ${c}22, transparent 70%), radial-gradient(50% 40% at 100% 30%, ${c}1a, transparent 70%), radial-gradient(60% 50% at 30% 100%, ${c}1f, transparent 70%)`;
    default:
      return "none";
  }
}
