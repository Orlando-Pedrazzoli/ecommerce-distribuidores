module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // Classes montadas dinamicamente (ex.: `bg-${item.color}-50` em pages/admin.js)
  // não são detetadas pelo JIT; o safelist garante que existem no CSS final.
  safelist: [
    {
      pattern:
        /^(bg|border|text)-(blue|green|purple|yellow|orange|gray|indigo|red)-(50|100|200|800)$/,
      variants: ['hover'],
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
