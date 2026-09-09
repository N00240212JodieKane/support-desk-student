import express from 'express';
import * as ticketController from '../controllers/ticket.controller.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import {
  createTicketSchema,
  updateTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
} from '../validators/ticket.validators.js';
import commentRoutes from './comment.routes.js';

const router = express.Router();

// Applies to every route below, including the nested comment routes
// mounted at the bottom of this file — Express runs middleware in
// registration order, so `req.user` is already set by the time any of them
// run.
router.use(authenticate);

router.get('/', validate({ query: listTicketsQuerySchema }), ticketController.getAllTickets);
router.post(
  '/',
  authorize('customer'),
  validate({ body: createTicketSchema }),
  ticketController.createTicket,
);

router.get(
  '/:id',
  validate({ params: ticketIdParamSchema }),
  ticketController.getTicketById,
);
router.patch(
  '/:id',
  authorize('agent', 'admin'),
  validate({ params: ticketIdParamSchema, body: updateTicketSchema }),
  ticketController.updateTicket,
);
router.delete(
  '/:id',
  authorize('agent', 'admin'),
  validate({ params: ticketIdParamSchema }),
  ticketController.deleteTicket,
);

// Nested resource: every /tickets/:ticketId/comments... request is handed
// off to comment.routes.js, which reads :ticketId via mergeParams.
router.use('/:ticketId/comments', commentRoutes);

export default router;
