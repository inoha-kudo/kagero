import type { PageObject } from '@hono/inertia';
import { serializePage } from '@hono/inertia';
import { html } from 'hono/html';
import type { Manifest } from '../root-view';

const appTemplate = `<!DOCTYPE html>
<html {{ htmlAttrs }}>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <script>
            (function() {
                const appearance = '{{ appearance }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{ fonts }}

        {{ vite }}

        <title>{{ appName }}</title>
    </head>
    <body class="font-sans antialiased">
        {{ inertia }}
    </body>
</html>`;

export const rootView = (manifest: Manifest, template = appTemplate) => {
    return (page: PageObject) => {
        const appearance =
            page.props.appearance === 'dark' ||
            page.props.appearance === 'light'
                ? page.props.appearance
                : 'system';

        const placeholders: Record<string, string | undefined> = {
            htmlAttrs: `lang="${html`${page.props.lang ?? 'en'}`}"${appearance === 'dark' ? ' class="dark"' : ''}`,
            appearance,
            fonts: manifest.fonts,
            vite: manifest.pages?.[page.component],
            appName: `${html`${page.props.appName ?? 'Laravel'}`}`,
            inertia: `<script data-page="app" type="application/json">${serializePage(page)}</script><div id="app"></div>`,
        };

        return template.replace(
            /\{\{\s*(\w+)\s*\}\}/g,
            (_, key) => placeholders[key] ?? '',
        );
    };
};
