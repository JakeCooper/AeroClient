/*
* Script files that manages the display of the inforation on the display.
* @date: 2014-03-27
* @author: Simon Diemert
*/

/**
* This function definition will not just connect, but also pass a callback function
* which will be run when the connect function either successfully connects, or disconnects.
* This will adjust the UI correctly, and give the client control over the connection.
*/
do_connect = function()
{	
	disp.addNewLogMessage(new Message("DEBUG", "WEB", "Connecting to " + host, getTimestamp(Math.round(+new Date()/1000))));

	connect(client_type_enum["Spectator"], function(status) {
		if(status == false)
		{

			$('#connected').removeClass('status-connected').addClass('status-disconnected');
			$('#connected').html("Disconnected");
			$('#connect-btn').html("Connect");
			disp.addNewLogMessage(new Message("WARNING", "WEB", "Disconnected from server", getTimestamp(Math.round(+new Date()/1000))));
		}
		else
		{
			$('#connected').removeClass('status-disconnected').addClass('status-connected');
			$('#connected').html("Connected");
			$('#connect-btn').html("Disconnect");
			disp.addNewLogMessage(new Message("INFO", "WEB", "Successfully connected", getTimestamp(Math.round(+new Date()/1000))));
		}
	});
}

function getTimestamp(unix)
{
	var now = new Date(unix * 1000);
	
    return (now.getFullYear() + "-" +
			((now.getMonth() + 1) < 10 ? "0" + (now.getMonth() + 1) : (now.getMonth() + 1)) + '-' +
            (now.getDate() < 10 ? "0" + now.getDate() : now.getDate()) + '-' +
             ((now.getHours() < 9)
                 ? ("0" + now.getHours())
                 : (now.getHours())) + ':' +
             ((now.getMinutes() < 10)
                 ? ("0" + now.getMinutes())
                 : (now.getMinutes())) + ':' +
             ((now.getSeconds() < 10)
                 ? ("0" + now.getSeconds())
                 : (now.getSeconds())));
}

/*
*   Class that will contain all the data in to be displayed. 
*   Manages the display of the data in the HTML template.
*/
function Display(){
    this.messages = new Array();     


    this.filters = {
        all: true,
        debug: true,
        info: true, 
        warning: true, 
        critical: true, 
        dc: true,
        at: true,
        uav: true, 
        sent: true, 
		web: true
    }

    /*
     this.filter_view_all = true; 
     this.filter_view_debug = true; 
     this.filter_view_info = true; 
     this.filter_view_warning = true; 
     this.filter_view_critical = true; 
     this.filter_view_dc = true; 
     this.filter_view_at = true; 
     this.filter_view_uav = true; 
     this.filter_view_sent = true; 
     */
}

/*
* Adds a new message to the message table in the console.
* Will only display items that are on the filters
*/
Display.prototype.addNewLogMessage = function(message){
    this.messages.push(message); //add new message to displays list of messages
    this.displayLogMessage(message); //print the message (this funciton will check for filtering)
}

/*
* Prints the log message out the HTML template.  
* Checks if the message will pass the filters
*/
Display.prototype.displayLogMessage = function(message){

    if(this.passFilter(message.level, message.system)){
        var s = "";
        if(message.level === "INFO"){
            s+="<tr class='success'>";
        }else if(message.level === "CRITICAL"){
            s+="<tr class='danger'>";
        }else if(message.level === "DEBUG"){
            s+="<tr class='info'>";
        }else if(message.level === "WARNING"){
            s+="<tr class='warning'>";
        }else{
            s+="<tr class=''>";
        }




        s+="<td>"+message.level+"</td>";
        s+="<td>"+message.system+"</td>";
        s+="<td>"+message.date+"</td>";
        s+="<td>"+message.text+"</td>";
        s+="</tr>";
        $("#console-table-body").prepend(s);  //write message to the console.
    }
}

/*
* Returns true if level and system types are not being filtered out
* Returns false if the filters are configured such that this system and level will not be displayed
*/
Display.prototype.passFilter = function(level, system){
    if(this.filter_view_all){ //return right away if we are viewing all items
        return true; 
    }else{
        if(level === "DEBUG" && !this.filters.debug){
            return false; 
        }
        if(level === "INFO" && !this.filters.info){
            return false; 
        }
        if(level === "WARNING" && !this.filters.warning){
            return false; 
        }
        if(level === "CRITICAL" && !this.filters.critical){
            return false; 
        }
        if(system === "DC" && !this.filters.dc){
            return false; 
        }
        if(system === "AT" && !this.filters.at){
            return false; 
        }
        if(system === "UAV" && !this.filters.uav){
            return false; 
        }
        if(system === "WEB" && !this.filters.web){
            return false; 
        }
        if(level === "SENT" && !this.filters.sent){
            return false; 
        }
        return true;  //if we get here, then the filter must not be droping this message. 
    }
}

/*
* Refreshes all of the messages in the console view
* relies on the filters and will regenerate the list.
*/
Display.prototype.refreshMessages = function(){
    //clear current messages
    $("#console-table-body").empty(); 

    //add the messages that are stored
    for(i in this.messages){
        this.displayLogMessage(this.messages[i]); 
    }
}

