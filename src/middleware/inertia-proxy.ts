import type { PageObject } from '@hono/inertia';
import type { Context, MiddlewareHandler } from 'hono';
import { proxy } from 'hono/proxy';

export interface InertiaProxyOptions {
    backendUrl: string;
    customFetch?: (request: Request) => Promise<Response>;
    beforeRequest?: (c: Context, headers: Headers) => void | Promise<void>;
    beforeRender?: (c: Context, page: PageObject) => void | Promise<void>;
}

export const inertiaProxy = ({
    backendUrl,
    customFetch,
    beforeRequest,
    beforeRender,
}: InertiaProxyOptions): MiddlewareHandler => {
    return async (c) => {
        const url = new URL(c.req.url);

        const target = new URL(backendUrl);
        target.pathname = `${target.pathname.replace(/\/+$/, '')}${url.pathname}`;
        target.search = url.search;

        const headers = new Headers(c.req.raw.headers);
        headers.set('X-Forwarded-Host', url.host);
        headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));

        await beforeRequest?.(c, headers);

        const res = await proxy(target, {
            raw: new Request(c.req.raw, { headers }),
            redirect: 'manual',
            customFetch,
        }).catch(() => c.body(null, 503));

        const isInertiaResponse = res.headers.has('X-Inertia');
        const isInertiaRequest = c.req.raw.headers.has('X-Inertia');

        if (!isInertiaResponse || res.status !== 200) {
            return res;
        }

        if (isInertiaRequest) {
            return res;
        }

        const page: PageObject = await res.json();

        for (const cookie of res.headers.getSetCookie()) {
            c.header('Set-Cookie', cookie, { append: true });
        }

        await beforeRender?.(c, page);

        return c.render(page.component, page.props, { url: page.url });
    };
};
