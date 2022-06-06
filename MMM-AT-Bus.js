Module.register("MMM-AT-Bus",{
    // Default module config.
	defaults: {
		bus: '814',
		stopCode: '7036',
		key: 'key'
	},

	start: function() {
        Log.info("Starting module: " + this.name);
        console.log("Starting module: " + this.name);
        var self = this;

        let payload = {
            bus: this.config.bus, 
            stopCode: this.config.stopCode, 
            key: this.config.key
        }
		
        
        //Do this once first
        self.sendSocketNotification('START', payload);

        //Then every hour
        setInterval(function() {
            self.sendSocketNotification('START', payload);
        }, 15000); 
    },

	// Override dom generator.
    getDom: function() {
        Log.log("Updating MMM-AT-Bus DOM.");

        var body = "";

        if(this.text != null){
            body = this.text;
        }

        var wrapper = document.createElement("div");
        if (body.timeArr) {
            for(let i = 0; i < body.timeArr.length; i++){
                var p = document.createElement("p");
                var text = document.createTextNode(body.timeArr[i]);
                p.appendChild(text);
                wrapper.appendChild(p);
            }
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