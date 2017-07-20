'use strict';
var settings = {
        gravestoneEnabled: true,
		mvpOnly:true,
        serverTimeOffset: 0, //old -17640000 also it's being rewritten on line 24 lolol
        userLevelColors: ["black", "black", "blue", "orange"],
        alarm: null,
        notification: null,
        useAlerts: false
    },
    user = {
        id: null,
        level: null,
        name: null
    },
    isRunning = true,           // {Bool} Whether or not the app is running
    lastActivityID = 0,         // {Number} last activity ID, used in updating the activity log
    deadMvps = [],              // {Array} Contains the ids of dead mvps. This is used as a list of timers to update in the main timer function.
    mvps = [],                  // {Array} Contains information of all mvps.
    warnTime = 2 * 60 * 1000;   // {Number} Time in ms to give warning before an mvp is potentially spawned.

window.onload = function() {
    document.getElementById("search").addEventListener("keyup", search);
	//settings.serverTimeOffset = -5*1000*60*60 + -4*1000*60;
	settings.serverTimeOffset = 0;
    settings["alarm"] = document.createElement("audio");
    settings["alarm"].src = "audio/alarm4.wav";
    settings["alarm"].volume = 0.02;
    settings["notification"] = document.createElement("audio");
    settings["notification"].src = "audio/notification1.ogg";
    settings["notification"].volume = 1;
    document.getElementById("volume").addEventListener("change", function(e) {
        document.getElementById("volumeNum").innerHTML = e.target.value;
        settings["alarm"].volume = e.target.value/100;
    });
    document.getElementById("testAlarm").addEventListener("click", function() {
       settings["alarm"].play();
    });
    document.getElementById("setServerOffset").addEventListener("click", function() {
		console.log("Offset before: " + settings.serverTimeOffset);
        settings.serverTimeOffset = parseInt(document.getElementById("serverOffset").value) * 1000 * 60 * 60;
        document.getElementById("serverSet").innerHTML = "Time set to " +  parseInt(document.getElementById("serverOffset").value);
		console.log("Offset after: " + settings.serverTimeOffset);
    });
    $.get("fetchuserinfo.php", function(data) {
        data = $.parseJSON(data);
        user['id'] = parseInt(data['id']);
        user['level'] = parseInt(data['level']);
        user['name'] = data['name'];
    });
	$.get("fetchmvp.php", function(data) {
        data = $.parseJSON(data);
        if(data['error'] === undefined) {
            loadMvps(data);
        }
        else {
            log(new Error(), data['error'], true);
        }
	});
    //TODO: sometimes this finishes before loadmvps finishes, causing
    // the log to not load until the first iteration of checkNewActivities
    setTimeout(function() {
        $.get("fetchlog.php", function(data) {
            loadActivityLog($.parseJSON(data));
        });
    }, 1000);
    setInterval(checkNewActivities, 3000);
};

function loadActivityLog(activities) {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    var activityLog = document.getElementById("activity_log"),
        activityDate,
        msg,
        data,
        i;
    for(i=0;i<activities.length;i++) {
        lastActivityID = (parseInt(activities[i]['id']) > lastActivityID) ? parseInt(activities[i]['id']) : lastActivityID;
        activityDate = new Date(parseInt(activities[i]['dateposted']));
        data = JSON.parse(activities[i]['data']);
        msg = "<span class='level" + activities[i]['level'] + "'>" + activities[i]['username'] + "</span>";
        if(data['type'] == "kill" || data['type'] == "respawn" || data['type'] == "adjust"){
            if(data['type'] == "kill") {
                msg += " <span class='kill'>killed</span>";
            }
            if(data['type'] == "respawn") {
                msg += " <span class='respawn'>respawned</span>";
            }
            if(data['type'] == "adjust") {
                msg += " <span class='adjust'>adjusted</span>";
            }
            msg += " mvp " + mvps[data['mvpid']]["name"] + " on field " + mvps[data['mvpid']]['field'];
        }
        //login msg goes here ^
        activityLog.innerHTML = "<p>" + activityDate.toLocaleDateString() + " :: "  + activityDate.toLocaleTimeString() + " " + msg + "</p>" + activityLog.innerHTML;
    }
}

