/* Magic Mirror
 * Node Helper: MMM-AT-Bus
 * Byrons Smith
 */

const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

const api_config = {
	AT: {
		name: "Auckland Transport",
		header_key: "Ocp-Apim-Subscription-Key",
		endpoints: {
			gtfs_static: {
				url: "https://api.at.govt.nz/gtfs/v3",
				routes: {
					endpoint: "/routes",
					query_param_keys: [],
					data_location: ["data"],
					record_location: ["attributes"]
				},
				stops: {
					endpoint: "/stops",
					query_param_keys: ["filter[stop_code]"],
					data_location: ["data"],
					record_location: ["attributes"]
				},
				stop_trips: {
					endpoint: "/stops/{{id}}/stoptrips",
					query_param_keys: [
						"filter[date]",
						"filter[start_hour]",
						"filter[hour_range]"
					],
					data_location: ["data"],
					record_location: ["attributes"]
				},
				stop_times: {
					endpoint: "/trips/{{id}}/stoptimes",
					query_param_keys: [],
					data_location: ["data"],
					record_location: ["attributes"]
				}
			},
			gtfs_realtime: {
				url: "https://api.at.govt.nz/realtime/legacy",
				trip_updates: {
					endpoint: "/tripupdates",
					query_param_keys: ["tripid"],
					data_location: ["response", "entity"],
					record_location: ["trip_update"]
				}
			}
		}
	},
	Metlink: {
		name: "Metlink",
		header_key: "x-api-key",
		endpoints: {
			gtfs_static: {
				url: "https://api.opendata.metlink.org.nz/v1/gtfs",
				routes: {
					endpoint: "/routes",
					query_param_keys: [],
					data_location: [],
					record_location: []
				},
				stops: {
					endpoint: "/stops",
					query_param_keys: [],
					data_location: [],
					record_location: []
				},
				stop_trips: {
					endpoint: "/stops/{{id}}/stop_times",
					query_param_keys: ["date"],
					data_location: ["stop_times"]
				},
				stop_times: {
					endpoint: "/trips/{{id}}/stoptimes",
					query_param_keys: [],
					data_location: ["stop_times"]
				}
			},
			gtfs_realtime: {
				url: "https://api.opendata.metlink.org.nz/v1/gtfs-rt",
				trip_updates: {
					endpoint: "/tripupdates",
					query_param_keys: ["tripid"],
					data_location: ["entity"]
				}
			}
		}
	},
	Metro: {
		name: "Metro"
	}
};

