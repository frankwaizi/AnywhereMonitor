var wechat = require('anychat-enterprise'),
	  //database = require('./connector/DatabaseBridge')(config.databaseUrl),
    config = require('./Config.json');

var ns = {};

//ns.database = database;
ns.wechatAPI = new wechat.API(config.base.corpId, config.secret);
ns.config = config;

ns.fixUrl = function(url) {
    return config.rootServer + url;
};
ns.getWeChatAuthorizeUrl = function(redirect) {
    return ns.wechatAPI.getAuthorizeURL(ns.fixUrl(redirect), 1);
};

module.exports = ns;
