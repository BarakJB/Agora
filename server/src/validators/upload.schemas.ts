import { z } from 'zod';
import { paginationQuerySchema } from './common.schemas.js';

export const uploadListQuerySchema = paginationQuerySchema;

export type UploadListQuery = z.infer<typeof uploadListQuerySchema>;