function postActivity(data) {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    $.get("postactivity.php?data=" + encodeURIComponent(JSON.stringify(data)), function(result) {
        console.log(result);
        if(result != 1) {
            log(new Error(), "Failed to update server.", true);
        }
    });
}

function checkNewActivities() {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    $.get("fetchnewactivities.php?lastid=" + lastActivityID, function(data) {
        var i,
            update;
        data = $.parseJSON(data);
        if(data.length > 0) {
            loadActivityLog(data);
            for(i=0;i<data.length;i++) {
                if(user["name"] == data[i]["username"]) {
                    console.log("[CHECKNEWACIVITIES] Discarding update. The update was made by the current user.");
                    break;
                }
                update = $.parseJSON(data[i]['data']);
                if(update['type'] == "respawn") {
                    mvps[parseInt(update['mvpid'])]['last_death'] = parseInt(update['time']);
                }
                if(update['type'] == "kill") {
                    killMvp(parseInt(update['mvpid']), new Date());
                }
                if(update['type'] == "adjust"){
                    if(isDead(update['mvpid'])) {
                        mvps[parseInt(update['mvpid'])]["last_death"] = (+new Date(Date.now() - parseInt(update['time'])));
                    }
                    else {
                        killMvp(parseInt(update['mvpid']), new Date(Date.now() - parseInt(update['time'])));
                    }
                }
            }
        }
    });
}
/**
 * Filters the mvp list and blocks based on the user-given string.
 */
function search() {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    var searchTerm = new RegExp(this.value.toLowerCase()),
        i;
    for(i=1; i<mvps.length; i++) {
      if(typeof mvps[i] === "undefined") continue;
      if(!mvps[i]["name"].toLowerCase().match(searchTerm)) {
          document.getElementById("block" + mvps[i]["id"]).style.display = "none";
          document.getElementById("list" + mvps[i]["id"]).style.display = "none";
      }
      else {
          document.getElementById("block" + mvps[i]["id"]).style.display = "block";
          document.getElementById("list" + mvps[i]["id"]).style.display = "block";
        }
    }
}

/**
 * Sorts all mvps on the field by respawn time
 */
function sortByTimeRemaining() {
    var mvpContainer, i;

    mvpContainer = document.getElementById("mvp_container");
    //example below. childnodes[3] because info + text nodes
    //mvpContainer.insertBefore(document.getElementById("block73"), mvpContainer.childNodes[3]);

    for(i=1;i<mvps.length;i++) {
        console.log(mvps[i]);
    }
}

/**
 * Called roughly once a second. Iterates through the deadMvps array,
 * updating the timers and calling the necessary kill/respawn functions
 * when needed.
 */
function tick() {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    var curTime = new Date(), //{Date} current time
        curMvp,               // {JSON} current mvp
        i;
    for(i=0;i<deadMvps.length;i++) {
        curMvp = mvps[deadMvps[i]];
        if(curTime - curMvp["last_death"] >= parseInt(curMvp["max_spawn_time"]) * (60 * 1000)) {
            console.log("[TICK]Mvp " + curMvp["name"] + " on field" + curMvp["field"] + " has guaranteed spawned");
            deadMvps.splice(i, 1);
            respawnMvp(curMvp["id"]);
            break;
        }
        document.getElementById("timer" + curMvp["id"]).innerHTML = getTimeUntilSpawn(curTime - curMvp["last_death"], curMvp["max_spawn_time"]*60*1000);
        if(curTime - curMvp["last_death"] >= parseInt(curMvp["min_spawn_time"]) * (60*1000) - warnTime) {
            if(curTime - curMvp["last_death"] >= parseInt(curMvp["min_spawn_time"]) * (60*1000)) {
                //mvp is potentially alive
                if(!curMvp["potentialAlarm"]) {
                    console.log("[DEBUG][TICK] first-time code for the mvp potentially being alive has been called", curTime, curMvp, warnTime);
                    curMvp["potentialAlarm"] = true;
                    //TODO: potential alarm
                }
                document.getElementById("list" + curMvp["id"]).innerHTML = curMvp["name"] + ", " + curMvp["field"] + ":" + " Possible";
				document.getElementById("list" + curMvp["id"]).className = "possible";
                document.getElementById("status" + curMvp["id"]).className = "status";
                restoreMvp(curMvp["id"]);
                document.getElementById("block" + curMvp["id"]).style.backgroundColor = "rgba(255, 102, 0, 0.5)";
            }
            else {
                //mvp is *almost* potentially alive
                if(!curMvp["warningAlarm"]) {
                    console.log("[DEBUG][TICK] first-time code for the mvp warning has been called", curTime, curMvp, warnTime);
                    curMvp["warningAlarm"] = true;
                    settings["alarm"].play();
                    if(settings["useAlerts"]) {
                        alert("TWO MINUTE WARNING :: MvP " + curMvp["name"] + " on field " + curMvp["field"] + " is about to respawn.");
                    }
                }
                document.getElementById("status" + curMvp["id"]).className = "status";
                document.getElementById("block" + curMvp["id"]).style.backgroundColor = "rgba(255, 102, 0, 0.5)";
            }
        }
    }
}

