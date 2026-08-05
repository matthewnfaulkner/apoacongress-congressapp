import { $fetch } from 'ofetch';
import type { Schema } from '#shared/types/schema';
import {
	aggregate,
	createDirectus,
	readItem,
	readItems,
	rest,
	readSingleton,
	createItem,
	updateItem,
	readContentVersions,
	// staticToken,
	uploadFiles,
	readMe,
	withToken,
	withSearch,
	type QueryFilter,
	readUser,
} from '@directus/sdk';

const {
	public: { directusUrl },
	// directusServerToken,
} = useRuntimeConfig();

// By default, we use the Public permissions to fetch content (even on the server side). If you want to restrict public access it's recommended to use the staticToken option.
const directusServer = createDirectus<Schema>(directusUrl as string, {
	globals: {
		fetch: $fetch,
	},
}).with(rest());
// .with(staticToken(directusServerToken as string));

export {
	directusServer,
	readItem,
	readItems,
	readMe,
	readSingleton,
	createItem,
	updateItem,
	withToken,
	withSearch,
	aggregate,
	uploadFiles,
	readUser,
	readContentVersions
};
export type { QueryFilter };
