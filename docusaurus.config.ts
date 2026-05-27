import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Graphily',
  tagline: 'WebAssembly-Native GraphQL from MySQL',
  favicon: 'img/favicon.ico', 

  url: 'https://rabelmervin.github.io',
  baseUrl: '/portfolio-website/',

  organizationName: 'rabelmervin',
  projectName: 'portfolio-website',

  onBrokenLinks: 'warn', 
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/rabelmervin/static-graphily/tree/main/portfolio-website/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Graphily',
      logo: {
        alt: 'Graphily Logo',
        src: 'img/graphily_logo.png', 
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar', 
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/rabelmervin/static-graphily',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Overview',
              to: '/docs/overview',
            },
            {
              label: 'Getting Started',
              to: '/docs/getting-started/graphily',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/rabelmervin/static-graphily',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Graphily. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
