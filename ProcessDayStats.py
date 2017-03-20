#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
Script to process all per-day summaries of locations found in TV news .seg
files (in geoCache/dayStats/) and write out the aggregated data into
.json files (in the json/ folder) at daily, weekly, and yearly granularities 
that the newsscope.js Javascript code can then read when rendering the 
NewsSCOPE interface.
"""

import os
import json
import sys
import datetime
import pycountry
reload(sys)
sys.setdefaultencoding('utf8')

jsonDir = './json/'

dayFiles = [ f for f in os.listdir('./geoCache/dayStats/') if os.path.isfile(os.path.join('./geoCache/dayStats/', f)) ]
dayFiles.sort()

thisMonth = ''
thisYear = ''

monthData = { 'allPlaces':{}, 'netPlaces':{} }
yearData = { 'allPlaces':{}, 'netPlaces':{} }

def processDayFile(dayPath):

  global monthData, yearData

  allSection = True

  day = dayPath.split('.')[0]
  dayData = { 'allPlaces':{}, 'netPlaces':{} }
  with open(os.path.join('./geoCache/dayStats/', dayPath), 'r') as dayFile:
    print "processing " + dayPath
    for line in dayFile:
      lineArray = line.strip().split("\t")
      if (lineArray[0] == 'LAT'):
        allSection = True
        continue
      elif (lineArray[0] == 'NETWORK'):
        allSection = False
        continue

      # Parse coordinate-based or network-based sections of the daily stats
      # file (code is ugly, I know)
      if (allSection == True):
        network = None
        lat = lineArray[0]
        lon = lineArray[1]
        name = lineArray[2]
        count = lineArray[3]
        ccode = lineArray[4]
        ptype = lineArray[5]
        fcode = lineArray[6]
      else:
        network = lineArray[0]
        lat = lineArray[1]
        lon = lineArray[2]
        name = lineArray[3]
        count = lineArray[4]
        ccode = lineArray[5]
        ptype = lineArray[6]
        fcode = lineArray[7]

      """
      Implement various ad-hoc corrections for the returned place matches,
      based mostly on the detected place's country code. Some of these
      are hacks to make the results better, while others deal with geo-
      political realities (e.g., Yugoslavia no longer exists).
      """
      # Antarctica is a weird trash bin for misplaced locations, so ignore
      # them.
      if ((ccode == 'AQ') and (name.lower() != "antarctica")):
        continue
      elif (ccode == 'YU'):
        countryID = 'YUG' 
        countryName = "Yugoslavia"
      elif (ccode == 'CS'):
        countryID = 'SCG' 
        countryName = "Serbia and Montenegro"
      elif (ccode == 'XK'):
        countryID = 'RKS' 
        countryName = "Kosovo"
      elif (ccode == 'GC'):
        countryID = 'GC' 
        countryName = "Gulf Cooperation Council"
      elif (ccode == 'IC'):
        countryID = 'ISL' 
        countryName = "Iceland"
      else:
        country = pycountry.historic_countries.get(alpha2=ccode)
        countryID = country.alpha3
        countryName = country.name
      
      dayData = addPlace(dayData, allSection, {'lat':lat, 'lon':lon, 'name':name, 'count':count, 'country':countryID, 'type':ptype, 'countryName':countryName, 'featureCode':fcode}, network)
      monthData = addPlace(monthData, allSection, {'lat':lat, 'lon':lon, 'name':name, 'count':count, 'country':countryID, 'type':ptype, 'countryName':countryName, 'featureCode':fcode}, network)
      yearData = addPlace(yearData, allSection, {'lat':lat, 'lon':lon, 'name':name, 'count':count, 'country':countryID, 'type':ptype, 'countryName':countryName, 'featureCode':fcode}, network)

  with open(jsonDir + day + '.json', 'w') as jsonFile:
    json.dump(dayData, jsonFile)


# Function to add a place to the JSON summary of a given time period
# (day, month, year)
def addPlace(fileData, allSection, placeData, network):

  coords = str(placeData['lat']) + "," + str(placeData['lon'])

  if (allSection == True):
    if (coords in fileData['allPlaces']):
      fileData['allPlaces'][coords]['count'] = int(fileData['allPlaces'][coords]['count']) + int(placeData['count'])
    else:
      fileData['allPlaces'][coords] = placeData
  else:
    if (network not in fileData['netPlaces']):
      fileData['netPlaces'][network] = {}
    if (coords in fileData['netPlaces'][network]):
      fileData['netPlaces'][network][coords]['count'] = int(fileData['netPlaces'][network][coords]['count']) + int(placeData['count'])
    else:
      fileData['netPlaces'][network][coords] = placeData

  return fileData

# MAIN

for dayPath in dayFiles:

  month = '-'.join(dayPath.split('-')[0:2])
  year = dayPath.split('-')[0]

  if (int(year) != 2016):
    continue

  if (month != thisMonth):
    if (thisMonth == ''):
      thisMonth = month
    else:
      with open(jsonDir + thisMonth + '.json', 'w') as jsonFile:
        json.dump(monthData, jsonFile)
      thisMonth = month
      monthData = { 'allPlaces':{}, 'netPlaces':{} }

  if (year != thisYear):
    if (thisYear == ''):
      thisYear = year
    else:
      with open(jsonDir + thisYear + '.json', 'w') as jsonFile:
        json.dump(yearData, jsonFile)
      thisYear = year 
      yearData = { 'allPlaces':{}, 'netPlaces':{} }

  processDayFile(dayPath)


with open(jsonDir + year + '.json', 'w') as jsonFile:
        json.dump(yearData, jsonFile)
with open(jsonDir + month + '.json', 'w') as jsonFile:
        json.dump(monthData, jsonFile)
