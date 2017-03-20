var helpText = '<p>Help!</p>';

function showHelp() {
  document.getElementById('infopane').innerHTML = helpText;
}

/* DATE FUNCTIONS FOR TIMELINE SLIDER */
var timelineGranularities = { 'daily': true, 'monthly': false, 'yearly': false };
var timelineGranularity = 'daily';

// Create a new date from a string, return as a timestamp.
function timestamp(str){
    return new Date(str).getTime();   
}

var
  weekdays = [
    "Sunday", "Monday", "Tuesday",
    "Wednesday", "Thursday", "Friday",
    "Saturday"
  ],
  months = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
  ];

// Create a string representation of the date.
function formatDate ( date ) {
  if (timelineGranularity == 'daily') {
    return weekdays[date.getDay()] + ", " +
        date.getDate() + " " +
        months[date.getMonth()] + " " +
        date.getFullYear();
  } else if (timelineGranularity == 'monthly') {
    return months[date.getMonth()] + " " +
        date.getFullYear();
  } else { // if (timelineGranularity == 'yearly')
    return date.getFullYear();
  }

}

// Other basic functions for working with dates
function incrementDay(inputDate) {
  var thisDate = new Date(inputDate.getTime());
  thisDate.setDate(thisDate.getDate() + 1);
  return thisDate;
}
function incrementMonth(inputDate) {
  if (inputDate.getMonth() == 11) {
    return new Date(inputDate.getFullYear() + 1, 0, 15);
  } else {
    return new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 15);
  }
}
function incrementYear(inputDate) {
  return new Date(inputDate.getFullYear() + 1, 2, 15);
}
// Useful when advancing the timeline by months or years
function stepDateByGranularity(inputDate) {
  if (timelineGranularity == "yearly")
    return incrementYear(inputDate);
  else if (timelineGranularity == "monthly")
    return incrementMonth(inputDate);
  else // if (timelineGranularity == "daily")
    return incrementDay(inputDate);
}

// Generate a string representation of the date in NewsScape format (YYYY-MM-DD)
function formatFileDate ( date ) {
  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
  var dd  = date.getDate().toString();

  if (timelineGranularity == 'daily')
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
  else if (timelineGranularity == 'monthly')
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]);
  else //if (granularity == 'yearly')
    return yyyy 
}

/* Timeline globals */
var dateSlider, datePips;
var lastTimeString = '';
var range_all_sliders = {
  'min': [ timestamp('2004-01-10T00:00:00') ],
  'max': [ timestamp('2017-01-10T00:00:00') ]
};
sliderValue = timestamp('2007-01-02T00:00:01');
var firstDate = new Date(sliderValue);
var firstUpdate = false;
var playing = false;

var dayMS = 60 * 60 * 24 * 1000;

/* Map globals */
var width, tooltip, g, zoom, height, projection, path, graticule, svg, attributeArray = [];
var showCentroids = false;

function setMap() {

  width = 960, height = 500;  // map width and height, matches 

  projection = d3.geo.eckert5()   // define our projection with parameters
    .scale(170)
    //.translate([width / 2, height / 2])
    .precision(.1);

  path = d3.geo.path()  // create path generator function
      .projection(projection);  // add our define projection to it

  graticule = d3.geo.graticule(); // create a graticule

  svg = d3.select("#map").append("svg")   // append a svg to our html div to hold our map
      .attr("width", width)
      .attr("height", height);

  tooltip = d3.select('#map').append('div')
      .attr('class', 'hidden tooltip');

  g = svg.append("g");

  g.append("defs").append("path")   // prepare some svg for outer container of svg elements
      .datum({type: "Sphere"})
      .attr("id", "sphere")
      .attr("d", path);

  g.append("use")   // use that svg to style with css
      .attr("class", "stroke")
      .attr("xlink:href", "#sphere");

  g.append("path")    // use path generator to draw a graticule
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", path);

  loadMapData();
}

function loadMapData() {

  queue()   // queue function loads all external data files asynchronously 
    .defer(d3.json, "world-topo.json")  // our geometries
    .await(drawMap);   // once all files are loaded, 

}

/* These arrays store all place mentions for the current time range */
var allCountries = {};
var allPlaces = {};
/* These are just used to get the min and max values for the viz parameters */
var allPlaceCounts = [];
var allCountryCounts = [];

