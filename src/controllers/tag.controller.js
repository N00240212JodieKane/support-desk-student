import * as tagService from '../services/tag.service.js';
import asyncHandler from '../middleware/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendResource, sendCollection } from '../utils/response.js';

export const getAllTags = asyncHandler(async (req, res) => {
  const tags = await tagService.getAllTags();
  sendCollection(res, tags);
});

export const getTagById = asyncHandler(async (req, res) => {
  const tag = await tagService.getTagById(req.params.id);

  if (!tag) {
    throw new ApiError(404, `Tag ${req.params.id} not found`);
  }

  sendResource(res, tag);
});

export const createTag = asyncHandler(async (req, res) => {
  const tag = await tagService.createTag(req.body);
  sendResource(res, tag, 201);
});

export const updateTag = asyncHandler(async (req, res) => {
  const existing = await tagService.getTagById(req.params.id);

  if (!existing) {
    throw new ApiError(404, `Tag ${req.params.id} not found`);
  }

  const tag = await tagService.updateTag(req.params.id, req.body);
  sendResource(res, tag);
});

export const deleteTag = asyncHandler(async (req, res) => {
  const existing = await tagService.getTagById(req.params.id);

  if (!existing) {
    throw new ApiError(404, `Tag ${req.params.id} not found`);
  }

  await tagService.deleteTag(req.params.id);
  res.status(204).end();
});
