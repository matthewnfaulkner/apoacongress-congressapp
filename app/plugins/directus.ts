import { 
    createDirectus, 
    rest, 
    readItems, 
    authentication, 
    readProviders, 
    refresh, 
    readMe, 
    login, 
    generateTwoFactorSecret, 
    enableTwoFactor,
    passwordRequest,
    passwordReset,
    createItem,
    deleteItem,
    deleteFiles,
    withToken,
    updateItem,
    updateMe,
    readField,
    readFields,
    readRelation,
    readRelationByCollection,
    uploadFiles,
} from "@directus/sdk";

export default defineNuxtPlugin(() => {

    const config = useRuntimeConfig();

    const tokenStorage = {
        get: () => import.meta.client ? JSON.parse(localStorage.getItem('directus_auth') || 'null') : null,
        set: (value: object | null) => {
            if (!import.meta.client) return;
            value
                ? localStorage.setItem('directus_auth', JSON.stringify(value))
                : localStorage.removeItem('directus_auth');
        },
    };

    // Catches sessions that go bad server-side (revoked, password changed) while the
    // local token still looks unexpired — without this, protected requests would just
    // 401 into whatever ad-hoc error handling (or lack of it) the calling page has.
    let redirectingToLogin = false;

    const handleUnauthorized = () => {
        // Sandbox has its own live per-navigation policy check in the route middleware.
        if (config.public.isSandbox || !import.meta.client || redirectingToLogin) return;

        const auth = useAuthStore();
        // Only an *unexpected* 401 — i.e. we thought the user was logged in — warrants
        // this. An anonymous readMe probe 401ing is normal and already handled by the
        // auth store staying `isAuthenticated: false`.
        if (!auth.checked || !auth.isAuthenticated) return;

        redirectingToLogin = true;
        auth.reset();

        const redirect = window.location.pathname + window.location.search;
        window.location.href = `${config.public.loginUrl}${config.public.loginUrl.includes('?') ? '&' : '?'}redirect=${encodeURIComponent(redirect)}`;
    };

    const authAwareFetch = async (input: string, init?: RequestInit) => {
        const response = await fetch(input, init);
        if (response.status === 401) handleUnauthorized();
        return response;
    };

    // Sandbox: cookie-based session (same .apoaonline.com domain, Directus manages tokens)
    // Production: json mode with localStorage (cross-domain, tokens exchanged via /api/auth/callback)
    const directus = config.public.isSandbox
        ? createDirectus(config.public.directusUrl, { globals: { fetch: authAwareFetch } })
        .with(authentication("session", { credentials: "include", autoRefresh: true }))
        .with(rest({ credentials: "include"}))

        : createDirectus(config.public.directusUrl, { globals: { fetch: authAwareFetch } })
            .with(authentication("json", { storage: tokenStorage }))
            .with(rest({ credentials: "include" }));


    const isAuthenticated = async () => {
        try {
            const me = await directus.request(readMe({
                fields: ['id', 'email', 'first_name', 'last_name', 'has_subscription', 'user_policy_agreements', 'membership_number']
            }));
            return me;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    //get extra user fields for registration
    const isAuthenticatedRegistration = async () => {
        try {
            const me = await directus.request(readMe({
                fields: [
                    'id', 
                    'email', 
                    'first_name', 
                    'last_name', 
                    'has_subscription', 
                    'user_policy_agreements', 
                    'membership_number', 
                    'voucher_codes.code',
                    'title',
                ],
                deep: {
                    'voucher_codes' : {
                        '_filter': {
                            'voucher' : {
                                'congress' : {
                                    'site' : {
                                        '_eq' : config.public.siteId
                                    }
                                }
                            }
                        }
                    }
                }
            }));
            return me;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const isAuthenticatedWithPolicy = async (policy: string) => {
        try {
            const me = await directus.request(readMe({
                fields: [
                    'id',
                    'email',
                    'first_name',
                    'last_name',
                    'has_subscription',
                    {
                        policies: [{
                            policy: ['name']
                        }]
                    },
                    {
                        role: [{
                            policies: [{
                                policy: ['name']
                            }]
                        }]
                    }
                ],
                filter: {
                    _or: [
                        {
                            policies: {
                                policy: {
                                    name: { _eq: policy }
                                }
                            }
                        },
                        {
                            role: {
                                policies: {
                                    policy: {
                                        name: { _eq: policy }
                                    }
                                }
                            }
                        }
                    ]
                }
            }));

            return me.policies ? me : false;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await directus.logout();
        } catch {
            // token may be missing or already expired — still clear local state
        }
        tokenStorage.set(null);

        try {
            // Revokes the SSO refresh token server-side and clears the HttpOnly
            // cookie it was delivered in — directus.logout() above can't reach
            // it (no credentials sent in json/production mode).
            await $fetch('/api/auth/logout', { method: 'POST' });
        } catch {
            // best-effort — proceed with client-side cleanup regardless
        }

        const auth = useAuthStore();
        auth.reset();

        navigateTo(
            config.public.logoutUrl,
            { external: true }
        );
    };


    return {
        provide: {
            directus,
            directusTokenStorage: tokenStorage,
            readItems,
            readProviders,
            refresh,
            readMe,
            isAuthenticated,
            isAuthenticatedWithPolicy,
            isAuthenticatedRegistration,
            login,
            logout,
            generateTwoFactorSecret,
            enableTwoFactor,
            passwordRequest,
            passwordReset,
            createItem,
            deleteItem,
            deleteFiles,
            withToken,
            updateItem,
            updateMe,
            readField,
            readFields,
            readRelation,
            readRelationByCollection,
            uploadFiles,

        }
    };
});