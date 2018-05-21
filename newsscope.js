var helpText = '<div style="margin-left:10px"><h3>About the NewsScope</h3>' +
'<p><b>Data source:</b> The NewsScope visualizes data contained in the <a href="http://tvnews.library.ucla.edu">UCLA NewsScape</a>, a collection of television news from U.S. local, national, and inernational sources, digitized and indexed for searching from 2005 to the present.</p>' +
'<p><b>Data processing:</b> References to geographic places in the closed captioning and transcript texts of television programs were identified via the <a href="http://nlp.stanford.edu/software/CRF-NER.shtml">Stanford Named Entity Recognizer</a>. These entities then were used to query a local <a href="http://www.gisgraphy.com/">Gisgraphy</a> server, which indexes place information from the <a href="http://www.geonames.org/">GeoNames</a> and <a href="https://www.openstreetmap.org/">OpenStreetMap</a> open data sets and can return the coordinates of likely place matches in response to text queries. The coordinates of the most likely match for each detected place reference from a TV news program are then plotted on a zoomable world map with available faceting by date and network, using the <a href="https://d3js.org/">D3.js</a> Javascript framework.</p>' +
'<p><b>Development:</b> This mashup was implemented by Peter Broadwell, academic projects developer at the <a href="http://digital.library.ucla.edu">UCLA Digital Library</a>, with gratitude to the developers of the underlying data sources and software tools mentioned above.</p>' +
'<h3>Using the NewsScope</h3>' +
'<p><b>Timeline and network navigation:</b> The time range of the place references on the map is always displayed above the timeline and can be set to day, month, or year granularities. The visualized dates can be changed by clicking or dragging on the timeline, or using the "Play"-"Back"-"Fwd" buttons. Only place matches from the selected networks are shown; these can be selected or deselected via the checkboxes in the siebar.</p>' +
'<p><b>Place visualization:</b> Places mentioned during newscasts on the selected networks during the specified time range are visualized on the map. References to countries and places within the countries are aggregated and used to determine the shading of the country region on the map (more references = darker shading). References to non-country locations are visualized via circles placed at their most likely geographic coordinates, which are scaled according to the number of matches (larger circle = more matches). It is also possible to visualize the number of exlpicit references to countries as scaled circles at an arbitrary centroid within the country; this option is enabled via the "Show country points" checkbox. The "Place counts threshold" slider determines how many references to a given place are necessary for a circle to appear there; increasing this value can help to filter out spurious or irrelevant matches.</p>' +
'<p><b>Map interactivity:</b> It is possible to zoom in/out and pan across the map via gesture navigation. Hovering over or selecting a point or region will display the name of the matched place and the number of matches (if any) occurring on the selected networks within the specified date range.</p>' +
'<p><b>External links:</b> Selecting a matched place point or country centroid (if enabled) will display links to external sites below the map. The sites thus linked show occurrences of the place name within the selected time range and networks in the UCLA NewsScape as well as a concordance interface developed at the Friedrich-Alexander University Erlangen-Nürnberg. Access to these sites requires a subscription or appropriate institutional affiliation.</p>' +
'</div>';

var helpShown = false;

