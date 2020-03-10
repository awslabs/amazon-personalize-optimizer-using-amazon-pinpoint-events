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
const personalize = new AWS.Personalize();
exports.handler = async (event) => {

  const params = {
    campaignArn: process.env.CAMPAIGN_ARN,
    solutionVersionArn: event.SolutionVersionArn,
    minProvisionedTPS: parseInt(process.env.MIN_PROVISIONED_TPS)
  };

  return personalize.updateCampaign(params).promise()
    .catch((err) => {
      console.error('Encountered Error calling updateCampaign with parameters: ' + JSON.stringify(params) + ', error: ' + JSON.stringify(err));
      return Promise.reject(err);
    })
    .then((response) => {
      return {
        Success: 'true'
      };
    });
};
