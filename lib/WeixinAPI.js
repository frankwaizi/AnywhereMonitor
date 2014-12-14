var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var requestModule = require('request');
var crypto = require('crypto');
var ezcrypto = require('ezcrypto').Crypto;
var util = require('./util');
var config = require('../config.json');
var wrapper = util.wrapper;


var AccessToken = function (accessToken, expireTime) {
  if (!(this instanceof AccessToken)) {
    return new AccessToken(accessToken, expireTime);
  }
  this.accessToken = accessToken;
  this.expireTime = expireTime;
};

/**
 * 检查AccessToken是否有效，检查规则为当前时间和过期时间进行对比
 *
 * Examples:
 * ```
 * api.isAccessTokenValid();
 * ```
 */
AccessToken.prototype.isValid = function () {
  return !!this.accessToken && (new Date().getTime()) < this.expireTime;
};

//构造函数
var API = function () {
  this.request = requestModule;
  
  this.prefix = 'https://qyapi.weixin.qq.com/cgi-bin/';  
EventEmitter.call(this);
};
inherits(API, EventEmitter);

//校验消息安全性
API.prototype.checkSignature = function (query, token) {
  query.token = token;

  var msg_signature = query.msg_signature;
  var sign = sha1(query);

  return sign === msg_signature;
};

var sha1 = function(query){
  var token = query.token;
  var timestamp = query.timestamp;
  var nonce = query.nonce;
  var encryptechostr = query.echostr;

  var arr = '';
  var shasum = crypto.createHash('sha1');
  arr = [token, timestamp, nonce, encryptechostr].sort();
  shasum.update(arr.join(''));
  return shasum.digest('hex');
}

//翻译网络字节序
var recoverNetworkBytesOrder = function(orderBytes) {
    var sourceNumber = 0;
    for (var i = 0; i < 4; i++) {
      sourceNumber <<= 8;
      sourceNumber |= orderBytes[i] & 0xff;
    }
    return sourceNumber;
  }
  
//解密消息体
API.prototype.decrypt = function(encodingaeskey, encodeingechostr, appid) {

  console.log(encodeingechostr);

  var aeskey = new Buffer(encodingaeskey+'=', 'base64');
  var iv = aeskey.slice(0, 16);
  
  //ezcrypt模块默认加密字符串为base64编码，模块内部会自动解码: aes.js 143行
  var echostr = ezcrypto.AES.decrypt(encodeingechostr, aeskey, {mode: new ezcrypto.mode.CBC(ezcrypto.pad.pkcs7), iv: iv});

  //console.log(echostr);
  var sourceNumber = echostr.substring(16,20);
  var len = recoverNetworkBytesOrder(new Buffer(sourceNumber));

  var content = echostr.substring(20, echostr.length);
  var buf = new Buffer(content,'utf8');
  var str = buf.slice(0,len).toString('utf8');//content.substring(0, len);

  //注意处理中文字符长度
  var corpID = content.substring(str.length, content.length);

  console.log(corpID);
  
  if(corpID === appid){
   return str; 
  }
  return "";
};

//
API.prototype.getAccessToken = function (callback) {
  var that = this;
  var url = this.prefix + 'gettoken?corpid=' + config.corpid + '&corpsecret=' + config.corpsecret;

  this.request({url: url, json: true}, wrapper(function (err, res, data) {
    if (err) {
      return callback(err);
    }
    // 过期时间，因网络延迟等，将实际过期时间提前10秒，以防止临界点
    var expireTime = (new Date().getTime()) + (7200 - 10) * 1000;
    that.token = AccessToken(data.access_token, expireTime);
    that.emit('token', that.token);
    callback(err, res, that.token);
  }));
  return this;
};

/**
 * 需要access token的接口调用如果采用preRequest进行封装后，就可以直接调用
 * 无需依赖getAccessToken为前置调用
 *
 * @param {Function} method 需要封装的方法
 * @param {Array} args 方法需要的参数
 */
API.prototype.preRequest = function (method, args) {
  var that = this;
  var callback = args[args.length - 1];
  if (that.token && that.token.isValid()) {
    method.apply(that, args);
  } else {
    that.getAccessToken(function (err, res, data) {
      // 如遇错误，通过回调函数传出
      if (err) {
        callback(err, res, data);
        return;
      }
      method.apply(that, args);
    });
  }
};

//获取用户基本信息
API.prototype.getUser = function (userid, callback) {
  this.preRequest(this._getUser, arguments);
};

/*!
 * 获取用户基本信息的未封装版本
 */
API.prototype._getUser = function (userid, callback) {
  var url = this.prefix + 'user/get?access_token=' + this.token.accessToken+"&userid="+userid;
  this.request({
    url: url,
    json: true
  }, wrapper(callback));
};

//文本消息
API.prototype.sendText = function (touser, toparty, agentid, text, callback) {
    if(touser.length > 0 || toparty.length > 0){
      this.preRequest(this._sendText, arguments);
    }
    else{
      console.log("Empty user and party!");
      callback("Empty user and party!",null,null);
    }
};

/*!
 * 企业号推送消息，发送文字消息的未封装版本
 */
API.prototype._sendText = function (touser, toparty, agentid, text, callback) {
 
  var url = this.prefix + 'message/send?access_token=' + this.token.accessToken;
  
  var data = {
    "touser": touser,
    "toparty": toparty,
    "totag": "",
    "msgtype": "text",
    "agentid": agentid,
    "text": {
      "content": text
    },
    "safe": "1"
  };
  
  this.request({
    url: url,
    method: 'POST',
    json: true,
    body: JSON.stringify(data)
  }, wrapper(callback));
};

//发送图文消息
API.prototype.sendNews = function (touser, toparty, agentid, articles, callback) {
    if(touser.length > 0 || toparty.length > 0){
      this.preRequest(this._sendNews, arguments);
    }
    else{
      console.log("Empty user and party!");
      callback("Empty user and party!",null,null);
    }
};

/*!
 * 企业号推送消息，发送图文消息的未封装版本
 */
API.prototype._sendNews = function (touser, toparty, agentid, articles, callback) {
  var url = this.prefix + 'message/send?access_token=' + this.token.accessToken;
  
  var data = {
    "touser": touser,
    "toparty": toparty,
    "totag": "",
    "msgtype": "news",
    "agentid": agentid,
    "news": {
      "articles": articles
    }
  };

  this.request({
    url: url,
    method: 'POST',
    json: true,
    body: JSON.stringify(data)
  }, wrapper(callback));
};


module.exports = new API();