function processDate(forceUpdate) {

  if (forceUpdate === undefined)
    forceUpdate = false;

  allCountries = {};
  allPlaces = {};
  allPlaceCounts = [];
  allCountryCounts = [];

  // XXX This needs to happen after the map is drawn, otherwise the dots
  // are behind the base images

  var thisDate = new Date(firstDate.getTime());
    
  var dateValues = document.getElementById('date-values');
  var newHTML = '<p>' + formatDate(firstDate);
  newHTML += '</p>';
  dateValues.innerHTML = '<h3>' + newHTML + '</h3>';
  
  var timeQueue = queue();

  timeString = "json/" + formatFileDate(thisDate) + ".json";

  if ((timeString == lastTimeString) && (forceUpdate == false))
    return;
  lastTimeString = timeString;

  timeQueue.defer(d3.json, timeString);
  timeQueue.await(processAllTimes);

}

function processAllTimes(error, timeData) {
  if (error) return void console.error(error); 
  if (!error) {
    processTimeData(timeData);
    visualizePlaceData();
  }
}

function processTimeData(data) {

  var thisAllPlaces = data.netPlaces;

  for (var network in thisAllPlaces) {
    //network = thisAllPlaces[n];
    if ((!(network in selectedNetworks)) || (selectedNetworks[network] === false))
      continue;
    for (var coords in thisAllPlaces[network]) {
      place = thisAllPlaces[network][coords];
      countryID = place.country;
    
      if (countryID in allCountries) {
        allCountries[countryID]['count'] += +place.count;
      } else {
        allCountries[countryID] = {};
        allCountries[countryID]['count'] = +place.count;
        allCountries[countryID]['name'] = place.countryName;
       
      }
      if (coords in allPlaces) {
        allPlaces[coords]['count'] += +place.count;
        if ('networks' in allPlaces[coords]) {
          if (network in allPlaces[coords]['networks']) {
            allPlaces[coords]['networks'][network] += +place.count;
          } else {
            allPlaces[coords]['networks'][network] = +place.count;
          }
        } else {
          allPlaces[coords]['networks'] = { network: +place.count };
       }
      } else {
        allPlaces[coords] = {};
        allPlaces[coords]['count'] = +place.count;
        allPlaces[coords]['lat'] = place.lat;
        allPlaces[coords]['lon'] = place.lon;
        allPlaces[coords]['type'] = place.type;
        allPlaces[coords]['name'] = place.name;
        allPlaces[coords]['newtorks'] = { network: +place.count };
      }
    }
  }
 
  for (var c in allCountries) {
    if (!(allCountries[c]['count'] in allCountryCounts))
      allCountryCounts.push(+allCountries[c]['count']);
  }
  for (var p in allPlaces) {
    if (!(allPlaces[p]['count'] in allPlaceCounts))
      allPlaceCounts.push(+allPlaces[p]['count']);
  }
}

function visualizePlaceData() {

  var placeCountRange = [Math.min.apply(Math, allPlaceCounts), Math.max.apply(Math, allPlaceCounts)];
  var countryCountRange = [Math.min.apply(Math, allCountryCounts), Math.max.apply(Math, allCountryCounts)];

  var placesArray = [];
  for (var p in allPlaces) {
    placesArray.push(allPlaces[p]);
  }

  g.selectAll("circle").remove();

  g.selectAll("circle")
    .data(placesArray).enter()
    .append("circle")
    .attr("cx", function (d) { return projection([d.lon,d.lat])[0]; })
    .attr("cy", function (d) { return projection([d.lon,d.lat])[1]; })
    .attr("r", function (d) { 
      if ((showCentroids == false) && (d.type == "Country")) {
        return "0px";
      } else {
        return getRadius(d.count, placeCountRange) + "px";
      }
    })
    .attr('opacity', function(d) { 
      var opacity = getInverseColor(d.count, placeCountRange);
      return opacity;
    })
    .attr("fill", "red")
    .on('mousemove', function(d) {
      d3.select(this).style("stroke", "black");
      d3.select(this).style("stroke-width", "1px");
      d3.select(this).style("stroke-opacity", "1");
      var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
      });
      tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) +
        'px; top:' + (mouse[1] - 35) + 'px')
        .html(d.name + ": " + d.count);
      })
      .on('mouseout', function() {
        tooltip.classed('hidden', true);
        d3.select(this).style("stroke-opacity", "0");
      });
  
  d3.selectAll('.country')  // select all the countries
    .attr('style', function(d) {
      countryID = d.properties.id;
      if (countryID in allCountries) {
        return 'fill:darkblue';
      }
    })
    .attr('fill-opacity', function(d) {
      countryID = d.properties.id;
      if (countryID in allCountries) {
        thisColor = getColor(allCountries[countryID]['count'], countryCountRange);
        return thisColor;
      }
      return getColor(1, countryCountRange);
    })
    .on('mousemove', function(d) {
      var countryID = d.properties.id;
      if (countryID in allCountries) {
        var countryName = allCountries[countryID]['name'];
        var countryCount = allCountries[countryID]['count'];
      } else {
        return;
        //countryName = countryID;
        //countryCount = 0;
      }
      d3.select(this).style("stroke", "red");
      var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
      });
      tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) +
        'px; top:' + (mouse[1] - 35) + 'px')
        .html(countryName + ": " + countryCount);
      })
      .on('mouseout', function() {
        d3.select(this).style("stroke", "black");
        tooltip.classed('hidden', true);
      });
}

