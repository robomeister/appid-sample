function getRandomID(min, max) 
{
   return ""+Math.floor(Math.random() * (max - min) + min);
}

function displayMessage(message,messageType,hide,delay)
{
   //info, danger, warning
   messageType = typeof messageType !== 'undefined' ? messageType : "warning";
   hide = typeof hide !== 'undefined' ? hide : true;
   delay = typeof delay !== 'undefined' ? delay : 2000;

   var id=getRandomID(100000,999999);
   var classType='class="alert alert-' + messageType + ' alert-dismissable fade in"';
   var anchor='<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'
   $("#MessageBox").append('<div id="' +id + '" '+ classType + '>'+anchor+ '<STRONG>' + message+'</STRONG></div>');

   if (hide)
      $("#"+id).fadeTo(delay, 500).slideUp(500, function(){$("#"+id).slideUp(500); $("#"+id).remove()});
}


$(document).ready(function() 
{
   if (window.location.pathname != "/secure")
   {
      $("#loginButton").html("Login");
      displayMessage("Please login.","info",true,10000);
   }
   else
      $("#loginButton").html("Logout");


   $("#loginButton").on('click', function(event) 
   {
      if (this.innerHTML=="Login")
         window.location.pathname = "/secure";
      else
         $.get("/logout", function(data) 
         {
             //if using the AppID cloud directory only use this
             window.location.pathname = "/";
             // if using a SAML provider, use this
             //window.location.pathname = "/logout.html";
         });
   });   

   if (window.location.pathname != "/secure")
      return;

   $.get("/secure/info", function(data)
   {
      console.log(data);
      $("#InfoBox").append(data);
   });
});