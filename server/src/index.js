if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not defined. Set it in your .env file before starting the server.');
  process.exit(1);
}

const { default: app } = await import('./app.js');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
