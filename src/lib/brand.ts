/**
 * Tokens de cor do Player — espelham BRAND.md do ecossistema Vanguarda.
 * Usados como referência em código; a aplicação real é via CSS vars em globals.css.
 */
export const brand = {
  colors: {
    bgBase: '#09090b',       // zinc-950
    surface1: '#18181b',     // zinc-900
    surface2: '#27272a',     // zinc-800
    textPrimary: '#fafafa',  // zinc-50
    textMuted: '#a1a1aa',    // zinc-400
    amber: '#fcbb00',        // CTA primário
    amberDim: '#f99c00',
    blue: '#3080ff',         // links, palco
    green: '#00c758',        // Ao vivo, count ativo
    red: '#fb2c36',          // erro, hover sair
  },
} as const
