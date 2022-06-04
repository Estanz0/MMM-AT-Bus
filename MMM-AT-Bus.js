Module.register("MMM-AT-Bus",{
    // Default module config.
	defaults: {
		bus: '814',
		stopCode: '3496',
		key: 'key'
	},

	start: function() {
        Log.info("Starting module: " + this.name);
        var self = this;

		var bus = this.config.bus;
		var stopCode = this.config.stopCode;
		var key = this.config.key;

        //Do this once first
        self.sendSocketNotification('START', bus, stopCode, key);

        //Then every hour
        setInterval(function() {
            self.sendSocketNotification('START', bus, stopCode, key);
        }, 30000); //perform every 30 seconds (30000 milliseconds)
    },

	// Override dom generator.
	// Override dom generator.
    getDom: function() {
        Log.log("Updating MMM-AT-Bus DOM.");

        var body = "";

        if(this.text != null){
            body = this.text;
        }

        var wrapper = document.createElement("div");
        wrapper.innerHTML = body;
        return wrapper;
    },
	socketNotificationReceived: function(notification, wrapper) {
        Log.log("socket received from Node Helper");
        if(notification == "AT_GETREQUEST_RESULT"){
            Log.log(wrapper);
            this.text = wrapper;
            this.updateDom();
        }
    }
});