export const pinoRedactPaths: string[] = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.set-cookie",
  "req.headers['x-api-key']",
  "req.headers['x-forwarded-for']",
  "req.headers['x-real-ip']",
  "req.body.password",
  "req.body.token",
  "req.body.secret",
];
