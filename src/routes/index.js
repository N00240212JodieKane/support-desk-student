// Aggregates one express.Router() per resource — mirrors how Laravel-familiar
// students already think of routes/web.php, just split per resource instead
// of one flat file. New resources (comments, tags, users, ...) get mounted
// here as they're introduced in later weeks.
import express from 'express';
import ticketRoutes from './ticket.routes.js';
import tagRoutes from './tag.routes.js';

const router = express.Router();

router.use('/tickets', ticketRoutes);
router.use('/tags', tagRoutes);

export default router;
