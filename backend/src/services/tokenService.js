import { add } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import config from '../config/env.js';

export function generateRefreshToken () {
  return uuidv4();
}

export function getRefreshTokenExpiryDate () {
  const expiresIn = config.refreshTokenExpiresIn;
  if (expiresIn.endsWith('d')) {
    const days = parseInt(expiresIn.slice(0, -1), 10);
    return add(new Date(), { days });
  }
  if (expiresIn.endsWith('h')) {
    const hours = parseInt(expiresIn.slice(0, -1), 10);
    return add(new Date(), { hours });
  }
  return add(new Date(), { days: 7 });
}

