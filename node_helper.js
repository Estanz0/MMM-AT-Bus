/* Magic Mirror
 * Node Helper: MMM-AT-Bus
 * Byrons Smith
 */

const NodeHelper = require("node_helper");
const fetch = require('node-fetch');

module.exports = NodeHelper.create({
	// Subclass start method.
	start: function() {
		console.log("Started node_helper.js for MMM-AT-Bus.");
	},

	socketNotificationReceived: function(notification, payload) {
		console.log(this.name + " node helper received a socket notification: " + notification);
		this.ATGetRequest(payload);
	},

	ATGetRequest: function(configPayload) {
		const bus = configPayload.bus;
		const stopCode = configPayload.stopCode;
		const key = configPayload.key;
		const forwardLimit = +configPayload.forwardLimit;
		const backLimit = +configPayload.backLimit;
		var stopName = configPayload.stopName;

		var self = this;
		var payload = {};

		apiCalls = async () => {
			if (!stopName) {
				var stopDetails = await apiCall('general', 'stops/stopCode/', stopCode)
				stopName = stopDetails[0].stop_name;
			}

			var stopTimes = await apiCall('general', 'stops/stopInfo/', stopCode)
			if(bus) {
				stopTimes = filterStopTimesByBus(stopTimes, bus);
			}

			stopTimes = filterStopTimes(stopTimes, backLimit, forwardLimit);

			// Get trip updates for trips
			const tripUpdates = await getTripUpdates(stopTimes);
			
			// Arrays for payload
			var timeArr = []
			var timeSch = []
			
			// Determine if trip is active and esimated arrival time
			for(let i = 0; i < stopTimes.length; i++) {
				let stopTime = stopTimes[i];
				let tripUpdate = findTripUpdate(tripUpdates, stopTime.trip_id);

				// No trip update means the trip is not is progress
				if(tripUpdate && tripUpdate.entity[0].trip_update.stop_time_update) {
					let stopTimeUpdate = tripUpdate.entity[0].trip_update.stop_time_update;

					// arrival / departure tag is interchangeable for busses
					var departureUpdate = Object.keys(stopTimeUpdate).includes("arrival") ? stopTimeUpdate.arrival : stopTimeUpdate.departure;
					
					// check if bus has passed our stop
					if(stopTime.stop_sequence > stopTimeUpdate.stop_sequence) {
						var arrTime = getTimeInSecondsStr(stopTime.departure_time);
						let deltaArrivalTime = getDeltaTime(arrTime, departureUpdate.delay);

						var arrival_time = {
							bus: stopTime.route_short_name,
							time_minutes: deltaArrivalTime
						};

						timeArr.push(arrival_time);
					}
				} else {
					var arrival_time = {
						bus: stopTime.route_short_name,
						time: stopTime.departure_time
					}
					timeSch.push(arrival_time);
				}
			}
			payload.timeArr = timeArr;
			payload.timeSch = timeSch;
			payload.stopName = stopName;
			// createDOM(payload);
			self.sendSocketNotification('AT_GETREQUEST_RESULT', payload);
		}

		async function apiCall(feed, urlExt, id) {
			let url = 'https://api.at.govt.nz/v2/';
			if(feed === 'general') {
				url += 'gtfs/';
			} else if(feed === 'realtime')  {
				url += 'public/realtime/';
			}
			url += urlExt + id
			return fetch(url, {
				method: "GET",
				headers: {"Ocp-Apim-Subscription-Key": key}
			})
			.then(response => response.json()) 
			.then(json => {
				return json.response;
			})
			.catch(err => {
				return err;
			});
		}

		async function getTripUpdates(stopTimes) {
			let result;
			let promises = [];
			for(let i = 0; i < stopTimes.length; i++) {
				promises.push(apiCall('realtime', 'tripupdates?tripid=', stopTimes[i].trip_id));
			}
			result =  Promise.all(promises);
			return result
		}

		function filterStopTimes(stopTimes, timeBefore, timeAfter) {
			var now = new Date();
			var timeInSeconds = getTimeInSeconds(now);
			var lowerTime = timeInSeconds - timeBefore;
			lowerTime = lowerTime < 0 ? 86400 + lowerTime : lowerTime;
			var upperTime = timeInSeconds + timeAfter;
			upperTime = upperTime > 86400 ? upperTime - 86400 : upperTime;
			return stopTimes.filter(function(stopTime) {
				var arrTime = getTimeInSecondsStr(stopTime.departure_time);
				return (arrTime >= lowerTime && arrTime <= upperTime);
			});
		}

		function filterStopTimesByBus(stopTimes, bus) {
			return stopTimes.filter(function(stopTime) {
				return (stopTime.route_short_name === bus);
			});
		}

		function findTripUpdate(tripUpdates, stopId) {
			return tripUpdates.find(function(tripUpdate) {
				return (tripUpdate.hasOwnProperty('entity')) && (tripUpdate.entity.length !== 0) && (tripUpdate.entity[0].id === stopId);
			});
		}

		function secondsToMinutes(seconds) {
			return Math.floor(seconds / 60);
		}

		function getTimeInSeconds(date) {
			return (date.getHours() * 3600) + (date.getMinutes() * 60) + date.getSeconds();
		}

		function getTimeInSecondsStr(str) { 
			var a = str.split(':');
			return (+a[0]) * 3600 + (+a[1]) * 60 + (+a[2]); 
		}

		// function findRoute(route) {
		// 	return route.route_short_name === bus;
		// }

		// function findStop(stop) {
		// 	return stop.stop_code === stopCode;
		// }

		function getDeltaTime(scheduledTime, delay) {
			let now = new Date();
			let nowSeconds = getTimeInSeconds(now);
			let delta = (scheduledTime + delay) - nowSeconds;
			return secondsToMinutes(delta);

		}

		apiCalls();
	}
});