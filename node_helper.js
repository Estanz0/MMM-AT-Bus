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
		this.ATGetRequest(payload.bus, payload.stopCode, payload.key);
	},

	ATGetRequest: function(bus, stopCode, key) {
		var self = this;
		var payload = {};

		apiCalls = async () => {
			// Get stop by code
			const stop = await apiCall('general', 'stops/stopCode/', stopCode);

			// Get rotes by stop
			// const routes = await apiCall('general', 'routes/stopid/', stop[0].stop_id)

			// Get stop time by stop
			const stopTimes = await apiCall('general', 'stopTimes/stopId/', stop[0].stop_id);
			let recentStopTimes = filterStopTimes(stopTimes, 300, 1800);

			// Get trip updates for trips
			const tripUpdates = await getTripUpdates(recentStopTimes);
			
			var timeArr = []
			// Determine if trip is active and esimated arrival time
			for(let i = 0; i < recentStopTimes.length; i++) {
				let stopTime = recentStopTimes[i];
				let tripUpdate = findTripUpdate(tripUpdates, stopTime.trip_id);
				// No trip update means the trip is not is progress
				if(tripUpdate && tripUpdate.entity[0].trip_update.stop_time_update) {
					let stopTimeUpdate = tripUpdate.entity[0].trip_update.stop_time_update;
					// arrival / departure tag is interchangeable for busses
					var departureUpdate = Object.keys(stopTimeUpdate).includes("arrival") ? stopTimeUpdate.arrival : stopTimeUpdate.departure;
					
					// check if bus has passed our stop
					if(stopTime.stop_sequence > stopTimeUpdate.stop_sequence) {
						let deltaArrivalTime = getDeltaTime(stopTime.arrival_time_seconds, departureUpdate.delay);
						timeArr.push(bus + ' | Arriving in: ' + deltaArrivalTime + ' minutes');
						// payload.timeArr.push(bus + ' | Arriving in: ' + deltaArrivalTime + ' minutes');
						// console.log(bus + ' | Arriving in: ' + deltaArrivalTime + ' minutes')
					}
				} else {
					// payload.timeSch = bus + ' | Arriving in: ' + deltaArrivalTime + ' minutes';
					payload.timeSch = bus + ' | Scheduled arrival: ' + stopTime.arrival_time;
				}
			}
			payload.timeArr = timeArr;
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
				return (stopTime.arrival_time_seconds >= lowerTime && stopTime.arrival_time_seconds <= upperTime);
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

		function findRoute(route) {
			return route.route_short_name === bus;
		}

		function findStop(stop) {
			return stop.stop_code === stopCode;
		}

		function getDeltaTime(scheduledTime, delay) {
			let now = new Date();
			let nowSeconds = getTimeInSeconds(now);
			let delta = (scheduledTime + delay) - nowSeconds;
			return secondsToMinutes(delta);

		}

		apiCalls();
	}
});