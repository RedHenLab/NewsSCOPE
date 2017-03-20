#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
Script to read all .seg files in the NewsScape /tv file system tree
(note: there are several hundred thousand of these in total)
finding all NER detected place names, then querying a GIS service (Gisgraphy
in this case) to find the name, coordinates, and other attributes of the
most likely match or else reading these from a local cache, and writing the
resulting info to 
"""

import os
import re
import json
import urllib
import pickle
#import codecs
import sys
import datetime
reload(sys)  
sys.setdefaultencoding('utf8')

# Update these values if processing stops in the middle for some reason
locationsCoded = 0
filesToSkip = 0
segFilesProcessed = 0
MIN_SCORE = 25 # Minimum confidence level for using results

dayPlaces = {}
dayNetworkPlaces = {}

# Debugging output (writing things to files or stdout)
saveFile = False
printFile = False
debugging = False
infoprint = True 

def dprint(str):
  if (debugging):
    print str

def iprint(str):
  if (infoprint):
    print str

thisDay = ''

locationCache = {}
tvTree = '/mnt/netapp/tv/'

now = datetime.datetime.utcnow()
nowString = now.strftime("%Y-%m-%d %H:%M")

acceptablePlaceTypes = ['GisFeature', 'Adm', 'AdmBuilding', 'Airport', 'AmusePark', 'Aqueduct', 'Bank', 'Bay', 'Beach', 'Bridge', 'Building', 'Camp', 'Canyon', 'Castle', 'Cemetery', 'City', 'CitySubdivision', 'Cliff', 'Coast', 'Continent', 'Country', 'CourtHouse', 'Dam', 'Desert', 'Falls', 'Farm', 'Field', 'Fjord', 'Forest', 'Garden', 'Gorge', 'Gulf', 'Hill', 'Hotel', 'Ice', 'Island', 'Lake', 'Library', 'Marsh', 'MetroStation', 'Monument', 'Mountain', 'Museum', 'Ocean', 'Park', 'PoliticalEntity', 'Pond', 'Port', 'Prison', 'Pyramid', 'Quay', 'Rail', 'RailRoadStation', 'Ranch', 'Ravine', 'Religious', 'Reserve', 'Road', 'School', 'Sea', 'Stadium', 'Strait', 'Stream', 'Street', 'Theater', 'Tower', 'Tunnel', 'Volcano', 'WaterBody', 'FerryTerminal', 'CityHall']

def recordDayStats(day):
  # When the script begins processing .seg files for a new day, record the
  # stats for the previous day. These will be processed later by
  # ProcessDayStats.py to be converted into .json files that the NewsSCOPE
  # interface can use.

  global dayPlaces, dayNetworkPlaces
  if (os.path.isfile('geoCache/dayStats/' + day + '.txt')):
    return None
  statsFile = open('geoCache/dayStats/' + day + '.txt', 'w')
  # First write out all locations seen, bundled by coordinates
  statsFile.write("LAT\tLON\tNAME\tCOUNT\tCOUNTRY\tTYPE\tCLASS\n")
  for coords in dayPlaces:
    lat = coords.split(',')[0]
    lon = coords.split(',')[1]
    statsFile.write(str(lat) + "\t" + str(lon) + "\t" + str(dayPlaces[coords]['name']) + "\t" + str(dayPlaces[coords]['count']) + "\t" + dayPlaces[coords]['country'] + "\t" + dayPlaces[coords]['type'] + "\t" + dayPlaces[coords]['code'] + "\n")
  # Then write out all locations seen, broken out by network
  statsFile.write("NETWORK\tLAT\tLON\tNAME\tCOUNT\tCOUNTRY\tTYPE\tCLASS\n")
  for network in dayNetworkPlaces:
    for coords in dayNetworkPlaces[network]:
      lat = coords.split(',')[0]
      lon = coords.split(',')[1]
      statsFile.write(network + "\t" + str(lat) + "\t" + str(lon) + "\t" + dayNetworkPlaces[network][coords]['name'] + "\t" + str(dayNetworkPlaces[network][coords]['count']) + "\t" + dayNetworkPlaces[network][coords]['country'] + "\t" + dayPlaces[coords]['type'] + "\t" + dayPlaces[coords]['code'] + "\n")

  statsFile.close()

  dayPlaces = {}
  dayNetworkPlaces = {}

  return None

def slugify(inString):
  """
  Normalizes string, converts to lowercase, removes non-alpha characters,
  and converts spaces to hyphens.
  """
  value = unicode(inString)

  import unicodedata
  value = unicodedata.normalize('NFKD', value)
  value = unicode(re.sub('[-\s]+', '-', value))

  return value

def normalizeLocation(loc):

  """
  Lots of ad hoc rules for changing location names so that the GIS service
  lookup works better.
  """

  if ((loc == "US") or (loc == "U.S.")):
    return "USA"

  locLower = loc.lower()

  if (locLower == "california"):
    return "State+of+California"
  if (locLower == "spain"):
    return "Spain+Kingdom"
  if (locLower == "france"):
    return "Republic+of+France"
  if (locLower == "l.a."):
    return "Los+Angeles"
  if (locLower == "zaire"):
    return "Democratic+Republic+of+the+Congo"
  if (locLower == "new england"):
    return "New+England+Region"
  if (locLower == "middle east"):
    return "Alexandria+Egypt"

  # If it's a 2-letter place name, return it as is. It's probably a country code
  if (len(loc) == 2):
    return loc

  locArray = loc.split(' ')
  newLocArray = []

  for word in locArray:
    if (word.find('.') >= 0):
      newLocArray.append(word)
    else:
      newLocArray.append(word.title())

  newLoc = '+'.join(newLocArray)
  return newLoc

def geoQuery(loc):
  # Query the GIS service for info about the most likely matches for a
  # location name and cache it if the data hasn't already been cached;
  # otherwise just grab the data from the cache.
  results = None
  if (loc.strip() == ""):
    dprint("Empty location for " + loc)
    return None

  if (loc in locationCache):
    return locationCache[loc]

  locSlug = slugify(loc)

  if (locSlug.strip() == ""):
    dprint("Empty slugified location for " + loc)
    return None

  locFile = 'geoCache/locations/' + locSlug
  if (os.path.isfile(locFile)):
    return pickle.load(open(locFile, 'rb'))
  
  if (os.path.isfile('geoCache/noplaces/' + locSlug)):
    dprint("Cached null result for place " + loc)
    return None

  gisgraphyQuery = 'http://marinus.library.ucla.edu:8008/fulltext/fulltextsearch?format=json&allwordsrequired=true&spellchecking=false&from=1&to=1&q=' + loc
  dprint("running gisgraphy query " + gisgraphyQuery)
  data = urllib.urlopen(gisgraphyQuery).read()
  results = json.loads(data)
  if ((results is None) or (results['response']['numFound'] == 0)):
    dprint("Null result for place " + loc)
    if (locSlug.strip() != ""):
      open('geoCache/noplaces/' + locSlug, 'a').close() 
    return None
  pickle.dump(results, open(locFile, 'wb'))
  locationCache[loc] = results
  return results

def processSegFile(filepath):
  # Look up the places found in a .seg file, keep track of the results

  global segFilesProcessed, locationsCoded, thisDay
  name = filepath.split('/')[-1]
  ext = name.split('.')[-1]

  if (ext != 'seg'):
    return None

  day = name.split('_')[0]

  network = '_'.join(name.split('_')[2:4])

  # If the script is processing multiple days, write the stats summary 
  # when the day increments
  if (thisDay == ''):
    thisDay = day
  elif (day != thisDay):
    recordDayStats(thisDay)
    thisDay = day

  month = '-'.join(day.split('-')[0:2])
  year = day.split('-')[0]

  if (saveFile and (os.path.isfile('newSegFiles/' + str(year) + '/' + str(month) + '/' + str(day) + '/' + name))):
    dprint("Skipping seg file " + str(filepath))
    return None
  
  segFilesProcessed += 1

  if (segFilesProcessed < filesToSkip):
    return None

  iprint("Processing seg file " + str(segFilesProcessed) + ": " + str(filepath) + ", places coded so far: " + str(locationsCoded))

  if (saveFile):
    if (not os.path.isdir('newSegFiles/' + str(year))):
      os.mkdir('newSegFiles/' + str(year))
    if (not os.path.isdir('newSegFiles/' + str(year) + '/' + str(month))):
      os.mkdir('newSegFiles/' + str(year) + '/' + str(month))
    if (not os.path.isdir('newSegFiles/' + str(year) + '/' + str(month) + '/' + str(day))):
      os.mkdir('newSegFiles/' + str(year) + '/' + str(month) + '/' + str(day))

  fileStr = ''

  with open(filepath, 'r') as segFile:

    for line in segFile:
      fileStr += line
      lineArray = line.strip().split('|')
      if (lineArray[0] == 'FRM_01'):
        # Insert the credit line
        fileStr += "GIS_01|" + nowString + "|Source_Program=Gisgraphy|Source_Person=Peter Broadwell|Codebook=Place_name|Latitude|Longitude|Country|Place_type|Feature_code|Feature_id\n"
      if (len(lineArray) < 4):
        continue
      tag = lineArray[2]
      if (tag == 'NER_03'):
        startStamp = lineArray[0]
        endStamp = lineArray[1]
        entities = lineArray[3:]
        rawLocations = []
        for entityGroup in entities:
          """
          NER_03 format changed in December 2016:
          Old style:
          20111230224727.000|20111230224744.000|NER_03|ORGANIZATION/MSNBC|PERSON/ROGER SIMON/CHRIS HAYES
          New style:
          20111230224727.000|20111230224744.000|NER_03|ORGANIZATION=MSNBC|PERSON=ROGER SIMON|PERSON=CHRIS HAYES
          """
          if (entityGroup.find('/') >= 0):
            groupArray = entityGroup.split('/')
            groupType = groupArray[0]
            if (groupType == 'LOCATION'):
              for location in groupArray[1:]:
                rawLocations.append(location)
          elif (entityGroup.find('=') >= 0):
            groupArray = entityGroup.split('=')
            groupType = groupArray[0]
            if (groupType == 'LOCATION'):
              rawLocations.append(groupArray[1])

        for location in rawLocations:
          norLoc = normalizeLocation(location)
          geoResults = geoQuery(norLoc)
          if (geoResults is None):
            continue
          score = geoResults['response']['docs'][0]['score']
          if (score < MIN_SCORE):
            continue
          placeType = geoResults['response']['docs'][0]['placetype']
          if (placeType not in acceptablePlaceTypes):
            dprint(location + " is not an acceptable place type: " + placeType)
            continue
          locationsCoded += 1
          placeName = geoResults['response']['docs'][0]['name']
          placeLon = geoResults['response']['docs'][0]['lng']
          placeLat = geoResults['response']['docs'][0]['lat']
          placeCountry = geoResults['response']['docs'][0]['country_code']
          if ('feature_code' in geoResults['response']['docs'][0]):
            placeFeatureCode = geoResults['response']['docs'][0]['feature_code']
          else:
            placeFeatureCode = 'NONE'
          placeFeatureID = geoResults['response']['docs'][0]['feature_id']

          coords = str(placeLat) + "," + str(placeLon)
          if (coords not in dayPlaces):
            dayPlaces[coords] = {'count':1, 'country':placeCountry, 'name': location, 'type':placeType, 'code':placeFeatureCode}
          else:
            dayPlaces[coords]['count'] += 1

          if (network not in dayNetworkPlaces):
            dayNetworkPlaces[network] = {}
            dayNetworkPlaces[network][coords] = {'count':1, 'country':placeCountry, 'name': location, 'type':placeType, 'code':placeFeatureCode}
          if (coords not in dayNetworkPlaces[network]):
            dayNetworkPlaces[network][coords] = {'count':1, 'country':placeCountry, 'name': location, 'type':placeType, 'code':placeFeatureCode}
          else:
            dayNetworkPlaces[network][coords]['count'] += 1

          dprint("Coded location " + str(locationsCoded) + ": " + location + ": " + str(placeLon) + "E " + str(placeLat) + "N " + placeCountry)

          # New line should look like 20150606002509.956|20150606002512.725|GIS_01|Place name=LOS ANGELES COUNTY|Latitude=34.1980094909668|Longitude=-118.26101684570312|Country code=US|Placetype=Adm|Feature_id=5368381
          geoArray = [str(startStamp), str(endStamp), 'GIS_01', 'Place_name=' + location, 'Latitude=' + str(placeLat), 'Longitude=' + str(placeLon), 'Country=' + placeCountry, 'Place_type=' + placeType, 'Feature_id=' + str(placeFeatureID), 'Feature_code=' + str(placeFeatureCode)]
          fileStr += '|'.join(geoArray) + "\n"

  segFile.close()

  if (saveFile):
    newSegFile = open('newSegFiles/' + str(year) + '/' + str(month) + '/' + str(day) + '/' + name, 'w')
    newSegFile.write(fileStr)
    newSegFile.close()

  if (printFile):
    print fileStr.strip()

  return None

# MAIN 

if (len(sys.argv) == 2):
  filename = sys.argv[1]
  processSegFile(filename)
  sys.exit()

yearDirs = [ f for f in os.listdir(tvTree) if os.path.isdir(os.path.join(tvTree, f)) ]
yearDirs.sort()
for yearDir in yearDirs:
  if (int(yearDir) < 2016):
    continue
  yearPath = os.path.join(tvTree, yearDir)
  monthDirs = [ f for f in os.listdir(yearPath) if os.path.isdir(os.path.join(yearPath, f)) ]
  monthDirs.sort()
  for monthDir in monthDirs:
    month = monthDir.split('-')[1]
    if ((int(yearDir) != 2016) or (int(month) < 3)):
      continue
    monthPath = os.path.join(yearPath, monthDir)
    dayDirs = [ f for f in os.listdir(monthPath) if os.path.isdir(os.path.join(monthPath, f)) ]
    dayDirs.sort()
    for dayDir in dayDirs:
      dayPath = os.path.join(monthPath, dayDir)
      allFiles = [ f for f in os.listdir(dayPath) if os.path.isfile(os.path.join(dayPath, f)) ]
      allFiles.sort() 
      for name in allFiles:
        extension = name.split('.')[-1]
        if (extension == 'seg'):
          filepath = os.path.join(dayPath, name)
          processSegFile(filepath)

recordDayStats(thisDay)
