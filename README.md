# MMM-AT-Bus
This an extension for the [MagicMirror](https://github.com/MichMich/MagicMirror). It will display the minutes until arrival of a selected bus number to a selected stop. The bus number and stop code can be configured in the config file. To use this module you will need to create a free Auckland Transport Developer Portal account.

### Example shown top left:
![MMM-AT-Bus Module Example](https://github.com/Estanz0/MMM-AT-Bus/blob/master/resources/MMM-AT-Bus_Stop_Bus.png?raw=true)

## Installation
1. Navigate into your MagicMirror's `modules` folder 
2. Execute `git clone https://github.com/Estanz0/MMM-AT-Bus.git`
3. Navigate to newly created folder `MMM-AT-Bus`
4. Execute `npm install` ???

Using the module
Add the below to the modules array in the `config/config.js` file:
````javascript
modules: [
    {
        module: 'MMM-AT-Bus',
        position: 'top_left',	
        config: {
            bus: '755', 
            stopCode: '7661', 
            key: 'key'          // AT Developer key (https://dev-portal.at.govt.nz/)
        }
    }
]
````
## Configuration options

The following properties can be configured:


<table width="100%">
	<!-- why, markdown... -->
	<thead>
		<tr>
			<th>Option</th>
			<th width="100%">Description</th>
		</tr>
	<thead>
	<tbody>
		<tr>
			<td><code>bus</code></td>
            <td>The bus route number or code. 
                </br>
                Find your bus route via the AT <a href="https://at.govt.nz/bus-train-ferry/more-services/at-mobile-app/">app</a> or <a href="https://at.govt.nz/bus-train-ferry/timetables/#bus">website</a>.
			</td>
		</tr>
		<tr>
			<td><code>stopCode</code></td>
			<td>The bus stop code. 
                </br>
                This can be found using the AT app, website or Google maps.
            </td>
		</tr>
        <tr>
			<td><code>key</code></td>
			<td>A developer API key for AT APIs. 
                </br>
                This can be obtained by signing up for a developer account through the <a href="https://dev-portal.at.govt.nz/">AT developer portal</a>.
                </br>
                Note: it can take a few days for your developer account to be activated after signing up.
            </td>
		</tr>
	</tbody>
</table>

### Finding bus route and stop
AT app:
- Go to live departures and select a stop from the map.
- Bus route can be seen on the left hand side.
- Stop code can be found up the top.

<img src="https://github.com/Estanz0/MMM-AT-Bus/blob/master/resources/AT_app.jpg" width="350" alt="AT App">

### More Demo Images
#### Loading Screen
<img src="https://github.com/Estanz0/MMM-AT-Bus/blob/master/resources/MMM-AT-Bus_Loading.png" width="800" alt="Loading">

#### Bus and Stop Code configured
<img src="https://github.com/Estanz0/MMM-AT-Bus/blob/master/resources/MMM-AT-Bus_Stop_Bus.png" width="800" alt="Loading">

#### Only Stop Code configured
<img src="https://github.com/Estanz0/MMM-AT-Bus/blob/master/resources/MMM-AT-Bus_Stop.png" width="800" alt="Loading">

## Check out the other modules here
[3rd party Magic Mirror modules](https://github.com/MichMich/MagicMirror/wiki/3rd-Party-Modules)
