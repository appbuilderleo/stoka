let app;
try {
  app = (await import('../server/index.js')).default;
} catch (error) {
  app = (req, res) => {
    res.status(500).json({ error: 'Top-level crash', details: error.message, stack: error.stack });
  };
}
export default app;
