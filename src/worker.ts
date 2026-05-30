import { Hono } from 'hono';
import { env } from 'hono/adapter';
import type { InertiaProxyOptions } from './inertia-proxy';
import { inertiaProxy } from './inertia-proxy';

export const kageroWorker = ({
    beforeRequest,
    ...options
}: Partial<InertiaProxyOptions> = {}) => {
    const app = new Hono();

    app.use((c, next) => {
        const { KAGERO_BACKEND_URL, KAGERO_API_KEY } = env<{
            KAGERO_BACKEND_URL?: string;
            KAGERO_API_KEY?: string;
        }>(c);

        return inertiaProxy({
            backendUrl: KAGERO_BACKEND_URL ?? 'http://localhost:8000',
            beforeRequest: async (c, headers) => {
                headers.set(
                    'X-Kagero-For',
                    c.req.header('CF-Connecting-IP') ?? '',
                );

                if (KAGERO_API_KEY) {
                    headers.set('X-Api-Key', KAGERO_API_KEY);
                }

                await beforeRequest?.(c, headers);
            },
            ...options,
        })(c, next);
    });

    return app;
};