/*
* Applies filters to the console
*/
Display.prototype.applyFilter = function(name){
    //adjust the flags in the 
   
    /*
    for(k in this.filters){
        this.filters.key = false; 
    }
    */

    //var current_button_state = $("#"+name+"-filter-button").text() 

    console.log(this.filters); 

    this.filters.all = false;  
    if(name === "CRITICAL"){
        this.filters.critical = (!this.filters.critical); 
        if(!this.filters.critical){
            $("#CRITICAL-filter-button").text("Show"); 
        }else{
            $("#CRITICAL-filter-button").text("Hide"); 
        }
    }else if(name === "WARNING"){
        this.filters.warning = (!this.filters.warning); 
        if(!this.filters.warning){
            $("#WARNING-filter-button").text("Show"); 
        }else{
            $("#WARNING-filter-button").text("Hide"); 
        }

    }else if(name === "INFO"){
        this.filters.info = (!this.filters.info); 
        if(!this.filters.info){
            $("#INFO-filter-button").text("Show"); 
        }else{
            $("#INFO-filter-button").text("Hide"); 
        }
    }else if(name === "DEBUG"){
        this.filters.debug = (!this.filters.debug); 
        if(!this.filters.debug){
            $("#DEBUG-filter-button").text("Show"); 
        }else{
            $("#DEBUG-filter-button").text("Hide"); 
        }
    }else if(name === "DC"){
        this.filters.dc = (!this.filters.dc); 
        if(!this.filters.dc){
            $("#DC-filter-button").text("Show"); 
        }else{
            $("#DC-filter-button").text("Hide"); 
        }
    }else if(name === "AT"){
        this.filters.at = (!this.filters.at); 
        if(!this.filters.at){
            $("#AT-filter-button").text("Show"); 
        }else{
            $("#AT-filter-button").text("Hide"); 
        }
    }else if(name === "UAV"){
        this.filters.uav = (!this.filters.uav); 
        if(!this.filters.uav){
            $("#UAV-filter-button").text("Show"); 
        }else{
            $("#UAV-filter-button").text("Hide"); 
        }
    }else if(name === "WEB"){
        this.filters.web = (!this.filters.web); 
        if(!this.filters.web){
            $("#WEB-filter-button").text("Show"); 
        }else{
            $("#WEB-filter-button").text("Hide"); 
        }
    }else if(name === "SENT"){
        this.filters.sent = (!this.filters.sent); 
        if(!this.filters.sent){
            $("#SENT-filter-button").text("Show"); 
        }else{
            $("#SENT-filter-button").text("Hide"); 
        }
    }
    console.log(this.filters); 
    this.refreshMessages(); 
}

var disp = new Display();
disp.addNewLogMessage(new Message("INFO", "AT", "AT started init process.", "2014-03-27-13:05:21")); 
disp.addNewLogMessage(new Message("WARNING", "DC", "Image processing has 1MB of memory left", "2014-03-27-14:05:21")); 
disp.addNewLogMessage(new Message("INFO", "DC", "Image processing began stitching images", "2014-03-27-14:06:25:")); 
disp.addNewLogMessage(new Message("CRITICAL", "DC", "Image processing is out of memory, consider increasing to continue.", "2014-03-27-14:06:25")); 
disp.addNewLogMessage(new Message("DEBUG", "DC", "Server recived pack number 105567 from UAV", "2014-03-27-14:06:25")); 
disp.addNewLogMessage(new Message("DEBUG", "UAV", "Sent pack number 123456 too DC", "2014-03-27-14:06:25")); 
disp.addNewLogMessage(new Message("SENT", "UAV", "Signal sent to close belly doors on UAV", "2014-03-27-14:06:25")); 
disp.refreshMessages();
//=======================================
//END DISPLAY CLASS
//=======================================

//=======================================
//MESSAGE CLASS
//=======================================
function Message(level, system, text, date){
    this.date = date;
    this.text = text; 
    this.level = level; 
    this.system = system; 
}
//=======================================
//END MESSAGE CLASS
//=======================================

//======================================
//Event handlers input submission and sending
//======================================

/*
* handler for pressing enter in the text field
*/
$("#input-field").keypress(function(event) {
    if (event.which == 13) {
        event.preventDefault();
        submitCommand($("#input-field").val());
    }
});


/*
* handler for pressing the 'send' button
*/
$("#input-field-button").click(function(){
    submitCommand($("#input-field").val());
}); 

function submitCommand(text){
    $("#input-field").val("");

    disp.addNewLogMessage(new Message("SENT", "SENT", "Command: "+text, getTimestamp(Math.round(+new Date()/1000))))

    sendMessage(text); 

    //still need to package this into a message and store locally. 

    //add code here trigger packet building and send data off
}

//=======================================
//UI - Buttons & Status
//=======================================
$('#connect-btn').click( function() {

	if(connected == true)
		socket.close();
	else
		do_connect();
});

$('#connected').html("Connecting");
$('#connect-btn').html("Connecting");

//=======================================
// Run functions
//=======================================
do_connect();