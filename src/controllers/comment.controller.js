// Nested under a ticket — every one of these routes reaches this controller
// as /tickets/:ticketId/comments[/:id] (see routes/comment.routes.js), so
// every function here confirms the parent ticket exists before touching its
// comments at all: a comment list/create/etc. under a ticket that was
// deleted (or never existed) should 404 on the *ticket*, not silently return
// an empty list or a misleading error further down.
import * as commentService from '../services/comment.service.js';
import * as ticketService from '../services/ticket.service.js';
import asyncHandler from '../middleware/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendResource, sendCollection } from '../utils/response.js';

const findTicketOr404 = async (ticketId) => {
  const ticket = await ticketService.getTicketById(ticketId);

  if (!ticket) {
    throw new ApiError(404, `Ticket ${ticketId} not found`);
  }
};

const findCommentOr404 = async (ticketId, id) => {
  const comment = await commentService.getCommentById(ticketId, id);

  if (!comment) {
    throw new ApiError(404, `Comment ${id} not found on ticket ${ticketId}`);
  }

  return comment;
};

export const getAllComments = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId);

  const comments = await commentService.getCommentsByTicketId(req.params.ticketId);
  sendCollection(res, comments);
});

export const getCommentById = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId);

  const comment = await findCommentOr404(req.params.ticketId, req.params.id);
  sendResource(res, comment);
});

export const createComment = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId);

  const comment = await commentService.createComment(req.params.ticketId, req.body);
  sendResource(res, comment, 201);
});

export const updateComment = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId);
  await findCommentOr404(req.params.ticketId, req.params.id);

  const comment = await commentService.updateComment(req.params.id, req.body);
  sendResource(res, comment);
});

export const deleteComment = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId);
  await findCommentOr404(req.params.ticketId, req.params.id);

  await commentService.deleteComment(req.params.id);
  res.status(204).end();
});
