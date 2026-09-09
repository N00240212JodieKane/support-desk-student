import express from 'express';
import * as ticketController from '../controllers/ticket.controller.js';

const router = express.Router();

router.get('/', ticketController.getAllTickets);
router.post('/', ticketController.createTicket);
router.get('/:id', ticketController.getTicketById);

export default router;