/**
 * Initially loads the mvps onto the page with
 * the appropriate dead/alive status.
 *
 * @param mvpJSON (JSON) well-formed JSON object
 * containing information about each listed mvp.
 */
function loadMvps(mvpJSON) {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    var curTime = + new Date(),                     // {Date} Current date
        name, field, spawn, status, timer, actions, manualSpan, manualButton, img,// {HTML Element} <p>'s containing information of an mvp
        isDead,                                     // {Bool} whether or not the mvp is dead
        i;
    for(i=0;i<mvpJSON.length;i++){
        var mvpDiv = document.createElement("div"), //HTML Div containing info about the mvp
            mvpList = document.createElement("p"),   //HTML P containing a brief summary of mvp status
            lastDeathDate = new Date(parseInt(mvpJSON[i]["last_death"])); //JS Date object of time mvp was last killed
		if(mvpJSON[i]["disabled"] == 1) {
			//continue;
		}
        mvps[mvpJSON[i]["id"]] = mvpJSON[i];
        mvps[mvpJSON[i]["id"]]["warningAlarm"] = false;
        mvps[mvpJSON[i]["id"]]["potentialAlarm"] = false;
        mvpList.id = "list" + mvpJSON[i]["id"];
        mvpList.innerHTML = mvpJSON[i]["name"] + ", " + mvpJSON[i]["field"] + ": ";
        mvpDiv.className = "mvp";
        mvpDiv.id = "block" + mvpJSON[i]["id"];
        mvps[mvpJSON[i]["id"]]["img"] = document.createElement("img");
      //  mvps[mvpJSON[i]["id"]]["img"].src = "img/" + mvpJSON[i]["name"] + "-0.png";
        mvps[mvpJSON[i]["id"]]["img"].src = "img/" + mvpJSON[i]["name"] + ".gif";
        mvps[mvpJSON[i]["id"]]["img"].alt = mvpJSON[i]["name"];
        mvps[mvpJSON[i]["id"]]["img"].id = mvpJSON[i]["id"];
        mvps[mvpJSON[i]["id"]]["img"].onload = function(e) {
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            mvps[e.target.id]["canvas"] = canvas;
            mvps[e.target.id]["ctx"] = ctx;
            canvas.width = 100;
            canvas.height = 100;
            ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
            if(mvps[e.target.id]["time_dead"] > 0) {
                grayscaleMvp(e.target.id);
                crossOutMvp(e.target.id);
            }
            document.getElementById("block" + e.target.id).appendChild(canvas);
        }
        name = document.createElement("p");
        name.className = "name";
        name.appendChild(document.createTextNode("Name: " + mvpJSON[i]["name"]));
        mvpDiv.appendChild(name);
        field = document.createElement("p");
        field.className = "field";
        field.appendChild(document.createTextNode("Field: " + mvpJSON[i]["field"]));
        mvpDiv.appendChild(field);
        spawn = document.createElement("p");
        spawn.className = "spawn";
        spawn.appendChild(document.createTextNode("Spawn time: " + mvpJSON[i]["min_spawn_time"] + "~" + mvpJSON[i]["max_spawn_time"]));
        mvpDiv.appendChild(spawn);

        status = document.createElement("p");
        status.id = "status" + mvpJSON[i]["id"];
        if(parseInt(mvpJSON[i]['time_dead']) > 0) {
            mvps[mvpJSON[i]["id"]]["last_death"] = new Date((+new Date() - parseInt(mvpJSON[i]['time_dead'])));
            if(curTime - mvps[mvpJSON[i]["id"]]["last_death"] > mvps[mvpJSON[i]["id"]]["min_spawn_time"] * (60 * 1000) - warnTime) {
                mvps[mvpJSON[i]["id"]]["warningAlarm"] = true;
            }
            isDead = true;
            mvpList.innerHTML += "Dead";
            mvpList.className = "dead";
            status.className = "status dead";
            status.appendChild(document.createTextNode("Dead since: " + lastDeathDate.getHours() + ":" + lastDeathDate.getMinutes() + ":" + lastDeathDate.getSeconds()));
            deadMvps.push(mvpJSON[i]["id"]);
        }
        else {
            mvps[mvpJSON[i]["id"]]["last_death"] = 1;
            isDead = false;
            mvpList.innerHTML += "Alive";
            mvpList.className = "alive";
            status.className = "status alive";
            status.appendChild(document.createTextNode("Alive"));
        }
        mvpDiv.appendChild(status);
        timer = document.createElement("p");
        timer.id = "timer" + mvpJSON[i]["id"];
        timer.className = "timer";
        timer.appendChild(document.createTextNode("0:0:0"));
        mvpDiv.appendChild(timer);
        actions = document.createElement("button");
        actions.id = "actions" + mvpJSON[i]["id"];
        actions.addEventListener('click', toggleMvpStatus);
        actions.className = "actions";
        actions.appendChild((isDead) ? document.createTextNode("Respawn") : document.createTextNode("Kill") );
        mvpDiv.appendChild(actions);
        document.getElementById("mvp_list").appendChild(mvpList);
        document.getElementById("mvp_container").appendChild(mvpDiv);
        if(settings.gravestoneEnabled) {
            manualSpan = document.createElement("p");
            manualSpan.appendChild(document.createTextNode("Gravestone(hh:mm)"));
            manualSpan.appendChild(document.createElement("input"));
            manualButton = document.createElement("button");
            manualButton.style.margin = "3px";
            manualButton.addEventListener("click", manuallySetTime);
            manualButton.innerHTML = "Set";
            manualSpan.appendChild(manualButton);
            mvpDiv.appendChild(manualSpan);
        }
    }
   setInterval(tick, 900);
}