function toggleHelp() {
  if (helpShown == false) {
    var helpDiv = document.createElement('div');
    document.getElementById('contentpane').insertBefore(helpDiv,document.getElementById('contentpane').firstChild);
    helpDiv.id = 'helpDiv';
    helpDiv.class = "col-sm-9 col-md-10";
    helpDiv.innerHTML = helpText;
    helpShown = true;
  } else {
    var divToRemove = document.getElementById('helpDiv')
    document.getElementById('contentpane').removeChild(divToRemove);
    helpShown = false;
  }
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

function incrementDay(inputDate) {
  var thisDate = new Date(inputDate.getTime());
  thisDate.setDate(thisDate.getDate() + 1);
  return thisDate;
}
function decrementDay(inputDate) {
  var thisDate = new Date(inputDate.getTime());
  thisDate.setDate(thisDate.getDate() - 1);
  return thisDate;
}
function incrementMonth(inputDate) {
  if (inputDate.getMonth() == 11) {
    return new Date(inputDate.getFullYear() + 1, 0, 15);
  } else {
    return new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 15);
  }
}
function decrementMonth(inputDate) {
  if (inputDate.getMonth() == 0) {
    return new Date(inputDate.getFullYear() - 1, 11, 15);
  } else {
    return new Date(inputDate.getFullYear(), inputDate.getMonth() - 1, 15);
  }
}
function incrementYear(inputDate) {
  return new Date(inputDate.getFullYear() + 1, 2, 15);
}
function decrementYear(inputDate) {
  return new Date(inputDate.getFullYear() - 1, 2, 15);
}
function stepDateByGranularity(inputDate) {
  if (timelineGranularity == "yearly")
    return incrementYear(inputDate);
  else if (timelineGranularity == "monthly")
    return incrementMonth(inputDate);
  else // if (timelineGranularity == "daily")
    return incrementDay(inputDate);
}
function decrementDateByGranularity(inputDate) {
  if (timelineGranularity == "yearly")
    return decrementYear(inputDate);
  else if (timelineGranularity == "monthly")
    return decrementMonth(inputDate);
  else // if (timelineGranularity == "daily")
    return decrementDay(inputDate);
}

// Generate a string representation of the date in NewsScape format (YYYY-MM-DD)
function formatFileDate ( date, full ) {

  if (full === undefined)
    full = false;
  else
    full = true;

  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
  var dd  = date.getDate().toString();

  if (full || (timelineGranularity == 'daily')) {
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
  } else if (timelineGranularity == 'monthly') {
      return yyyy + '-' + (mm[1]?mm:"0"+mm[0]);
  } else { //if (granularity == 'yearly')
      return yyyy;
  }
}

function filterYears(value, type) {
  //value % 31536000730 ? 1 : 0;
  return 1;
}

/* Timeline globals */
var dateSlider, datePips;
var timelineInterval = 800;
var lastTimeString = '';
var range_all_sliders = {
  'min': [ timestamp('2004-01-10T00:00:00') ],
//  'max': [ timestamp('2017-01-10T00:00:00') ]
  'max': [ timestamp('2018-01-01T00:00:00') ]
};
sliderValue = timestamp('2007-01-02T00:00:01');
//var rangeSliderValues = [ timestamp('2007-01-02T00:00:01'), timestamp('2007-01-02T00:00:01') ];
//var defaultSliderValues = [ timestamp('2007-01-02T00:00:01'), timestamp('2008-01-02T00:00:01') ];
var firstDate = new Date(sliderValue);
//var lastDate = new Date(rangeSliderValues[1]);
var firstUpdate = false;
var playing = false;

var dayMS = 60 * 60 * 24 * 1000;

/* Map globals */
var width, tooltip, g, zoom, height, projection, path, graticule, svg, attributeArray = [];
var showPoints = true;
var showCentroids = false;

function setMap() {

  width = 1360, height = 900;  // map width and height, matches 

  projection = d3.geo.eckert5()   // define our projection with parameters
    .scale(200)
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

  /* TEST: Visualize one day's data */  
  // XXX This needs to happen after the map is drawn, otherwise the dots
  // are behind the base images

  var thisDate = new Date(firstDate.getTime());
//  var endDate = new Date(lastDate.getTime());

//  while (thisDate.getTime() <= endDate.getTime()) {
    
  var dateValues = document.getElementById('date-values');
  var newHTML = '<p>' + formatDate(firstDate);
  newHTML += '</p>';
  dateValues.innerHTML = '<h3>' + newHTML + '</h3>';
  
  var timeQueue = queue();

  timeString = "json/" + formatFileDate(thisDate) + ".json";

  if ((timeString == lastTimeString) && (forceUpdate == false))
    return;
  lastTimeString = timeString;

/*    queue()   // queue function loads all external data files asynchronously
     .defer(d3.json, dayString)
     .await(processAllDays);   // once all files are loaded, call the processData function passing */

  timeQueue.defer(d3.json, timeString);
  timeQueue.await(processAllTimes);

//    thisDate = new Date(thisDate.getTime() + dayMS);
//  }

}

