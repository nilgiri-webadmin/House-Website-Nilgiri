// Simple in-memory rate limiter, keyed by client IP.
// Counts live in this process only: they reset on restart and aren't shared across instances.
export const rateLimit = ({ windowMs, maxRequests }) => {
  const hits = new Map();

  // Drop expired windows so the map doesn't grow without bound
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits) {
      if (now - record.startTime > windowMs) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now - record.startTime > windowMs) {
      hits.set(key, { startTime: now, count: 1 });
      return next();
    }

    if (++record.count > maxRequests) {
      const retryAfter = Math.ceil((windowMs - (now - record.startTime)) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: `Too many requests, please try again after ${retryAfter} seconds` });
    }

    next();
  };
};
