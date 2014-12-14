var config = require('./config.json'),
    cache = require('./cache/cache.json'),
    express = require('express'),
    bodyParser = require('body-parser'),
    WeixinAPI = require('./lib/WeixinAPI'),
    cacheService = require('./lib/cacheService'),
    app = express();

// 解析器
app.use(bodyParser());

var checkUser = function(req,res,next){
    var username = req.body.username;
    var pwd = req.body.password;

    if(username === "frankwechat"&&pwd === "testwechat"){
        console.log("Authorized!");
        next();
    }
    else{
        res.status(401).send("Unauthorized user!");
    }
};

var allowCrossDomain = function(req, res, next) {
    console.log("get request!");
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    //res.header('Access-Control-Allow-Credentials',true);
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};

app.use(checkUser);
app.use(allowCrossDomain);

//图文消息
app.post('/weixin/news/send', function(req, res) {
    var date = new Date();
    console.log(date + "Welcome!News message received!");
    try{ 
    var title = "";
    var text = "";
    var touser = "";
    var toparty = "";
    var agentid = "";

    if(req.body.title){
        title = req.body.title;
    }
    if(req.body.text){
        text = req.body.text;
    }
    if(req.body.touser){
        touser = req.body.touser.toLowerCase();
    }
    if(req.body.toparty){
        toparty = req.body.toparty;
    }
    if(req.body.agentid){
        agentid = req.body.agentid;
    }

    var article = {
        "title": title,
        "description": text,
        "url": "",
        "picurl": ""
      };

    var articles = [];
    articles.push(article);

    cache.push(article);

    cacheService.cahce("w", "/cache/cache.json", cache);

    console.log(articles);

        WeixinAPI.sendNews(touser,toparty,agentid,articles,function(err,response,data){
        if(err){
            res.status(500).send("Error!"+err);
        }
        else{
            res.status(200).send("Send news message successful!");
        }
    });
    }
    catch(e){
        res.status(500).send(e);
    }
});

//文本
app.post('/weixin/text/send', function(req, res) {
    console.log("Welcome!Text message received!");
    //console.log(req.body);
    try{
    var text = "";
    var touser = "";
    var toparty = "";
    var agentid = "";

    if(req.body.text){
        text = req.body.text;
    }
    if(req.body.touser){
        touser = req.body.touser.toLowerCase();
    }
    if(req.body.toparty){
        toparty = req.body.toparty;
    }
    if(req.body.agentid){
        agentid = req.body.agentid;
    }

    WeixinAPI.sendText(touser,toparty,agentid, text,function(err,response,data){
        if(err){
            res.status(500).send("Error!"+err);
        }
        else{
            res.status(200).send("Send text message successful!");
        }
    });
    }
    catch(e){
        res.status(500).send(e);
    }
});


//欢迎
app.get('/', function(req, res) {
    console.log("Welcome");
    res.status(200).send("Welcome to frank's node server!");
});

//
app.get('/weixin', function(req, res) {
    console.log("checkSignature!");
    
    if (WeixinAPI.checkSignature(req.query, config.wechatToken)) {
        var echostr = WeixinAPI.decrypt(config.EncodingAESKey, req.query.echostr, config.corpid);
        console.log('echo: ' + echostr);
        res.status(200).send( echostr);
        //updateMenu();
    } else {
       res.status(200).send( 'check fail');
    }
});

console.log("connect successful!");
app.listen(18080);