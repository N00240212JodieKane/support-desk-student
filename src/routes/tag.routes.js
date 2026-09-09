import express from 'express';
import * as tagController from '../controllers/tag.controller.js';
import validate from '../middleware/validate.js';
import { createTagSchema, updateTagSchema, tagIdParamSchema } from '../validators/tag.validators.js';

const router = express.Router();

router.get('/', tagController.getAllTags);
router.post('/', validate({ body: createTagSchema }), tagController.createTag);

router.get('/:id', validate({ params: tagIdParamSchema }), tagController.getTagById);
router.patch(
  '/:id',
  validate({ params: tagIdParamSchema, body: updateTagSchema }),
  tagController.updateTag,
);
router.delete('/:id', validate({ params: tagIdParamSchema }), tagController.deleteTag);

export default router;
