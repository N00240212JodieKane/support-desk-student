import express from 'express';
import * as commentController from '../controllers/comment.controller.js';
import validate from '../middleware/validate.js';
import {
  ticketIdParamSchema,
  commentIdParamsSchema,
  createCommentSchema,
  updateCommentSchema,
} from '../validators/comment.validators.js';

// mergeParams: true — without it, this router (mounted at
// /tickets/:ticketId/comments in ticket.routes.js) wouldn't see :ticketId on
// req.params at all; by default a nested router only sees params matched
// within its own path.
const router = express.Router({ mergeParams: true });

router.get(
  '/',
  validate({ params: ticketIdParamSchema }),
  commentController.getAllComments,
);
router.post(
  '/',
  validate({ params: ticketIdParamSchema, body: createCommentSchema }),
  commentController.createComment,
);

router.get(
  '/:id',
  validate({ params: commentIdParamsSchema }),
  commentController.getCommentById,
);
router.patch(
  '/:id',
  validate({ params: commentIdParamsSchema, body: updateCommentSchema }),
  commentController.updateComment,
);
router.delete(
  '/:id',
  validate({ params: commentIdParamsSchema }),
  commentController.deleteComment,
);

export default router;
