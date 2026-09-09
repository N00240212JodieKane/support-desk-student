// A single shared PrismaClient for the whole app. Node's ESM loader already
// caches a module the first time it's imported, so importing this file from
// multiple services doesn't create multiple clients/connection pools — the
// same "import = singleton" idiom used throughout this project instead of a
// DI container (see CLAUDE.md).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
