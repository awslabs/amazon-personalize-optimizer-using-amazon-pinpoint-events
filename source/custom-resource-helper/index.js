/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License Version 2.0 (the 'License'). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/                                                                                   *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const AWS = require('aws-sdk');
const fs = require("fs");
const https = require("https");
const stream = require('stream');
const url = require('url');
const crypto = require("crypto");

AWS.config.update({
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const athena = new AWS.Athena();

const uuidv4 = function() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

const setupEventRules = function() {
  const event_types = process.env.EVENT_TYPES.split(',');
  const event_values = process.env.EVENT_VALUES.split(',');

  let csv = 'EVENT_TYPE,EVENT_VALUE\n';
  for (var i = 0; i < event_types.length; i++) {
    csv += `${event_types[i]},${event_values[i]}\n`;
  }

  const params = {
    Bucket: process.env.S3_DATA_BUCKET,
    Key: 'event_values/values.csv',
    Body: Buffer.from(csv)
  };

  return s3.putObject(params).promise()
    .catch((err) => {
      console.error('Encountered Error calling putObject with parameters: ' + JSON.stringify(params) + ', error: ' + JSON.stringify(err));
      return Promise.reject(err);
    })

}

const runNamedQuery = function(namedQuery) {
  return athena.getNamedQuery({NamedQueryId: namedQuery}).promise()
    .then((data) => {

      const params = {
        QueryString: data.NamedQuery.QueryString,
        ResultConfiguration: {
          OutputLocation: `s3://${process.env.S3_DATA_BUCKET}/temp/`
        }
      };

      return athena.startQueryExecution(params).promise()
        .catch((err) => {
          console.error('Encountered Error calling startQueryExecution with parameters: ' + JSON.stringify(params) + ', error: ' + JSON.stringify(err));
          return Promise.reject(err);
        })
    });
}

exports.handler = (event, context, callback) => {

  let responseStatus = 'FAILED';
  let responseData = {};

  if (event.ResourceProperties.CustomResourceAction === 'GenerateUUID') {

      responseStatus = 'SUCCESS';
      responseData = {
          UUID: uuidv4()
      };
      return sendResponse(event, callback, context.logStreamName, responseStatus, responseData);

  } else if (event.ResourceProperties.CustomResourceAction === 'SetupQueries') {

      return setupEventRules()
          .then((results) => {

            return Promise.all([
              runNamedQuery(process.env.EVENT_NAMED_QUERY),
              runNamedQuery(process.env.EXPORT_NAMED_QUERY),
              runNamedQuery(process.env.VALUE_NAMED_QUERY)
            ]);

          })
          .then((results) => {
            responseStatus = 'SUCCESS';
            responseData = {
                success: true
            };
            return sendResponse(event, callback, context.logStreamName, responseStatus, responseData);

          })
          .catch((results) => {

            console.log('Received Error: ' + JSON.stringify(results));

            responseStatus = 'FAILED';
            responseData = {
                success: false
            };
            return sendResponse(event, callback, context.logStreamName, responseStatus, responseData);

          });
  }
};

/**
* Sends a response to the pre-signed S3 URL
*/
let sendResponse = function(event, callback, logStreamName, responseStatus, responseData) {
  return new Promise((resolve, reject) => {
    try {
      const responseBody = JSON.stringify({
          Status: responseStatus,
          Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`,
          PhysicalResourceId: logStreamName,
          StackId: event.StackId,
          RequestId: event.RequestId,
          LogicalResourceId: event.LogicalResourceId,
          Data: responseData,
      });

      console.log('RESPONSE BODY:\n', responseBody);
      const parsedUrl = url.parse(event.ResponseURL);
      const options = {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.path,
          method: 'PUT',
          headers: {
              'Content-Type': '',
              'Content-Length': responseBody.length,
          }
      };

      const req = https.request(options, (res) => {
          console.log('STATUS:', res.statusCode);
          console.log('HEADERS:', JSON.stringify(res.headers));
          resolve('Successfully sent stack response!');
      });

      req.on('error', (err) => {
          console.log('sendResponse Error:\n', err);
          reject(err);
      });

      req.write(responseBody);
      req.end();

    } catch(err) {
      console.log('GOT ERROR');
      console.log(err);
      reject(err);
    }
  });
};
