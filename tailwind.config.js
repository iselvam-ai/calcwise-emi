/* CalcWise design tokens (unchanged from the original Tailwind CDN config).
 * Build: npm run build:css  →  assets/css/site.css */
module.exports = {
  content: ['./*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        'secondary-fixed-dim': '#b4c5ff', 'on-secondary-container': '#fefcff', 'on-secondary-fixed-variant': '#003ea8',
        surface: '#faf8ff', 'on-surface': '#131b2e', 'error-container': '#ffdad6', error: '#ba1a1a',
        'on-primary': '#ffffff', 'surface-variant': '#dae2fd', 'primary-fixed-dim': '#c4c1fb',
        'on-error-container': '#93000a', 'on-error': '#ffffff', 'on-background': '#131b2e', 'on-tertiary': '#ffffff',
        'tertiary-container': '#002819', 'surface-dim': '#d2d9f4', 'primary-container': '#1e1b4b', outline: '#787680',
        'primary-fixed': '#e3dfff', 'surface-container-lowest': '#ffffff', 'secondary-container': '#316bf3',
        'tertiary-fixed': '#85f8c4', 'on-tertiary-fixed': '#002114', 'secondary-fixed': '#dbe1ff',
        'surface-container-high': '#e2e7ff', 'surface-container': '#eaedff', 'on-primary-fixed': '#181445',
        'tertiary-fixed-dim': '#68dba9', 'surface-container-low': '#f2f3ff', tertiary: '#000f07',
        'inverse-primary': '#c4c1fb', 'on-primary-container': '#8683ba', 'surface-tint': '#5b598c',
        'surface-container-highest': '#dae2fd', 'on-secondary': '#ffffff', 'on-tertiary-container': '#179c6e',
        'outline-variant': '#c8c5d0', 'surface-bright': '#faf8ff', 'on-tertiary-fixed-variant': '#005137',
        primary: '#070235', background: '#faf8ff', 'on-secondary-fixed': '#00174b', 'on-primary-fixed-variant': '#444173',
        'inverse-on-surface': '#eef0ff', 'inverse-surface': '#283044', 'on-surface-variant': '#47464f', secondary: '#0051d5'
      },
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      spacing: {
        'space-sm': '0.5rem', 'space-md': '1rem', 'gutter-mobile': '1rem', 'space-xl': '2rem', gutter: '1.5rem',
        'space-2xl': '3rem', 'margin-mobile': '1rem', margin: '2rem', 'space-xs': '0.25rem', 'space-lg': '1.5rem'
      },
      fontFamily: {
        'label-md': ['Inter', 'system-ui', 'sans-serif'], 'numeric-stat': ['Inter', 'system-ui', 'sans-serif'],
        'numeric-hero': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], 'display-lg-mobile': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'label-sm': ['Inter', 'system-ui', 'sans-serif'], 'body-lg': ['Inter', 'system-ui', 'sans-serif'],
        'headline-sm': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], 'body-sm': ['Inter', 'system-ui', 'sans-serif'],
        'headline-lg': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], 'label-lg': ['Inter', 'system-ui', 'sans-serif'],
        'headline-xl-mobile': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], 'headline-xl': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'display-lg': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], 'headline-md': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'body-md': ['Inter', 'system-ui', 'sans-serif'], 'body-xl': ['Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'numeric-stat': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'numeric-hero': ['44px', { lineHeight: '52px', letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-lg-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.025em', fontWeight: '800' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '0em', fontWeight: '400' }],
        'headline-sm': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.005em', fontWeight: '400' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'headline-xl-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-lg': ['56px', { lineHeight: '64px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '400' }],
        'body-xl': ['18px', { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '400' }]
      }
    }
  },
  plugins: []
};
