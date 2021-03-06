// Requires
var irc = require('irc'),
    http = require('https'),
    logger = require('./logger');

var ircServer = 'irc.mozilla.org',
    nick = '_AutomationBot',
    options = {channels: ['#automation', '#mozwebqa'],},
    client = new irc.Client(ircServer, nick, options),
    help = { ":help" : "This is Help! :)",
             ":gist" : "Gives you a link to Pastebin",
             ":yt" : "Pass in your search and I will give you a youtube link",
             "Bugzilla" : "Just add bug xxxxxx to a conversation and it will show a summary of the bug",
             ":source" : "Returns the GitHub URL for me",
             ":pivotal" : "Type in the name project to get it's link or leave blank to get an entire list",
             ":list" : "Either returns the URL to the Google Group or a link with your search topic",
             ":standup" : "Shows the details for the standup the team has twice a week",
             ":meeting" : "Shows details and a link to the meetings page",
             ":newissue" : "Just add :newissue project to a conversation and it will show a summary of the bug",
             ":github" : "Will show a list of Github projects for that team",
           },

    //TODO(David) Move the following objects into a datastore. this will make issue #26 much easier to implement
    github = {
      automation: {
        "memchaser" : "https://github.com/whimboo/memchaser",
        "mozmill-dashboard" : "https://github.com/whimboo/mozmill-dashboard",
        "pytest-mozwebqa" : "https://github.com/davehunt/pytest-mozwebqa",
        "mozmill-crowd" : "https://github.com/whimboo/mozmill-crowd",
        "automation-services-bot" : "https://github.com/automatedtester/automation-services-bot",
        "unittest-zero": "https://github.com/automatedtester/unittest-zero",
        "testdaybot" : "https://github.com/automatedtester/testdaybot",
        "nightlytt" : "https://github.com/mozilla/nightlytt"
        }
      , mozwebqa : {
      },
    },
    meeting = {
      automation:{
        standup: "Come join us at 2:30 PDT/PST on Wednesday in Warp Core. You can join in with Vidyo at https://v.mozilla.com/flex.html?roomdirect.html&key=PGtLpx3XQGJz or if dialing from a room use 63.245.220.25##04654",
        meeting: "Our Meeting is held every week on a Monday at 14:00 PDT/PST. You can join in with Vidyo at https://v.mozilla.com/flex.html?roomdirect.html&key=PGtLpx3XQGJz or if dialing from a room use 63.245.220.25##04654 or for more details go to https://wiki.mozilla.org/QA/Automation_Services/Meetings",
      },
      mozwebqa:{
        meeting: "Come join us at 9AM PDT/PST on a Thursday.You can join in with Vidyo https://v.mozilla.com/flex.html?roomdirect.html&key=ZAlDIwL9AJcf or dial in 650-903-0800 or 650-215-1282 x92 Conf# 303 (US/INTL) or 1-800-707-2533 (pin 369) Conf# 303 (US)",
      }

    };

