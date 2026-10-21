const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`CCA 2 Demo App listening on port ${PORT}`);
});
