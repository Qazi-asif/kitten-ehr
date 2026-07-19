import('./server.js').catch(err => {
  console.error('Error booting application:', err);
  process.exit(1);
});
