// Nested under a ticket — every one of these routes reaches this controller
// as /tickets/:ticketId/comments[/:id] (see routes/comment.routes.js), so
// every function here confirms the parent ticket exists (and, from Week 4,
// is in scope for whoever's asking) before touching its comments at all: a
// comment list/create/etc. under a ticket that's deleted, never existed, or
// simply isn't visible to this viewer should 404 on the *ticket*, not
// silently return an empty list or a misleading error further down.
import * as commentService from '../services/comment.service.js';
import * as ticketService from '../services/ticket.service.js';
import asyncHandler from '../middleware/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendResource, sendCollection } from '../utils/response.js';

const findTicketOr404 = async (ticketId, viewer) => {
  const ticket = await ticketService.getTicketById(ticketId, viewer);

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

// Unlike ticket visibility (role-scoped, previous topic), this is an
// ownership check on one specific row: seeing a comment is enough to know
// it exists, so there's nothing to hide by 404ing here the way an
// out-of-scope ticket is hidden — a 403 says plainly "this isn't yours to
// change," which admin overrides for moderation.
const assertCanModify = (comment, viewer) => {
  if (comment.authorId !== viewer.id && viewer.role !== 'admin') {
    throw new ApiError(403, 'You can only modify your own comments');
  }
};

export const getAllComments = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId, req.user);

  const comments = await commentService.getCommentsByTicketId(req.params.ticketId);
  sendCollection(res, comments);
});

export const getCommentById = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId, req.user);

  const comment = await findCommentOr404(req.params.ticketId, req.params.id);
  sendResource(res, comment);
});

export const createComment = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId, req.user);

  const comment = await commentService.createComment(req.params.ticketId, {
    ...req.body,
    authorId: req.user.id,
  });
  sendResource(res, comment, 201);
});

export const updateComment = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId, req.user);

  const comment = await findCommentOr404(req.params.ticketId, req.params.id);
  assertCanModify(comment, req.user);

  const updated = await commentService.updateComment(req.params.id, req.body);
  sendResource(res, updated);
});

export const deleteComment = asyncHandler(async (req, res) => {
  await findTicketOr404(req.params.ticketId, req.user);

  const comment = await findCommentOr404(req.params.ticketId, req.params.id);
  assertCanModify(comment, req.user);

  await commentService.deleteComment(req.params.id);
  res.status(204).end();
});
