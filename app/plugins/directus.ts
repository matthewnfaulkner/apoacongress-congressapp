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

    // Sandbox: cookie-based session (same .apoaonline.com domain, Directus manages tokens)
    // Production: json mode with localStorage (cross-domain, tokens exchanged via /api/auth/callback)
    const directus = config.public.isSandbox
        ? createDirectus(config.public.directusUrl)
        .with(authentication("session", { credentials: "include", autoRefresh: true }))
        .with(rest({ credentials: "include"}))

        : createDirectus(config.public.directusUrl)
            .with(authentication("json", { storage: tokenStorage }))
            .with(rest({ credentials: "include" }));


    const isAuthenticated = async () => {
        try {
            const me = await directus.request(readMe({
                fields: ['id', 'email', 'first_name', 'last_name', 'user_policy_agreements']
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
``
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
            login,
            logout,
            generateTwoFactorSecret,
            enableTwoFactor,
            passwordRequest,
            passwordReset,
            createItem,
            deleteItem,
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