function processAllTimes(error, timeData) {
  if (error) return void console.error(error); 
  if (!error) {
//    for (var i=1; i<arguments.length; i++) {
//      processDayData(arguments[i]);
    processTimeData(timeData);
//    }
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
      if (showPoints == false)
        return "0px";
      if ((showCentroids == false) && (d.type == "Country")) {
        return "0px";
      }
      if (d.count < pointThreshold) {
        return "0px";
      }
      return getRadius(d.count, placeCountRange) + "px";
    })
    .attr('opacity', function(d) { 
      var opacity = getInverseColor(d.count, placeCountRange);
      return opacity;
    })
    .attr("fill", "red")
    .on('click', function(d) {
      var channelList = listSelectedNetworks();
      // http://sita.ucla.edu/dispatcher.cgi?text=New%20York%City&startddate=2015-01-01&enddate=2015-01-03&channellist=CBS,KCBS,KCET,KOCE
      // http://tvnews.library.ucla.edu/search?search=%22new+york%22&start=03%2F27%2F2014&end=03%2F08%2F2016&network=ComedyCentral&network_series=
      if (timelineGranularity == "monthly") {
        var startDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
        var startDay = formatFileDate(startDate, true);
        var endDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0); 
        var endDay = formatFileDate(endDate, true);
      } else if (timelineGranularity == 'yearly') {
        startDate = new Date(firstDate.getFullYear(), 0, 1);
        startDay = firstDate.getFullYear().toString() + '-01-01';
        endDate = new Date(firstDate.getFullYear(), 11, 31);
        endDay = firstDate.getFullYear().toString() + '-12-31';
      } else { //daily
        startDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDay());
        startDay = formatFileDate(firstDate, true);
        endDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDay());
        endDay = startDay;
      }
      // Subtract 1 from startDate, add 1 to endDay
      var searchStartDay = formatFileDate(decrementDay(startDate), true);
      var searchEndDay = formatFileDate(incrementDay(endDate), true);
      var sitaURL = ' http://164.67.183.180/dispatcher.cgi?text=' + encodeURIComponent(d.name) + '&startdate=' + startDay + '&enddate=' + endDay + '&channellist=' + channelList;
      var newsscapeURL = 'http://tvnews.library.ucla.edu/search?search=%22' + encodeURIComponent(d.name) + '%22&start=' + searchStartDay + '&end=' + searchEndDay;
     // + '&channellist=' + channelList;
      //console.log("sita URL is " + sitaURL);
      var linkDiv = document.getElementById('linkDiv');
      var linkHTML = '<p><a target="blank" href="' + sitaURL + '">Link to concordance interface</a></p>';
      linkHTML += '<p><a target="blank" href="' + newsscapeURL + '">Link to NewsScape search results</a> (not filtered by network)</p>'
      linkDiv.innerHTML = linkHTML;
    })
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
        .html(d.name + ": " + d.count.toLocaleString());
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
        .html(countryName + ": " + countryCount.toLocaleString());
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
    /*.on('mousemove', function(d) {
      var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
      });
      tooltip.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) +
        'px; top:' + (mouse[1] - 35) + 'px')
        .html(d.properties.admin);
      })
      .on('mouseout', function() {
        tooltip.classed('hidden', true);
      });*/

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
  //drawSlider(rangeSliderValues);
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

function togglePoints(cbox) {

  var boxID = cbox.id;
  var boxName = cbox.name;

  if (cbox.checked == false) {
    showPoints = false;
  } else {
    showPoints = true;
  }

  processDate(true);

}

function toggleRange(cbox) {

  var boxID = cbox.id;
  var boxName = cbox.name;

  if (cbox.checked == false) {
    dateSlider.noUiSlider.destroy();
//    lastDate = new Date(firstDate.getTime());
    drawSlider(sliderValue);
  } else {
//    firstDate = new Date(rangeSliderValues[0]);
//    var newDate = new Date(firstDate.getFullYear() + 1, firstDate.getMonth(), firstDate.getYear());
//    var finalDate = new Date(range_all_sliders['max'][0]);
    dateSlider.noUiSlider.destroy();
//    if (newDate < finalDate)
//      lastDate = new Date(newDate.getTime());
//    else
//      lastDate = new Date(finalDate.getTime());

    drawSlider(sliderValue);
  }
  processDate();
}

