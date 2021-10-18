var express = require("express");
var rewardRouter = require("./reward");

var app = express();

app.use("/reward/", rewardRouter);

module.exports = app;