import * as userService from '../services/user.service.js';
import { verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import asyncHandler from '../middleware/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { sendResource } from '../utils/response.js';

export const register = asyncHandler(async (req, res) => {
  const user = await userService.createCustomer(req.body);
  const token = signToken({ sub: user.id, role: user.role });

  sendResource(res, { user, token }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.findUserByEmail(email);

  // Same 401, same message, whether the email doesn't exist at all or the
  // password is wrong for the email that does — see the login topic for
  // why that's deliberate, not an oversight.
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken({ sub: user.id, role: user.role });
  const { password: _password, ...publicUser } = user;

  sendResource(res, { user: publicUser, token });
});
