Module.register("MMM-AT-Bus",{
    // Default module config.
	defaults: {
		bus: '',
        stopCode: '',
        forwardLimit: '1800',   // seconds. Ignore bus trips further in the future
        backLimit: '300',       // seconds. Ignore bus trips further in the past
        refresh: '10',          // seconds. Refresh rate 
		key: 'key'
	},

	start: function() {
        Log.info("Starting module: " + this.name);
        console.log("Starting module: " + this.name);
        var self = this;

        let payload = this.config
		
        //Do this once first
        self.sendSocketNotification('START', payload);

        //Then every hour
        setInterval(function() {
            self.sendSocketNotification('START', payload);
        }, (+this.config.refresh) * 1000); 
    },

	// Override dom generator.
    getDom: function() {
        Log.log("Updating MMM-AT-Bus DOM.");

        var body = "";

        if(this.text != null){
            body = this.text;
        }

        var payloadEmpty = true;

        var wrapper = document.createElement("table");

        // Title and description
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        var text = ""
        if (this.config.bus) {
            text = "Next Arrivals for " + this.config.bus + " at stop " + this.config.stopCode;
        } else {
            text = "Next Arrivals at stop " + this.config.stopCode;
        }
        var text = document.createTextNode(text) ;
        th.appendChild(text);
        tr.appendChild(th)
        wrapper.appendChild(tr);

        // Arrivals with minutes to arrival
        if (body.timeArr) {
            if(body.timeArr.length > 1) {
                payloadEmpty = false;
            }
            for(let i = 0; i < body.timeArr.length; i++){
                var busNum = body.timeArr[i].bus;
                var minutes = body.timeArr[i].time_minutes;
                var tr = document.createElement("tr");
                var td = document.createElement("td");
                var text = document.createTextNode(busNum + " | Ariving in: " + minutes + " minutes") ;
                td.appendChild(text);
                tr.appendChild(td)
                wrapper.appendChild(tr);
            }
        }	

        // Arrivals with scheduled time
        if (body.timeSch) {
            if(body.timeSch.length > 1) {
                payloadEmpty = false;
                wrapper.appendChild(document.createElement("p").appendChild(document.createTextNode("-------------")));
            }
            for(let i = 0; i < body.timeSch.length; i++){
                var busNum = body.timeSch[i].bus;
                var time = body.timeSch[i].time;
                var tr = document.createElement("tr");
                var td = document.createElement("td");
                var text = document.createTextNode(busNum + " | Scheduled arrival: " + time);
                td.appendChild(text);
                tr.appendChild(td)
                wrapper.appendChild(tr);
            }
        }		
        if (payloadEmpty) {
            wrapper = document.createElement("div");
            wrapper.appendChild(document.createElement("p").appendChild(document.createTextNode("Finding Bus Arrival Times...")))
        }
        return wrapper;
    },
	socketNotificationReceived: function(notification, payload) {
        Log.log("MMM-AT-Bus socket received from Node Helper");
        if(notification == "AT_GETREQUEST_RESULT"){
            Log.log(payload);
            this.text = payload;
            this.updateDom();
        }
    }
});