import express from 'express';
import * as ticketController from '../controllers/ticket.controller.js';
import validate from '../middleware/validate.js';
import {
  createTicketSchema,
  updateTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
} from '../validators/ticket.validators.js';
import commentRoutes from './comment.routes.js';

const router = express.Router();

router.get('/', validate({ query: listTicketsQuerySchema }), ticketController.getAllTickets);
router.post('/', validate({ body: createTicketSchema }), ticketController.createTicket);

router.get(
  '/:id',
  validate({ params: ticketIdParamSchema }),
  ticketController.getTicketById,
);
router.patch(
  '/:id',
  validate({ params: ticketIdParamSchema, body: updateTicketSchema }),
  ticketController.updateTicket,
);
router.delete(
  '/:id',
  validate({ params: ticketIdParamSchema }),
  ticketController.deleteTicket,
);

// Nested resource: every /tickets/:ticketId/comments... request is handed
// off to comment.routes.js, which reads :ticketId via mergeParams.
router.use('/:ticketId/comments', commentRoutes);

export default router;
