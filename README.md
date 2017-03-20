NewsSCOPE: Tools for geospatial analysis and visualization of places in the news

# Back-end processing workflow

0. After it has been recorded and processed, every TV recording in the NewsScape collection has an accompanying .seg ("segment") file that contains derived information from the video recording and its caption transcripts. The .seg file includes flagged places names as identified by the Stanford NER parser. Other software could in theory be used for this purpose; the current version has some limitations, particularly that it really only works with English texts.
1. The GeocodePlaces.py script loops through every per-recording .seg file in the NewsScape recording tree (which is hundreds of thousands of files in total). For each flagged place name it finds, it
- Checks whether location data about the place is already cached in geoCache/locations/ or geoCache/noplaces/. If the data is already in the former location, it uses this data; in the latter case it ignores the place reference.
- If there is no cached data about this place name, the script queries a local GIS server to find prospective matches for the place name. Currently, the script queries a local Gisgraphy server using its public full-text search API (http://www.gisgraphy.com/documentation/api/#!/fulltext_-_autocomplete). It caches the resulting data and then adds the info about the top-level match for the place name to the daily places mentioned statistics.
- When a full day has been processed, the script writes its summary places mentioned statistics to the geoCache/dayStats/ folder.
2. The ProcessDayStats.py script loops through each per-day places mentioned stats file in geoCache/dayStats/ and, after doing some basic data refinements, outputs JSON data files for each day, month, and year to the json/ folder. These files are used by the index.html and newsscope.js code when populating the display.

# Front-end interface

The front-end interface uses bootstrap.js for its basic templating and d3.js for most of its interactive components. The menus use jquery.js, the slider uses the custom noUiSlider library, and the the map is drawn via D3's topoJSON library.

The day, month and year .json data files are loaded asynchronously on demand via the D3 file queue library, based on the date granularity and time points specified on the timeline and menus. 

By default, references to specific places that can be resolved to unique coordintes are plotted as red dots, with the radius determined by their frequency within the specified day, month or year. The 'Place count threshold' menu slider can be used to hide frequencies below a given threshold.

References to countries are visualized by shading the country's polygons (darker = more references), though these also can be visualized as dots at an arbitrary central point in the country by selecting the 'Show country points' menu option.

Place references also can be filtered via the network facets in the left-hand menu.

# Advanced interface features

Clicking on a specific place mentioned dot on the map will spawn two links below the map, which link to searches for that place name on
1. a concordance interface created at the University of Erlangen in Germany (this is a limited-access, experimental feature that may not work), and 
2. the UCLA Library's NewsScape search interface.
