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
    uploadFiles
} from "@directus/sdk";

export default defineNuxtPlugin(() => {

    // ✅ NOW Nuxt context exists
    const config = useRuntimeConfig();
    
    const directus = createDirectus(config.public.directusUrl)
        .with(authentication("session", { credentials: "include", autoRefresh: true }))
        .with(rest({ credentials: "include" }));


    const isAuthenticated = async () => {
        try {
            const me = await directus.request(readMe({
                fields: ['id', 'email', 'first_name', 'last_name']
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
        await directus.logout();

        const auth = useAuthStore(); // ✅ allowed inside plugin runtime
        auth.reset();

        navigateTo(
            config.public.logoutUrl,
            { external: true }
        );
    };

    return {
        provide: {
            directus,
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
            uploadFiles
        }
    };
});