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
        readPolicy,
        readPolicies,
        readRoles,
        readField,
        readFields,
        readRelation,
        readRelationByCollection,
        uploadFiles
    } from "@directus/sdk";

const directus = createDirectus("http://localhost:8055").with(authentication("session", { credentials: "include", autoRefresh: true })).with(rest({ credentials: "include"}));

const isAuthenticated = async () => {
    try {
        const me = await directus.request(readMe(
            {
                fields: ['id', 'email', 'first_name', 'last_name']
            }
        ));
        return me as DirectusUser;
    } catch (error) {
        console.error(error)
        return false;
    }
};

const isAuthenticatedWithPolicy = async (policy : string) => {
    try {
        const me = await directus.request<DirectusUser>(readMe(
            {
                fields: [
                    'id', 
                    'email', 
                    'first_name', 
                    'last_name', 
                    {
                        'policies': [
                            {
                                'policy' :[
                                    'name'
                                ]
                            }
                        ]
                    },
                {
                    'role' : [
                        {
                            'policies': [
                                {
                                    'policy' :[
                                        'name'
                                    ]
                                }
                            ]
                        }
                    ]
                    }],
                filter: {
                    _or:[
                        {
                            policies: {
                                policy: {
                                        name: {
                                            _eq: policy
                                        }
                                }
                            }
                        },
                        {
                            role: {
                                policies: {
                                    policy: {
                                            name: {
                                                _eq: policy
                                            }
                                    }
                                }
                            }
                        },
                    ]
                }

            }
        ));

        return me.policies ? me : me;
    } catch (error) {
        console.error(error)
        return error;
    }
}

const logout = async () => {
    await directus.logout()
    const auth = useAuthStore()
    auth.reset()
    navigateTo('http://192.168.1.87:8080/auth/saml2/idp/slo.php?redirect=http://localhost:3000/login', { external: true})
}

export default defineNuxtPlugin(() => {
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
            readField,
            readFields,
            readRelation,
            readRelationByCollection,
            uploadFiles
        },
    };
});
