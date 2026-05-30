import type { PageObject, RootView } from '@hono/inertia';
import { serializePage } from '@hono/inertia';
import type { Context, MiddlewareHandler } from 'hono';
import { proxy } from 'hono/proxy';

const skippedHeaders = ['content-length', 'etag', 'last-modified', 'x-inertia'];

export interface InertiaProxyOptions {
    backendUrl: string;
    version?: string | null;
    rootView?: RootView;
    customFetch?: (request: Request) => Promise<Response>;
    beforeRequest?: (c: Context, headers: Headers) => void | Promise<void>;
}

const defaultRootView: RootView = (page) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script data-page="app" type="application/json">${serializePage(page)}</script>
    <div id="app"></div>
  </body>
</html>`;

export const inertiaProxy = ({
    backendUrl,
    version = null,
    rootView = defaultRootView,
    customFetch,
    beforeRequest,
}: InertiaProxyOptions): MiddlewareHandler => {
    return async (c) => {
        const isInertiaRequest = Boolean(c.req.header('X-Inertia'));

        if (
            isInertiaRequest &&
            c.req.method === 'GET' &&
            (c.req.header('X-Inertia-Version') ?? '') !== (version ?? '')
        ) {
            c.header('X-Inertia-Location', c.req.url);
            c.header('X-Inertia-Version', version ?? '');

            return c.body(null, 409);
        }

        const url = new URL(c.req.url);

        const target = new URL(backendUrl);
        target.pathname = `${target.pathname.replace(/\/+$/, '')}${url.pathname}`;
        target.search = url.search;

        const headers = new Headers(
            [...c.req.raw.headers].filter(
                ([name]) => !/^x[-_.](forwarded|kagero)[-_.]/.test(name),
            ),
        );
        headers.set('X-Kagero-Host', url.host);
        headers.set('X-Kagero-Proto', url.protocol.slice(0, -1));

        await beforeRequest?.(c, headers);

        const res = await proxy(target, {
            raw: new Request(c.req.raw, { headers }),
            method: c.req.method === 'HEAD' ? 'GET' : c.req.method,
            redirect: 'manual',
            customFetch,
        }).catch(() => c.body(null, 503));

        const isInertiaResponse = res.headers.has('X-Inertia');

        if (isInertiaRequest || !isInertiaResponse || !res.body) {
            return res;
        }

        const page: PageObject = await res.json();

        for (const name of skippedHeaders) {
            res.headers.delete(name);
        }

        return c.html(await rootView({ ...page, version }, c), res);
    };
};
