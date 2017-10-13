#! /usr/bin/env node
const _ = require('lodash')
const readLine = require('readline')
const fs = require('fs');

let templateEntry = "  {\n" +
  "    \"entry\": {\n" +
  "      \"country\": \"{{code}}\",\n" +
  "      \"name\": \"{{name}}\"\n" +
  "    }\n" +
  "  },"
let lineReader = readLine.createInterface({
  input: fs.createReadStream('./bin/new-countries.txt')
});

lineReader.on('line', function (line) {
  let country = line.split(',');
  let template = _.clone(templateEntry);
  template = template.replace('{{code}}', country[0].trim())
  template = template.replace('{{name}}', country[1].trim())
  console.log(template)
});