/**
 * Responsible for the visual and audio queues alerting
 * the users that an mvp has guaranteed respawned.
 *
 * @param {Number} mvpId - ID of the mvp that has respawned
 */
function respawnMvp(mvpId) {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    //play audio
    if(settings["useAlerts"]) {
        alert("MVP RESPAWN :: MvP " + mvps[mvpId]["name"] + " on field + " + mvps[mvpId]["field"] + " has respawned.");
    }
    mvps[mvpId]["warningAlarm"] = false;
    mvps[mvpId]["potentialAlarm"] = false;
    restoreMvp(mvpId);
    document.getElementById("block" + mvpId).style.backgroundColor = "rgba(0,185,0,0.5)";
    document.getElementById("status" + mvpId).className ="status alive";
    document.getElementById("status" + mvpId).innerHTML = "Alive";
    document.getElementById("timer" + mvpId).innerHTML = "0:0:0";
    document.getElementById("list" + mvpId).className = "alive";
    document.getElementById("list" + mvpId).innerHTML = mvps[mvpId]["name"] + ", " + mvps[mvpId]["field"] + ": Alive";
    document.getElementById("actions" + mvpId).innerHTML = "Kill";
    document.title = "(!) " +  mvps[mvpId]["name"] + " on field " + mvps[mvpId]["field"] + " has spawned!";
    setTimeout(function() {
        document.getElementById("block" + mvpId).style.backgroundColor = "#eee";
        document.title = "Ragnarok MvP Timer";
    }, 3500);
}
/**
 * Produces a string indicating the number of hours, minutes, and seconds
 * until an mvp respawns.
 *
 * @param {Number} timeElapsed - Amount of time in ms since the mvp died.
 * @param {Number} spawnTime - Amount of time in ms the mvp takes to respawn once killed.
 * @returns {String} Amount of time the mvp has until it is spawned using the format hours:minutes:seconds.
 */