function drawMap(error,world) {

  g.selectAll(".country")   // select country objects (which don't exist yet)
    .data(topojson.feature(world, world.objects.countries).features)  // bind data to these non-existent objects
    .enter().append("path") // prepare data to be appended to paths
    .attr("class", "country") // give them a class for styling and access later
    .attr("id", function(d) { return "code_" + d.properties.id; }, true)  // give each a unique id for access later
    .attr("d", path); // create them using the svg path generator defined above

// zoom and pan
  zoom = d3.behavior.zoom()
  .on("zoom",function() {
    g.attr("transform","translate("+ 
      d3.event.translate.join(",")+")scale("+d3.event.scale+")");
    g.selectAll("circle")
      .attr("d", path.projection(projection));
    g.selectAll("path")  
      .attr("d", path.projection(projection)); 

  });

  svg.call(zoom);

  /* Draw the date slider -- THIS MUST HAPPEN AFTER THE MAP IS DRAWN */
  drawSlider(sliderValue);

}

function getColor(valueIn, valuesIn) {

  var color = d3.scale.log() // create a log scale
    .domain([valuesIn[0],valuesIn[1]])  // input uses min and max values
    .range([.3,1]);   // output for opacity between .3 and 1 %

  return color(valueIn);  // return that number to the caller
}

function getInverseColor(valueIn, valuesIn) {
  
  var color = d3.scale.linear() // create a log scale
    .domain([valuesIn[0],valuesIn[1]])  // input uses min and max values
    .range([.01,.5]);   // output for opacity

    return 1 - color(valueIn);

}

function getRadius(valueIn, valuesIn) {

  var radius = d3.scale.linear() // create a linear scale
    .domain([valuesIn[0],valuesIn[1]])  // input uses min and max values
    .range([1,10]); 

  radiusVal = radius(valueIn);
  if (radiusVal < 0) {
    return 0;
  }

  return Math.min(20, radiusVal);  // return that number to the caller
}

// PMB: currently not used
function getDataRange() {
  // function loops through all the data values from the current data attribute
  // and returns the min and max values

  var min = Infinity, max = -Infinity;  
  d3.selectAll('.country')
    .each(function(d,i) {
      var currentValue = d.properties[attributeArray[currentAttribute]];
      if(currentValue <= min && currentValue != -99 && currentValue != 'undefined') {
        min = currentValue;
      }
      if(currentValue >= max && currentValue != -99 && currentValue != 'undefined') {
        max = currentValue;
      }
  });
  return [min,max];  //boomsauce
}

function toggleCentroids(cbox) {

  var boxID = cbox.id;
  var boxName = cbox.name;

  if (cbox.checked == false) {
    showCentroids = false;
  } else {
    showCentroids = true;
  }

  processDate(true);

}

function toggleRange(cbox) {

  var boxID = cbox.id;
  var boxName = cbox.name;

  if (cbox.checked == false) {
    dateSlider.noUiSlider.destroy();
    drawSlider(sliderValue);
  } else {
    dateSlider.noUiSlider.destroy();

    drawSlider(sliderValue);
  }
  processDate();
}

var selectedNetworks = [];

function initialize() {

  //showHelp();
 
  /* Begin with all networks selected */ 
  for (var n in networkColors) {
    selectedNetworks[n] = true;
  }
  
  /* Draw the map (and subsequently the slider) */
  setMap();

  animateMap();
  
}

function drawSlider(inputValue) {

  dateSlider = document.getElementById('slider-date');

  sliderProperties = {
    range: range_all_sliders,
    start: inputValue,

    snap: false,

    pips: {
      mode: 'count',
      values: 13,
      density: 13,
      format: {
        to: function ( value ) {
          thisDate = new Date(+value);
          return thisDate.getFullYear();
        },
        from: function ( value ) {
          thisDate = Date(value, 1, 1);
          return thisDate.year;
        }
      }
    },

    format: wNumb({
      decimals: 0
    })
  };

  noUiSlider.create(dateSlider, sliderProperties);
  
  dateSlider.noUiSlider.on('update', function( inputVal, handle ) {

    var inputDate = new Date(+inputVal);

    firstDate = new Date(+inputVal);
    
    // Visualize the date range
    processDate();

  });

}

