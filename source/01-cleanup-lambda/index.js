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
AWS.config.update({
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
exports.handler = async (event) => {

  console.log(event);

  const bucketPrefix1 = 'endpoint_exports';
  const promise1 = s3.listObjects({
      Bucket: process.env.S3_BUCKET,
      Prefix: bucketPrefix1
    }).promise()
    .catch((err) => {
      console.error('Encountered Error calling listObjects on endpoint exports prefix for Prefix: ' + bucketPrefix1 + ', error: ' + JSON.stringify(err));
      return Promise.reject(err);
    })
    .then((data) => {

      var toDelete = data.Contents.filter((i) => i.Key.startsWith('endpoint_exports/20')).map((i) => {return {Key: i.Key};});
      console.log('Cleaning up and Deleting Objects: ' + JSON.stringify(toDelete));

      return deleteKeys(toDelete);
    });

  const bucketPrefix2 = 'optimizer-daily-query-results';
  const promise2 = s3.listObjects({
      Bucket: process.env.S3_BUCKET,
      Prefix: bucketPrefix2
    }).promise()
    .catch((err) => {
      console.error('Encountered Error calling listObjects on query results prefix for Prefix: ' + bucketPrefix2 + ', error: ' + JSON.stringify(err));
      return Promise.reject(err);
    })
    .then((data) => {

      var toDelete = data.Contents.map((i) => {return {Key: i.Key};});
      console.log('Cleaning up and Deleting Objects: ' + JSON.stringify(toDelete));

      return deleteKeys(toDelete);
    });


    return Promise.all([promise1, promise2]);
};

const deleteKeys = function(toDelete) {
  if (toDelete.length > 0) {
    return s3.deleteObjects({
        Bucket: process.env.S3_BUCKET,
        Delete: {
          Objects: toDelete
        }
      }).promise()
      .catch((err) => {
        console.error('Encountered Error calling deleteObjects with toDelete: ' + JSON.stringify(toDelete) + ', error: ' + JSON.stringify(err));
        return Promise.reject(err);
      })
      .then((ret) => {
        return {
          Done: true
        };
      });
  } else {
    return {
      Done: true
    };
  }
}
