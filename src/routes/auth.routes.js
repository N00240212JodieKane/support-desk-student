import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';

// Deliberately the one router in this project with no authenticate.js on
// it — these two routes are how a client gets a token in the first place,
// so requiring one to reach them would make it impossible to ever get one.
// authLimiter (Week 6) matters more here than anywhere else in the API for
// exactly that reason — see middleware/rateLimiter.js.
const router = express.Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);

export default router;
