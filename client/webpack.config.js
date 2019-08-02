const path = require("path");
const rootPath = path.resolve(".");

const config = {
  mode: "development",
  devtool: false,
  context: rootPath,
  entry: {
    app: "./src/main.js"
  },
  output: {
    path: `${rootPath}/`,
    filename: "bundle.js"
  },
  devServer: {
    contentBase: `${rootPath}/`,
    watchContentBase: true,
    host: "0.0.0.0",
    port: 9000,
    inline: false
  }
};

module.exports = config;