client.addListener('message', function (from, to, message) {
  if (from === 'firebot') {
    console.log("ignoreing firebot")
    return;
  }

  console.log(from + ' => ' + to + ': ' + message);
  logger.log({channel:to, from:from, message:message});
  if (message.search(nick) >= 0){
    if (message.search(" hi[ $]?") >= 1){
      client.say(to, "Hi hi " + from);
    }
    if (message.search("damn you") >= 0) {
      client.say(to, "I am so sorry " + from + ", can we hug?");
    }
  }


  if (message.search(":gist") === 0){
    client.say(to, "Please paste >3 lines of text to http://pastebin.mozilla.org");
  }

  if (message.search(":help") === 0){
    for (var item in help){
      client.say(from, item + " : " + help[item]);
    }
  }

  if (message.search(":yt") === 0){
    var options = {
        host: 'gdata.youtube.com',
        port: 443,
        path: "/feeds/api/videos?q=" + message.substring(4).replace(/ /g, '+') + "&alt=json",
        method: 'GET'
    };
    var req = http.request(options, function(res) {
      var apiResult = '';
          
      res.on('data', function(d) {
        apiResult += d;
      });
      res.on('end', function(){
        try{
          data = JSON.parse(apiResult);
          title = data["feed"]["entry"][0]["title"]["$t"]
          link = data["feed"]["entry"][0]["link"][0]["href"];
          client.say(to, title + " -- " + link);
        } catch(e) {
          console.error(e.message);
        }
      });
    });
    req.end();
  }

  if (message.search(/bug \d+/i) >= 0 || message.search(/https:\/\/bugzilla.mozilla.org\/show_bug.cgi\?id=(\d+)/i) >= 0 ){
    var bugID = "";
    if (/bug (\d+)/i.exec(message)) {
      bugID = /bug (\d+)/i.exec(message)[1]
    } else {
      bugID = /https:\/\/bugzilla.mozilla.org\/show_bug.cgi\?id=(\d+)/i.exec(message)[1];
    }

    var options = {
        host: 'api-dev.bugzilla.mozilla.org',
        port: 443,
        path: "/0.9/bug?id=" + bugID,
        method: 'GET'
    };
    var apiResult = ''
    var req = http.request(options, function(res) {
      res.on('data', function(d) {
      apiResult += d; 
      });
            
      res.on('end', function(){
        var returnMessage = '';
        try{
          data = JSON.parse(apiResult);
          url = "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bugID;
          if (data["bugs"].length === 0){
            returnMessage = "Sorry " + from + " that bug doesn't exist! I suggest you get raising more bugs until it does!";
            logger.log({channel:to, from:nick, message:returnMessage}); 
            client.say(to, returnMessage);
            return;
          }
          summary = data["bugs"]["0"]["summary"];
          severity = data["bugs"]["0"]["severity"];
          status = data["bugs"]["0"]["status"];
          resolution = data["bugs"]["0"]["resolution"];
          returnMessage = "Bug " + url + " " + severity + ", " + status + " " + resolution + ", " + summary;
          logger.log({channel:to, from:nick, message:returnMessage});
          client.say(to, returnMessage); 
        }catch(e){
          console.error(e);            
        }
      });
    });
    req.end();
  }

  if (message.search(":source") === 0){
    client.say(to, "My details and code lives at http://automatedtester.github.com/automation-services-bot/. Go have a look!");
  }

  if (message.search(":pivotal") === 0){
    var projects = {
        "team" : "https://www.pivotaltracker.com/projects/323503",
        "shared modules" : "https://www.pivotaltracker.com/projects/344657",
        "web apps" : "https://www.pivotaltracker.com/projects/350145",
        "mozmill automation" : "https://www.pivotaltracker.com/projects/298905",
        "api refactor" : "https://www.pivotaltracker.com/projects/311747",
        "dashboard" : "https://www.pivotaltracker.com/projects/294869",
    }

    var project = /^:pivotal ((\w+)?(\s\w+)?)/.exec(message)
    if (project === null){
      for (var item in projects){
        client.say(to, item + ' - ' + projects[item]);
      }
    } else {
      try {
        console.log(project);
        client.say(to, project[1] + ' - ' + projects[project[1]]);
      } catch (e) {
        client.say(to, "Unfortunately that project doesn't appear to exist"); 
      }
    }
  }

  if (message.search(":list") === 0){
    var search = /:list (.+)/.exec(message);
    if (search === null){
      client.say(to, "http://groups.google.com/group/mozilla.dev.automation");
    } else {
      client.say(to, "http://groups.google.com/group/mozilla.dev.automation/search?group=mozilla.dev.automation&q=" + search[1].replace(/ /g, '+') + "&qt_g=Search+this+group");
    }
  }

  if (message.search(":standup") === 0){
    console.log(to.substring(1).toLowerCase());
    if (meeting[to.substring(1).toLowerCase()].standup){
      client.say(to, meeting[to.substring(1).toLowerCase()].standup);
    }
  }

  if (message.search(":meeting") === 0){
    if (meeting[to.substring(1).toLowerCase()].meeting){
      client.say(to, meeting[to.substring(1).toLowerCase()].meeting);
    }
  }

  if (message.search(":newissue") >= 0){
    var project = /:newissue ([a-z-_]+)/.exec(message);
    if (project !== null){
      var key = to.substring(1).toLowerCase();
      console.log(key);
      if (github[key][project[1]]){
        client.say(to, "Please raise an issue at " + github[key][project[1]] + "/issues/new");
      } else {
        client.say(to, "I am sorry I don't know of that project. Please raise an issue on " +
            "http://oss.theautomatedtester.co.uk/automation-services-bot/ if I should know about it");
      }
    } else {
      client.say(to, "please use the syntax :newissue project. You can get a list of projects by calling :github");
    }
  }

  if (message.search(":issues") >= 0){
    var project = /:issues ([a-z-_]+)/.exec(message);
    if (project !== null){
      var key = to.substring(1).toLowerCase();
      console.log(key);
      if (github[key][project[1]]){
        client.say(to, "Issues for " + project +  " can be found at " + github[key][project[1]] + "/issues");
      } else {
        client.say(to, "I am sorry I don't know of that project. Please raise an issue on " +
            "http://oss.theautomatedtester.co.uk/automation-services-bot/ if I should know about it");
      }
    } else {
      client.say(to, "please use the syntax :issues project. You can get a list of projects by calling :github");
    }
  }

  if (message.search(":github") === 0){
    var projects = github[to.substring(1).toLowerCase()];
    for (var item in projects){
      client.say(from, item + " : " + projects[item]);
    }
  }
});

client.addListener('pm', function(nick, message){
  if (message.search('help') === 0){
    for (var item in help){
      client.say(nick, item + " : " + help[item]);
    }
  }
});

client.addListener('join', function(channel, who){
  logger.log({channel:channel, action: "join", who: who});
});

client.addListener('part', function(channel, who, reason){
  logger.log({channel:channel, action: "part", who: who, reason:reason})
});

client.addListener('kick', function(channel, who, by, reason) {
  logger.log({who:who, channel:channel, by:by, reason:reason, action:'kick'});
});

client.addListener('invite', function(channel, from){
  logger.log({channel:channel, action:"invite", from:from});
});

client.addListener('nick', function(oldnick, newnick, channel){
  logger.log({channel:channel, action:"nick", oldnick:oldnick, newnick:newnick});
});

client.addListener('quit', function(who, reason, channel){
  logger.log({channel:channel, action: "quit", who: who, reason:reason})
});

client.addListener('error', function(message){
  console.error("message");
});
