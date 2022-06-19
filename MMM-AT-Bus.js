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

        var wrapper = document.createElement("div");
        if (body.timeArr && body.timeArr.length > 1) {
            payloadEmpty = false;
            for(let i = 0; i < body.timeArr.length; i++){
                var busNum = body.timeArr[i].bus;
                var minutes = body.timeArr[i].time_minutes;
                var p = document.createElement("p");
                var text = document.createTextNode(busNum + " | Ariving in: " + minutes + " minutes") ;
                p.appendChild(text);
                wrapper.appendChild(p);
            }
        }	

        if (body.timeSch && body.timeSch.length > 1) {
            payloadEmpty = false;
            wrapper.appendChild(document.createElement("p").appendChild(document.createTextNode("-------------")));
            for(let i = 0; i < body.timeSch.length; i++){
                var busNum = body.timeSch[i].bus;
                var time = body.timeSch[i].time;
                var p = document.createElement("p");
                var text = document.createTextNode(busNum + " | Scheduled arrival: " + time);
                p.appendChild(text);
                wrapper.appendChild(p);
            }
        }	

        if (payloadEmpty) {
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