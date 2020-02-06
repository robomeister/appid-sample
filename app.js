const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const app = express();
const cookieParser = require("cookie-parser")
const path = require('path');
const request = require('request');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
router.use(express.static(process.cwd() + '/public'));
app.use(router) 

var app_id_service = null;

if (process.env.APPID_SECRETS)
   app_id_service = JSON.parse(process.env.APPID_SECRETS);
else
   console.log("ERROR:  Cannot find AppID service secrets!");


app.get("/secure", function(req, res) 
{
   res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/secure/info", function(req, res) 
{
   //retrieve the authorization header applied by the AppID service
   //authorization header in the form 'Bearer <access token> <id token>'
   var tokens = req.header("authorization").split(" ");

   // token[0] = 'Bearer'
   // token[1] = access token
   // token[2] = identity token
   // usually only need the access token
   var authorization = tokens[0] + " " + tokens[1];
   var headers = { 'Authorization' : authorization, 'accept':'application/json' };
   console.log(authorization);

   //prepare call to AppID service
   var options = { url: app_id_service.oauthServerUrl +'/userinfo', headers: headers };

   //call the AppID service to retrieve user information
   request(options, function(error,response,body)
   {
      if (error)
      {
         console.log(error);
         res.send(error);
         return;
      }

      var returnData = {};
      returnData.authToken = tokens[1];
      returnData.identity = JSON.parse(body);
      console.log(returnData);
      res.send(JSON.stringify(returnData));
	});
});

//Kill the appid cookies, this will allow the client-side javascript to logout from the SAML provider properly
app.get('/logout', function(req,res)
{
   Object.keys(req.cookies).forEach(function(key) 
   {
      if (key.startsWith("appid"))
      {
         console.log(key);
         res.clearCookie(key,{ path: '/'});
      }
   });

   res.sendStatus(200);
});

app.listen(3000, function(){
  console.log("Listening on port 3000");
});
