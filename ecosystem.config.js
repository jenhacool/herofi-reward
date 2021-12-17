module.exports = {
  apps: [{
    "script"    : "./bin/www",
    "instances" : "max",
    "exec_mode" : "cluster",
    // "cwd":"/home/nginx/my-pwa" ,
    "env": {"NODE_ENV" : "production"},
    "name" : "herofi-reward-test"
  }]
};