function getTimeUntilSpawn(timeElapsed, spawnTime) {
    var timeLeft, hours, minutes, seconds;
    timeLeft = spawnTime - timeElapsed;
    hours = Math.floor(timeLeft/(1000*60*60));
    timeLeft -= hours*(1000*60*60);
    minutes = Math.floor(timeLeft/(1000*60));
    timeLeft -= minutes*(1000*60);
    seconds = Math.floor(timeLeft/1000);
    return hours + ":" + minutes + ":" + seconds;
}
/**
 * "Revives" or "Kills" an mvp, updating the appropriate
 * client-side DOM and status variables, then sends a request
 * to the server to change the mvp's status in the database.
 */
function toggleMvpStatus() {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    var mvp = mvps[this.parentElement.id.substr(5)],                                             // {JSON} information of the mvp whose status is to be changed
        curTime = new Date(),                                                                    // {Date} current date
        isDead = !!(curTime - mvp["last_death"] < parseInt(mvp["max_spawn_time"] * (60*1000) )), // {Bool} whether or not the mvp is dead
        data = {};                                                                               // {Array} information to be sent to server regarding new status
    if(isDead) {
        respawnMvp(mvp["id"]);
        mvp["last_death"] = 1;
        data['type'] = "respawn";
        data['mvpid'] = mvp['id'];
        data['time'] = 1;
        data['id'] = user['id'];
        postActivity(data);
        changeMvpTimeOnServer(mvp["id"], 1);
    }
    else {
        killMvp(mvp["id"], curTime);
        data['type'] = "kill";
        data['mvpid'] = mvp['id'];
        data['time'] =(+curTime);
        data['id'] = user['id'];
        postActivity(data);
        changeMvpTimeOnServer(mvp["id"], "now");
    }
}
/**
 * Responsible for all client side actions upon the death of an mvp.
 * killMvp should be called immediately before or immediately after
 * changeMvpTimeOnServer.
 * @param mvpId
 * @param timeKilled
 */
function killMvp(mvpId, timeKilled) {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    mvps[mvpId]["last_death"] = timeKilled.getTime();
    deadMvps.push(mvpId);
    grayscaleMvp(mvpId);
    crossOutMvp(mvpId);
    document.getElementById("list" + mvpId).className = "dead";
    document.getElementById("list" + mvpId).innerHTML = mvps[mvpId]["name"] + ", " + mvps[mvpId]["field"] + ": Dead";
    document.getElementById("status" + mvpId).className = "dead";
	document.getElementById("block" + mvpId).style.backgroundColor = "#eee";
    document.getElementById("status" + mvpId).innerHTML = "Dead since: " + timeKilled.getHours() + ":" + timeKilled.getMinutes() + ":" + timeKilled.getSeconds();
    document.getElementById("actions" + mvpId).innerHTML = "Respawn";
}

function changeMvpTimeOnServer(mvpId, time) {
    $.get('change_mvp.php?id=' + mvpId + "&valuetochange=last_death&newvalue=" + time, function(result) {
        if(result != "success") {
            log(new Error(), "Failed to update the mvp time in a manual reset", true);
            alert(" Something went wrong \n Failed to communicate with the server \n please let me know when this happens ASAP \n Important information: Line: " + new Error().lineNumber + " timestamp " + (+ new Date()));
        }
    });
}
/**
 * Responsible for manually assigning a time for an mvp
 * so long as the time is not ahead of the server.
 */
