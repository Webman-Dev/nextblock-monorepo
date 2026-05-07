import { toJSONSchema, z } from 'zod';

z.config({ jitless: true });

export { toJSONSchema, z };
