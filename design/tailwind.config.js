/** Tokens da direção "Caderno físico" — CRM de amigos (aprovada em 16/10/2026) */
import plugin from 'tailwindcss/plugin';
const L = 32; // ritmo vertical: único token (px)
const linha = (n) => `${(n * L) / 16}rem`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        primaria: { 50:'#F8ECE6', 100:'#F1D6CC', DEFAULT:'#B04A32', 600:'#B04A32', 700:'#963D29', 800:'#7C3221' },
        neutro: { 50:'#FBF6EE', 100:'#F4ECDF', 200:'#E8DCC8', 300:'#D6C7AF', 400:'#B3A38C', 500:'#7A6B59', 600:'#6B5E50', 700:'#4F443A', 800:'#3A312B', 900:'#2B2420' },
        folha:'#FBF6EE', papel:'#E8DCC8', tinta:'#2B2420',
        caneta:'#1F3A6B', 'marca-texto':{ DEFAULT:'#F6D98A', 50:'#FBEDC4' }, pauta:'#C9D6E3', margem:'#D9837A', mesa:'#7A5A3E', 'aba-verde':'#B9CBB0',
        sucesso:{ 50:'#EAF0E5', DEFAULT:'#5E7A55', 700:'#4A6343' },
        aviso:{ 50:'#F7EBD3', DEFAULT:'#8A5A12' },
        erro:{ 50:'#F6E3DF', DEFAULT:'#9B3B36' },
        foco:'#2F6185',
      },
      fontFamily: {
        titulo:['Fraunces','Georgia','serif'], ui:['Inter','system-ui','sans-serif'],
        mao:['Caveat','cursive'], // só notas, carimbos e rótulos de aba
      },
      // Todo line-height de página = 1 linha (32px). Tamanhos mudam, a linha não.
      fontSize: {
        xs:['0.75rem',linha(1)], sm:['0.875rem',linha(1)], base:['1rem',linha(1)], lg:['1.1875rem',linha(1)],
        xl:['1.375rem',linha(1)], '2xl':['1.75rem',linha(1)], '3xl':['1.875rem',linha(1)],
        nota:['1.375rem',linha(1)], carimbo:['21px','1'], aba:['20px','1'],
      },
      lineHeight: { linha: linha(1) },
      // Espaço vertical em linhas: mt-l1, pt-l2, h-l3, gap-y-l1…
      spacing: { l1:linha(1), l2:linha(2), l3:linha(3), l4:linha(4), l5:linha(5), l6:linha(6) },
      borderRadius: { sm:'6px', md:'10px' },
      boxShadow: {
        pagina:'0 18px 32px rgba(0,0,0,.35)', papel:'2px 4px 8px rgba(43,36,32,.2)',
        foco:'0 0 0 2px #FBF6EE, 0 0 0 4px #2F6185',
      },
      transitionDuration: { rapida:'120ms', media:'200ms', lenta:'280ms' },
      transitionTimingFunction: { saida:'cubic-bezier(.2,.8,.2,1)', entrada:'cubic-bezier(.4,0,1,1)' },
      screens: { livro:'1280px' }, // duas páginas abertas só a partir daqui
    },
  },
  plugins: [
    plugin(({ addComponents, theme }) => {
      const c = theme('colors');
      const anel = (corA, corB) => `repeating-linear-gradient(${corA},transparent 0 11px,#8a8a8a 11px 13px,#e2e2e2 13px 17px,#8a8a8a 17px 21px,transparent 21px ${L}px)`;
      addComponents({
        '.paper-lined': {
          backgroundColor: c.folha, lineHeight: `${L}px`, backgroundAttachment: 'local', backgroundPosition: '0 -5px',
          backgroundImage: `repeating-linear-gradient(to bottom,transparent 0 ${L - 1}px,${c.pauta} ${L - 1}px ${L}px)`,
        },
        '.margin-line': { position: 'relative', '--margem-x': '48px' },
        '.margin-line::after': { content: '""', position: 'absolute', top: 0, bottom: 0, left: 'var(--margem-x)', width: '2px', background: c.margem, pointerEvents: 'none', zIndex: 1 },
        '.spiral-v': { width: '28px', background: anel('to bottom'), filter: 'drop-shadow(0 2px 1px rgba(0,0,0,.35))' },
        '.spiral-h': { height: '24px', background: anel('to right'), filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,.35))' },
        '.nota': { fontFamily: 'Caveat,cursive', fontWeight: 500, fontSize: '22px', lineHeight: `${L}px`, color: c.caneta },
        '.marca': { background: `linear-gradient(transparent 55%,${c['marca-texto'].DEFAULT} 55%)` },
        '.carimbo': { display: 'inline-flex', alignItems: 'center', gap: '4px', height: '28px', padding: '0 10px', border: `2px solid ${c.primaria[600]}`, borderRadius: '6px', color: c.primaria[600], fontFamily: 'Caveat,cursive', fontWeight: 700, fontSize: '21px', lineHeight: 1, transform: 'rotate(-2deg)', verticalAlign: 'middle',
          '&:hover': { background: c.primaria[50], color: c.primaria[700], borderColor: c.primaria[700] },
          '&:active': { background: c.primaria[100], color: c.primaria[800] }, '&:disabled': { opacity: .45, cursor: 'not-allowed' } },
        '.aba': { fontFamily: 'Caveat,cursive', fontWeight: 700, fontSize: '20px', color: c.tinta, boxShadow: '3px 2px 4px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          '&[aria-current],&.router-link-exact-active': { background: `${c.primaria[600]} !important`, color: '#fff' } },
        '.papel': { background: c.papel, border: `2px solid ${c.tinta}`, borderRadius: '10px', boxShadow: '2px 4px 8px rgba(43,36,32,.2)' },
        '.campo': { height: '48px', padding: '0 16px', width: '100%', background: c.folha, border: `1.5px solid ${c.tinta}`, borderRadius: '6px', fontSize: '16px', lineHeight: '24px',
          '&::placeholder': { color: c.neutro[500] }, '&:focus': { outline: 'none', boxShadow: '0 0 0 2px #FBF6EE, 0 0 0 4px #2F6185' }, '&[aria-invalid="true"]': { borderColor: c.erro.DEFAULT } },
        '.postit': { position: 'absolute', top: `${L + 4}px`, right: '16px', width: '96px', padding: '8px', background: c['marca-texto'].DEFAULT, fontFamily: 'Caveat,cursive', fontSize: '18px', lineHeight: '22px', transform: 'rotate(3deg)', boxShadow: '2px 4px 8px rgba(43,36,32,.2)', pointerEvents: 'none' },
        '.polaroid': { position: 'absolute', top: `${L + 8}px`, right: '24px', width: '96px', padding: '6px 6px 22px', background: '#fff', transform: 'rotate(4deg)', boxShadow: '2px 4px 8px rgba(43,36,32,.2)', pointerEvents: 'none' },
        '.reserva-canto': { paddingRight: '112px' },
      });
    }),
  ],
};
