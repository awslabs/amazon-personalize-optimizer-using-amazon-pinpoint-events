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
const pinpoint = new AWS.Pinpoint();
exports.handler = async (event) => {

  const d = new Date();
  const bucketPrefix = `endpoint_exports/${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  const bucket = `s3://${process.env.S3_BUCKET}/${bucketPrefix}`;

  const params = {
    ApplicationId: process.env.PINPOINT_APPLICATION_ID,
    ExportJobRequest: {
      RoleArn: process.env.ROLE_ARN,
      S3UrlPrefix: bucket
    }
  };

  return pinpoint.createExportJob(params).promise()
    .catch((err) => {
      console.error('Encountered Error calling createExportJob with parameters: ' + JSON.stringify(params) + ', error: ' + JSON.stringify(err));
      return Promise.reject(err);
    })
    .then((data) => {
      console.log(JSON.stringify(data));
      return {
        ExportJobId: data.ExportJobResponse.Id
      };
    });

};
