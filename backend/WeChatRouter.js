var router = require("express").Router({}),
    wechat = require('anychat-enterprise'),
    go = require('./GlobalObject'),
    cacheService = require('./CacheService.js'),
    devopsalerts = require('./data/devopsalerts.json'),
    cialerts = require('./data/cialerts.json');


//图文消息
router.post('/news/send', function(req, res) {
    var date = new Date();
    console.log(date + "Welcome!News message received!");

    try{
      if(req.body.title && req.body.title.indexOf('Not classified') === -1){
        var title = "";
        var text = "";
        var touser = "";
        var toparty = "";
        var agentid = "";

        var type = "";

        if(req.body.title){
            title = req.body.title;
        }
        if(req.body.text){
            text = req.body.text;
        }
        if(req.body.touser){
            touser = req.body.touser;
        }
        if(req.body.toparty){
            toparty = req.body.toparty;
        }
        if(req.body.agentid){
            agentid = req.body.agentid;
        }

        var msgid = "";

        if(agentid === "15"){
            type = "ci";
            msgid = type + date.getTime();

            cialerts.push({msgid: msgid, title: title, msg: text});

            fileService.cache("/data/cialerts.json",cialerts);
        }

        if(agentid === "10"){
            type = "devops";
            msgid = type + date.getTime();

            devopsalerts.push({msgid: msgid, title: title, msg: text});

            fileService.cache("/data/devopsalerts.json",devopsalerts);
        }

        var articles = [{
            "title": title,
            "description": text,
            "url": config.rootServer+"/alert.html?type="+type+"&msgid="+msgid,
            "picurl": ""
          }];

        var to = {"touser": touser, "toparty": toparty};
        var message = {
              "msgtype": "news",
              "news": {
                "articles": articles
              },
              "safe":"1"
        };
        go.wechatAPI.send(agentid, to, message, function(err){
            if(err){
                res.status(500).send("Error!"+err);
            }
            else{
                res.status(200).send("Send news message successful!");
            }
        });
      }
      else {
        res.status(500).send("No title");
      }
    }
    catch(e){
        res.status(500).send(e);
    }
});


router.get('/alert', function(req, res) {
    console.log("Query alert!");
    var type = req.query.type;
    var msgid = req.query.msgid;
    var alertobj = null;

    switch (type) {
        case "ci" :
            alertobj = cialerts;
            break;
        case "devops" :
            alertobj = devopsalerts;
            break;
    }

    var data = alertobj.filter(function(item){
      return item.msgid == msgid;
    });

    res.status(200).send(data[0]);
});

router.use('/*', wechat(go.config.base).text(function (message, req, res, next) {
}).image(function (message, req, res, next) {
}).location(function (message, req, res, next) {
}).event(function (message, req, res, next) {
}).middlewarify());

module.exports = router;