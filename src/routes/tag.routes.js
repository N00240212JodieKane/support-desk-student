import express from 'express';
import * as tagController from '../controllers/tag.controller.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { createTagSchema, updateTagSchema, tagIdParamSchema } from '../validators/tag.validators.js';

const router = express.Router();

router.use(authenticate);

// Reading the tag list is open to any authenticated role; only staff can
// change what tags exist at all.
router.get('/', tagController.getAllTags);
router.post(
  '/',
  authorize('agent', 'admin'),
  validate({ body: createTagSchema }),
  tagController.createTag,
);

router.get('/:id', validate({ params: tagIdParamSchema }), tagController.getTagById);
router.patch(
  '/:id',
  authorize('agent', 'admin'),
  validate({ params: tagIdParamSchema, body: updateTagSchema }),
  tagController.updateTag,
);
router.delete(
  '/:id',
  authorize('agent', 'admin'),
  validate({ params: tagIdParamSchema }),
  tagController.deleteTag,
);

export default router;