function manuallySetTime() {
    if(!isRunning) {
        log(new Error(), "App is not running. Aborting...", false);
        return;
    }
    //TODO: support for activity log 
    ///\d{2,}\:\d{2,}\:\d{2,}/
    var curTime = new Date(),
        hours, minutes,
        manualTime = this.parentNode.childNodes[1].value,
        mvpId = this.parentNode.parentNode.id.slice(5),
        mvpDeadTime,
        gravestoneTime = new Date(),
        timeOnServer = new Date(curTime.getTime() - settings.serverTimeOffset);
    if(settings.serverTimeOffset === null) {
        return;
    }
    if(manualTime.match(/\d{2,}\:\d{2,}/)) {
        hours = parseInt(manualTime[0] + manualTime[1]);
        minutes = parseInt(manualTime[3] + manualTime[4]);
        gravestoneTime.setHours(hours);
        gravestoneTime.setMinutes(minutes);
        mvpDeadTime = timeOnServer - gravestoneTime;
        console.log(mvpDeadTime);
        if(mvpDeadTime < 0) {
            mvpDeadTime = timeOnServer.getTime() - (gravestoneTime.getTime() - (1000*60*60*24));
        }
        mvps[mvpId]["last_death"] = (+new Date(Date.now() - mvpDeadTime));
        changeMvpTimeOnServer(mvpId, mvpDeadTime);
        var data = {};
        data['type'] = "adjust";
        data['mvpid'] = mvpId;
        data['time'] = mvpDeadTime;
        data['id'] = user['id'];
        postActivity(data);
        killMvp(mvpId, new Date(Date.now() - mvpDeadTime));
    }
    else {
        console.log("no match");
    }
}

/**
 * Grayscales the image of an mvp given its id.
 * @param {Number} id - the id of the mvp to grayscale
 */
function grayscaleMvp(id) {
    /*
     var r = d[i];
     var g = d[i+1];
     var b = d[i+2];
    */
    var canvas = mvps[id]["canvas"],
        ctx = mvps[id]["ctx"],
        img = mvps[id]["img"],
        imgData = ctx.getImageData(0,0,canvas.width,canvas.height),
        i, brightness;
    for(i=0;i<imgData.data.length;i+=4) {
        brightness = 0.34 * imgData.data[i] + 0.5 * imgData.data[i + 1] + 0.16 * imgData.data[i + 2];
        // red
        imgData.data[i] = brightness;
        // green
        imgData.data[i + 1] = brightness;
        // blue
        imgData. data[i + 2] = brightness;
        //http://www.html5canvastutorials.com/advanced/html5-canvas-grayscale-image-colors-tutorial/
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.putImageData(imgData,0,0);
}
/**
 * Adds a giant red X over the image of the mvp given its id.
 * @param {Number} id 0 the id of the mvp to cross out
 */
function crossOutMvp(id) {
    var canvas = mvps[id]["canvas"],
        ctx = mvps[id]["ctx"];
    ctx.strokeStyle = "red";
    ctx.lineWidth = "2";
    ctx.moveTo(0,0);
    ctx.lineTo(canvas.width,canvas.height);
    ctx.stroke();
    ctx.moveTo(canvas.width,0);
    ctx.lineTo(0,canvas.height);
    ctx.stroke();
}
/**
 * Restores the image of the mvp given its id.
 * @param {Number} id - the id of the mvp to restore
 */
function restoreMvp(id) {
    var canvas = mvps[id]["canvas"],
        ctx = mvps[id]["ctx"];
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(mvps[id]["img"],0,0,canvas.width,canvas.height);
}

/**
 * Indicates whether the given mvp is dea dor alive
 * @param {Number} mvpId - the id of the mvp
 * @returns {boolean} true if the mvp is dead or false if alive
 */
function isDead(mvpId) {
    return (deadMvps.indexOf(String(mvpId)) > -1);
}

/**
 * Logs an error with the line number the error occurred and the
 * message that goes along with it.
 * @param {Error} error - error object to see line number
 * @param {String} message - message to log
 * @param {Boolean} critical - whether or not the program should console.log, alert, and continue running
 */
function log(error, message, critical) {
    if(critical) {
        alert("A critical error occurred on line " + error.lineNumber + " with the following information: \n" + message);
        isRunning = false;
        return;
    }
    console.log("[LOG]Error on line " + error.lineNumber + ":" + message);
}