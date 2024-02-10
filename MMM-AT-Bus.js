Module.register("MMM-AT-Bus", {
	// Default module config.
	defaults: {
		// User Config
		provider: "AT",
		routeShortNames: ["NX1"],
		stopCode: "7036",
		forwardLimitHours: 2, // seconds. Ignore bus trips further in the future
		refreshIntervalSeconds: 20, // seconds. Refresh rate
		key: "key",

		// Populated on first run
		stopName: "",
		stopId: "",
		routeIdToShortName: {},

		responseReceived: false
	},

	start: function () {
		Log.info("Starting module: " + this.name);
		console.log("Starting module: " + this.name);
		var self = this;

		let payload = this.config;

		//Do this once first
		self.sendSocketNotification("START", payload);

		setInterval(function () {
			self.sendSocketNotification("START", payload);
		}, +this.config.refreshIntervalSeconds * 1000);
	},

	// Override dom generator.
	getDom: function () {
		Log.log("Updating MMM-AT-Bus DOM.");

		var body = "";

		if (this.text != null) {
			body = this.text;
		}

		this.config.stopName = body.stopName;

		var payloadEmpty = true;

		var wrapper = document.createElement("table");

		// Title and description
		var tr = document.createElement("tr");
		var th = document.createElement("th");
		var text = "";
		if (this.config.bus) {
			text = this.config.stopName + " (" + this.config.bus + ")";
		} else {
			text = this.config.stopName;
		}
		var text = document.createTextNode(text);
		th.appendChild(text);
		tr.appendChild(th);
		wrapper.appendChild(tr);

		// Arrivals with minutes to arrival
		if (body.inProgressTrips) {
			if (body.inProgressTrips.length > 1) {
				payloadEmpty = false;
			}
			for (let i = 0; i < body.inProgressTrips.length; i++) {
				var bus_name = body.inProgressTrips[i].bus_name;
				var minutes_to_arrival =
					body.inProgressTrips[i].minutes_to_arrival;
				var tr = document.createElement("tr");
				var td = document.createElement("td");
				var arriving_in_text =
					minutes_to_arrival > 0
						? "Ariving in: " + minutes_to_arrival + " minutes"
						: "Ariving now";
				var text = document.createTextNode(
					bus_name + " | " + arriving_in_text
				);
				td.appendChild(text);
				tr.appendChild(td);
				wrapper.appendChild(tr);
			}
		}

		// Arrivals with scheduled time
		if (body.scheduledTrips) {
			if (body.scheduledTrips.length > 1) {
				payloadEmpty = false;
			}
			for (let i = 0; i < body.scheduledTrips.length; i++) {
				var bus_name = body.scheduledTrips[i].bus_name;
				var arrival_time = body.scheduledTrips[i].arrival_time;
				var tr = document.createElement("tr");
				var td = document.createElement("td");
				var text = document.createTextNode(
					bus_name + " | Scheduled arrival: " + arrival_time
				);
				td.appendChild(text);
				tr.appendChild(td);
				wrapper.appendChild(tr);
			}
		}
		if (payloadEmpty) {
			wrapper = document.createElement("div");
			var text = this.config.responseReceived
				? "No Upcoming Arrivals"
				: "Finding Bus Arrival Times...";
			wrapper.appendChild(
				document
					.createElement("p")
					.appendChild(document.createTextNode(text))
			);
		}
		return wrapper;
	},
	socketNotificationReceived: function (notification, payload) {
		Log.log("MMM-AT-Bus socket received from Node Helper");
		if (notification == "AT_GETREQUEST_RESULT") {
			this.text = payload;
			this.config.responseReceived = true;
			this.updateDom();
		}
	}
});