var selectedNetworks = [];

function listSelectedNetworks() {

  var activeNetworks = [];
  var observedNetworks = {};

  for (var n in selectedNetworks) {
    var net = n.split('_')[1];
    if ((selectedNetworks[n] == true) && (observedNetworks[net] === undefined)) {
      activeNetworks.push(net);
      observedNetworks[net] = true;
    }
  }

  return activeNetworks.join(',');

}

var pointThreshold = 0;

function updateThreshold(obj) {
  pointThreshold = obj.value; 
  
  var thresholdValue = document.getElementById("thresold-value");
  var thresholdSlider = document.getElementById("thresoldSlider");

  document.getElementById("threshold-value").innerHTML = pointThreshold; 

  visualizePlaceData();

}

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
      values: 15,
      density: 15,
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

/*  
  if (values.length == 2) {
    sliderProperties['behaviour'] = 'tap-drag';
    sliderProperties['connect'] = true;
  }
*/
  
  noUiSlider.create(dateSlider, sliderProperties);
  
  dateSlider.noUiSlider.on('update', function( inputVal, handle ) {

    var inputDate = new Date(+inputVal);
/*    if (inputDate == firstDate) {
      return;
    } */

    firstDate = new Date(+inputVal);
    //lastDate = new Date(firstDate.getTime());
    
    //rangeSliderValues[0] = timestamp(date0);

    // There should only ever be one more of these, but it's better not to assume... 
    /*
    for (var i=1; i < values.length; i++) {
      lastDate = new Date(+values[i]);
      newHTML += " - " + formatDate(lastDate);
    }
    */
      
    //rangeSliderValues[1] = timestamp(lastDate);
    
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
    /*
    if (cbox.checked == true) {
      checkBox.checked = true;
      if (!(n in selectedNetworks))
        selectedNetworks.push(n);
    } else {
      checkBox.checked = false;
      if (n in selectedNetworks)
        selectedNetworks.splice(selectedNetworks.indexOf(n), 1);
    }*/
  }

}

function networkClicked(cbox) {

  var networkID = cbox.id;
  if (cbox.checked) {
    selectedNetworks[networkID] = true;
    /*
    var textColor = getContrastYIQ(networkColors[networkID]);
    $(cbox).parent().find("label").css("background-color", networkColors[networkID]);
    $(cbox).parent().find("label").css("color", textColor);
    */
  } else {
    selectedNetworks[networkID] = false;
    /*
    $(cbox).parent().find("label").css("background-color", "#f5f5f5");
    $(cbox).parent().find("label").css("color", "#333");
    */
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
    if (timelineGranularity == "daily")
      timelineInterval = 400;
    else if (timelineGranularity == "monthly")
      timelineInterval = 1600;
    else // if (timelineGranularity == "yearly")
      timelineInterval = 3200;
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
        }, timelineInterval);
      
        d3.select(this).html('Stop');  // change the button label to stop
        playing = true;   // change the status of the animation
      } else {    // else if is currently playing
        clearInterval(timer);   // stop the animation by clearing the interval
        d3.select(this).html('Play');   // change the button label to play
        playing = false;   // change the status again
      }
  });
  
  d3.select('#fwd')  
    .on('click', function() {  // when user clicks the fwd button
       finalDate = new Date(range_all_sliders['max'][0]);
       if (firstDate.getTime() < finalDate.getTime()) {
         var nextDate = stepDateByGranularity(firstDate);
         dateSlider.noUiSlider.set([nextDate.getTime() + 1]);
       }
  });
  d3.select('#back')  
    .on('click', function() {  // when user clicks the back
       earliestDate = new Date(range_all_sliders['min'][0]);
       if (firstDate.getTime() > earliestDate.getTime()) {
         var nextDate = decrementDateByGranularity(firstDate);
         dateSlider.noUiSlider.set([nextDate.getTime() - 1]);
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
