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
const athena = new AWS.Athena();
exports.handler = async (event) => {
  return athena.getNamedQuery({NamedQueryId: process.env.NAMED_QUERY}).promise()
    .catch((err) => {
      console.error('Encountered Error calling getNamedQuery with NamedQueryId: ' + process.env.NAMED_QUERY + ', error: ' + JSON.stringify(err));
      return Promise.reject(err);
    })
    .then((data) => {

      const params = {
        QueryString: data.NamedQuery.QueryString,
        QueryExecutionContext: {
          Database: data.NamedQuery.Database
        },
        ResultConfiguration: {
          OutputLocation: `s3://${process.env.S3_BUCKET}/optimizer-daily-query-results/`
        }
      };

      return athena.startQueryExecution(params).promise()
      .catch((err) => {
        console.error('Encountered Error calling startQueryExecution with parameters: ' + JSON.stringify(params) + ', error: ' + JSON.stringify(err));
        return Promise.reject(err);
      });
    })
    .then((data) => {
      console.log(JSON.stringify(data));
      return {
        QueryExecutionId: data.QueryExecutionId
      };
    });
};
