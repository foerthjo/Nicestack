const fs = require("fs");

let file = null;
let env = {};
try {
	file = '' + fs.readFileSync("env.json");
	env = JSON.parse(file);
} catch (e) {}

exports.env = env;