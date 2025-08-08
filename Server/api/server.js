const app = require("./index");
module.exports = (req, res) => {
  app(req, res); // Let Express handle it
};