module.exports = NodeHelper.create({
	// Subclass start method.
	start: function () {
		console.log("Started node_helper.js for MMM-AT-Bus.");
	},

	socketNotificationReceived: function (notification, payload) {
		console.log(
			this.name +
				" node helper received a socket notification: " +
				notification
		);
		this.ATGetRequest(payload);
	},

	ATGetRequest: function (configPayload) {
		const provider_name = configPayload.provider;
		const routeShortNames = configPayload.routeShortNames;
		const stopCode = configPayload.stopCode;
		const key = configPayload.key;
		const forwardLimitHours = +configPayload.forwardLimitHours;
		var stopName = configPayload.stopName;
		var stopId = configPayload.stopId;
		var routeIdToShortName = configPayload.routeIdToShortName;

		var self = this;
		var payload = {};

		apiCalls = async () => {
			// Todays Date and Time
			var today = new Date();

			// Get route ids
			var routeIds = null;
			if (routeIdToShortName) {
				routeIds = Object.keys(routeIdToShortName);
				if (routeIds.length === 0) {
					routeIds = null;
				}
			}

			// Stop Name and Stop ID
			if (!stopName || !stopId) {
				var stopDetails = await apiCall(
					(provider = provider_name),
					(api_name = "gtfs_static"),
					(endpoint_name = "stops"),
					(query_param_values = [stopCode]),
					(ids = [])
				);

				stopDetails = stopDetails.filter(function (stop) {
					return stop.stop_code === stopCode;
				});

				stopName = stopDetails[0].stop_name;
				stopId = stopDetails[0].stop_id;
			}

			// Routes
			if (!routeIds) {
				var routes = await apiCall(
					(provider = provider_name),
					(api_name = "gtfs_static"),
					(endpoint_name = "routes"),
					(query_param_values = []),
					(ids = [])
				);

				if (routeShortNames) {
					routes = routes.filter(function (route) {
						return routeShortNames.includes(route.route_short_name);
					});
				}

				routeIds = routes.map(function (route) {
					return route.route_id;
				});
			}

			// Get upcoming trips for the Stop
			var allTrips = await apiCall(
				(provider = provider_name),
				(api_name = "gtfs_static"),
				(endpoint_name = "stop_trips"),
				(query_param_values = [
					today.toISOString().split("T")[0],
					today.getHours(),
					forwardLimitHours
				]),
				(ids = [stopId])
			);

			// Filter trips by route
			var trips = allTrips.filter(function (trip) {
				return routeIds.includes(trip.route_id);
			});

			// Get stop times for trips
			for (let i = 0; i < trips.length; i++) {
				// prettier-ignore
				var stopTimes = await apiCall(
					(provider = provider_name),
					(api_name = "gtfs_static"),
					(endpoint_name = "stop_times"),
					(query_param_values = []),
					(ids = [trips[i].trip_id])
				);

				// Filter stop times by stop
				stopTimes = stopTimes.filter(function (stopTime) {
					return stopTime.stop_id === stopId;
				});

				trips[i].stop_time = stopTimes[0];
			}

			// Get trip updates
			var tripIds = trips.map(function (trip) {
				return trip.trip_id;
			});

			var tripUpdates = await apiCall(
				(provider = provider_name),
				(api_name = "gtfs_realtime"),
				(endpoint_name = "trip_updates"),
				(query_param_values = [tripIds]),
				(ids = [])
			);

			// Add trip updates to trips
			for (let i = 0; i < trips.length; i++) {
				trips[i].trip_update = tripUpdates.find(function (tripUpdate) {
					return trips[i].trip_id == tripUpdate.trip.trip_id;
				});
			}

			// Create route_id -> short_name map
			var routeIdToShortNameList = routes.map(function (route) {
				return {
					[route.route_id]: route.route_short_name
				};
			});
			var routeIdToShortName = Object.assign(
				{},
				...routeIdToShortNameList
			);

			// Get arrival times
			var scheduledTrips = [];
			var inProgressTrips = [];
			for (let i = 0; i < trips.length; i++) {
				var trip = trips[i];
				if (!trip.trip_update) {
					scheduledTrips.push({
						bus_name: routeIdToShortName[trip.route_id],
						arrival_time: trip.stop_time.arrival_time
					});
				} else {
					if (
						trip.trip_update.stop_time_update.stop_sequence <=
						trip.stop_time.stop_sequence
					) {
						// Use departure time if no arrival time given
						var event = trip.trip_update.stop_time_update.arrival
							? trip.trip_update.stop_time_update.arrival
							: trip.trip_update.stop_time_update.departure;

						var [hours, minutes, seconds] =
							trip.stop_time.arrival_time.split(":").map(Number);
						const scheduled_arriaval_time_date = new Date();
						scheduled_arriaval_time_date.setHours(hours);
						scheduled_arriaval_time_date.setMinutes(minutes);
						scheduled_arriaval_time_date.setSeconds(seconds);
						var scheduled_arriaval_time_seconds = Math.floor(
							scheduled_arriaval_time_date.getTime() / 1000
						);

						var delay = event.delay;
						var arrival_time =
							scheduled_arriaval_time_seconds + delay;
						var nowSeconds = Math.floor(today.getTime() / 1000);

						inProgressTrips.push({
							bus_name: routeIdToShortName[trip.route_id],
							minutes_to_arrival: Math.floor(
								(arrival_time - nowSeconds) / 60
							)
						});
					}
				}
			}

			payload.inProgressTrips = inProgressTrips;
			payload.scheduledTrips = scheduledTrips;
			payload.stopName = stopName;
			payload.provider_name = api_config[provider_name].name;
			self.sendSocketNotification("AT_GETREQUEST_RESULT", payload);
		};

		async function apiCall(
			provider,
			api_name,
			endpoint_name,
			query_param_values,
			ids
		) {
			var url = api_config[provider].endpoints[api_name].url;
			var endpoint_config =
				api_config[provider].endpoints[api_name][endpoint_name];

			var endpoint = endpoint_config.endpoint;
			for (let i = 0; i < ids.length; i++) {
				endpoint = endpoint.replace("{{id}}", ids[i]);
			}

			var query_params = "";
			var query_param_keys = endpoint_config.query_param_keys;
			if (query_param_keys.length > 0) {
				query_params += "?";
				for (let i = 0; i < query_param_keys.length; i++) {
					query_params +=
						query_param_keys[i] + "=" + query_param_values[i];
					if (i < query_param_keys.length - 1) {
						query_params += "&";
					}
				}
			}

			var fullUrl = url + endpoint + query_params;
			var headers = { [api_config[provider].header_key]: key };

			// console.log("fullUrl: ", fullUrl);
			// console.log("headers: ", headers);

			return fetch(fullUrl, {
				method: "GET",
				headers: headers
			})
				.then((response) => response.json())
				.then((json) => {
					var data;
					if (endpoint_config.data_location.length === 0) {
						data = json;
					} else {
						data = json[endpoint_config.data_location[0]];
					}

					for (
						let i = 1;
						i < endpoint_config.data_location.length;
						i++
					) {
						data = data[endpoint_config.data_location[i]];
					}

					var records = data.map(function (record) {
						var record_data = record;
						for (
							let i = 0;
							i < endpoint_config.record_location.length;
							i++
						) {
							record_data =
								record_data[endpoint_config.record_location[i]];
						}
						return record_data;
					});

					return records;
				})
				.catch((err) => {
					return err;
				});
		}

		apiCalls();
	}
});
