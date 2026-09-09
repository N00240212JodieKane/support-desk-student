import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';

// Deliberately the one router in this project with no authenticate.js on
// it — these two routes are how a client gets a token in the first place,
// so requiring one to reach them would make it impossible to ever get one.
const router = express.Router();

router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);

export default router;
