export const BREAKPOINTS = Object.freeze({ phone: 760, compact: 900, wide: 1000 });
const aliases = { 760: 'phone', 900: 'compact', 980: 'wide', 1000: 'wide' };
const overlays = /(?:visual|backdrop|feature-over|catalog-art|hero-over|v96-release-cover)/;
const accentButtons =
  /(?:primary|logo-mark|status-badge|favorite-badge|score-badge|catalog-score|new-ep|episode-pill|at-h3-ep-pill|at114-mark|\bnext\b)/;

function adaptiveColor(hex, property, selector) {
  const raw = hex.slice(1);
  const digits = raw.length <= 4 ? [...raw].map((x) => x + x).join('') : raw;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
  const alpha = digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  let token;
  if (property === 'color' || property === 'fill' || property === 'stroke') {
    if (accentButtons.test(selector) || overlays.test(selector)) return hex;
    if (luminance < 0.3) return hex;
    token =
      spread < 45
        ? '--text'
        : r > g * 1.2 && r > b * 1.1
          ? '--red'
          : g > r * 1.15
            ? '--green'
            : b > r * 1.08 || (r > g * 1.12 && b > g * 1.12)
              ? '--purple'
              : r > b * 1.25
                ? '--yellow'
                : '--cyan';
  } else if (property.startsWith('border') || property === 'outline') token = '--border';
  else if (property.includes('background')) {
    if (accentButtons.test(selector) || overlays.test(selector)) return hex;
    if (luminance > 0.48) return hex;
    token = luminance < 0.07 ? '--bg' : luminance < 0.14 ? '--surface' : '--surface2';
  } else if (property.includes('shadow') && spread < 30) {
    return `light-dark(color-mix(in srgb,var(--shadow-ink) ${Math.round(alpha * 0.35 * 100)}%,transparent),${hex})`;
  } else return hex;
  const light =
    alpha < 0.99 && !['color', 'fill', 'stroke'].includes(property)
      ? `color-mix(in srgb,var(${token}) ${Math.round(alpha * 100)}%,transparent)`
      : `var(${token})`;
  return `light-dark(${light},${hex})`;
}

/** Preserve the dark cascade while compiling legacy literals against semantic light tokens. */
export function designSystemCSS() {
  return {
    postcssPlugin: 'animetrack-design-system',
    Once(root) {
      root.walkAtRules('media', (rule) => {
        rule.params = rule.params.replace(
          /((?:max|min)-width:\s*)(760|900|980|1000)px/g,
          (_, prefix, width) => prefix + BREAKPOINTS[aliases[width]] + 'px',
        );
      });
      root.walkRules((rule) => {
        if (rule.selector.includes(':root') || rule.selector.includes('[data-theme')) return;
        const seen = new Set();
        for (const declaration of [...rule.nodes].reverse()) {
          if (declaration.type !== 'decl') continue;
          const signature = `${declaration.prop}:${declaration.value}:${declaration.important}`;
          if (seen.has(signature)) {
            declaration.remove();
            continue;
          }
          seen.add(signature);
          if (declaration.prop.includes('backdrop-filter'))
            declaration.value = declaration.value.replace(
              /blur\((\d+)px\)/g,
              (_, amount) => `blur(${Math.min(8, Number(amount))}px)`,
            );
          if (
            declaration.prop === 'z-index' &&
            /^\d+$/.test(declaration.value) &&
            Number(declaration.value) >= 800
          ) {
            const selector = rule.selector;
            const layer = /toast|skip-link|storage/.test(selector)
              ? 'toast'
              : /account|auth/.test(selector)
                ? 'auth'
                : /confirm/.test(selector)
                  ? 'confirm'
                  : /episode-detail/.test(selector)
                    ? 'episode'
                    : /pwa-update/.test(selector)
                      ? 'update'
                      : /nav|topbar/.test(selector)
                        ? 'navigation'
                        : 'modal';
            declaration.value = `var(--layer-${layer})`;
          }
          if (!declaration.value.includes('light-dark('))
            declaration.value = declaration.value.replace(
              /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)|#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b/gi,
              (original, r, g, b, a) => {
                const hex = original.startsWith('#')
                  ? original
                  : '#' +
                    [r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('') +
                    (a === undefined
                      ? ''
                      : Math.round(Number(a) * 255)
                          .toString(16)
                          .padStart(2, '0'));
                const adapted = adaptiveColor(hex, declaration.prop, rule.selector);
                return adapted === hex ? original : adapted;
              },
            );
          const radii = {
            '8px': '--radius-sm',
            '12px': '--radius-md',
            '19px': '--radius',
            '24px': '--radius-lg',
          };
          const sizes = {
            '13px': '--font-xs',
            '14px': '--font-sm',
            '16px': '--font-base',
            '20px': '--font-lg',
            '24px': '--font-xl',
          };
          if (declaration.prop === 'border-radius' && radii[declaration.value])
            declaration.value = `var(${radii[declaration.value]})`;
          if (declaration.prop === 'font-size' && sizes[declaration.value])
            declaration.value = `var(${sizes[declaration.value]})`;
          if (
            declaration.prop === 'color' &&
            declaration.value === 'white' &&
            !accentButtons.test(rule.selector) &&
            !overlays.test(rule.selector)
          )
            declaration.value = 'light-dark(var(--text),white)';
        }
      });
    },
  };
}