function toggleAllNetworks(cbox) {

  var boxID = cbox.id;
  var boxName = cbox.name;

  for (var n in networkColors) {
    checkBox = document.getElementById(n);
    if (cbox.checked == true) {
      if (checkBox.checked == false)
        checkBox.checked = true;
    } else {
      if (checkBox.checked == true)
        checkBox.checked = false;
    }
    networkClicked(checkBox);
  }

}

function networkClicked(cbox) {

  var networkID = cbox.id;
  if (cbox.checked) {
    selectedNetworks[networkID] = true;
  } else {
    selectedNetworks[networkID] = false;
  }
  processDate(true);
}

function changeTimelineGranularity(cbox) {

  var granularity = cbox.id;

  if (cbox.checked) {
    if (timelineGranularities[granularity] == true) {
      cbox.checked = true;
      return;
    }
    timelineGranularities[granularity] = true;
    for (var t in timelineGranularities) {
      if (granularity != t) {
        timelineGranularities[t] = false;
        document.getElementById(t).checked = false;
      }
    }
    timelineGranularity = granularity;
    processDate(true);
  } else {
    if (timelineGranularities[granularity] == true) {
      cbox.checked = true;
      return;
    }
    cbox.checked = true;
    for (var t in timelineGranularities) {
      if (t != granularity) {
        timelineGranularities[t] = false;
        document.getElementById(t).checked = false;
      }
    }
  }

}

function animateMap() {

  var timer;  // create timer object
  d3.select('#play')  
    .on('click', function() {  // when user clicks the play button
      if(playing == false) {  // if the map is currently playing
        timer = setInterval(function(){   // set a JS interval
          finalDate = new Date(range_all_sliders['max'][0]);
          if(firstDate.getTime() < finalDate.getTime()) {
            var nextDate = stepDateByGranularity(firstDate);

            dateSlider.noUiSlider.set([nextDate.getTime() + 1]);
          }
        }, 400);
      
        d3.select(this).html('Stop');  // change the button label to stop
        playing = true;   // change the status of the animation
      } else {    // else if is currently playing
        clearInterval(timer);   // stop the animation by clearing the interval
        d3.select(this).html('Play');   // change the button label to play
        playing = false;   // change the status again
      }
  });
}

function getContrastYIQ(hexcolor){
  var r = parseInt(hexcolor.substr(1,2),16);
  var g = parseInt(hexcolor.substr(3,2),16);
  var b = parseInt(hexcolor.substr(5,2),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

networkColors = [];

networkColors['US_CNN'] = "#D8BF92";
networkColors['US_FOX-News'] = "#FFFF00";
networkColors['US_MSNBC'] = "#F4A460";
networkColors['US_AlJazeera'] = "#DC143C";
networkColors['US_KABC'] = "#FFD700";
networkColors['US_KCAL'] = "#FF8C00";
networkColors['US_KCBS'] = "#FF7F50";
networkColors['US_KCET'] = "#FF4500";
networkColors['US_KOCE'] = "#FF0000";
networkColors['US_KNBC'] = "#FF00FF";
networkColors['US_KTLA'] = "#FF69B4";
networkColors['US_KTTV-FOX'] = "#B22222";
networkColors['US_WEWS'] = "#DDA0DD";
networkColors['US_WKYC'] = "#B0C4DE";
networkColors['US_WOIO'] = "#87CEEB";
networkColors['US_WUAB'] = "#ADFF2F";
networkColors['US_WWW'] = "#708090";
networkColors['QA_AlJazeera'] = "#FF69B4";
networkColors['JP_KCET'] = "#90EE90";
networkColors['IL_KCET'] = "#808000";
networkColors['UK_KCET'] = "#6A6ACD";
networkColors['DE_KCET'] = "#006400";
networkColors['FR_KCET'] = "#7FFF00";
networkColors['US_HBO'] = "#556B2F";
networkColors['US_ComedyCentral'] = "#696969";
networkColors['US_HLN'] = "#2F4F4F";
networkColors['US_Current'] = "#000080";
networkColors['US_CSPAN'] = "#020202";
networkColors['RU_WWW'] = "#800080";
