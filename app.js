import os from 'os';
import fs from 'node:fs';
import path from 'node:path';
import pkg from 'papaparse';
const { unparse } = pkg;
const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function readAndParseJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error.message);
    return null;
  }
}

function getSortedTimelinePaths(takeoutLocation) {
  const timelinePaths = [];
  const history = path.join(takeoutLocation, "Timeline/Semantic Location History");
  const listing = fs.readdirSync(history);
  const years = listing.filter(value => {
      return value !== null && value !== '' && isFinite(Number(value));
    }).sort((a, b) => {
      return Number(a) - Number(b);
    });
  for (const year of years) {
    for (const month of months) {
      const filePath = path.join(history, year, year + "_" + month + ".json");
      try {
        fs.accessSync(filePath, fs.constants.F_OK);
        timelinePaths.push(filePath);
      } catch (error) {
        console.log("Did not find a json file for %s in %s", month, year);
      }
    }
  }
  return timelinePaths;
}

async function main() {
  const userHomeDir = os.homedir();
  const takeoutLocation = path.join(userHomeDir, '/Desktop/Takeout');
  const timelinePaths = getSortedTimelinePaths(takeoutLocation);
  let timelineObjects = [];
  for (const filePath of timelinePaths) {
    const jsonData = readAndParseJSON(filePath);
    timelineObjects.push(...jsonData.timelineObjects);
  }
  let places = [];
  for (const entry of timelineObjects) {
    if (entry.placeVisit) {
      const place = getPlace(entry.placeVisit);
      places.push(place);
    } else if (entry.activitySegment) {
      //Ignore for now!
    } else {
      throw new Error("Unexpected type!");
    }
  }
  const csvString = unparse(places);
  fs.writeFileSync(path.join(takeoutLocation, "timeline.csv"), csvString);
}

function getPlace(visit) {
  const place = {
    "Coordinates": undefined,
    "PlaceName": undefined,
    "PlaceID": undefined,
    "Address": undefined,
    "Start": undefined,
    "End": undefined,
    "Confidence": undefined,
  };
  const latitude = visit.location.latitudeE7 / 1e7;
  const longitude = visit.location.longitudeE7 / 1e7;
  place.Coordinates = `${latitude},${longitude}`;
  place.PlaceName = visit.location.name;
  place.PlaceID = visit.location.placeId;
  place.Address = visit.location.address;
  place.Start = formatDate(visit.duration.startTimestamp);
  place.End = formatDate(visit.duration.endTimestamp);
  place.Confidence = visit.placeConfidence;
  return place;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth() is 0-indexed
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // e.g., "2008-09-07 16:00:00"
}

main();
