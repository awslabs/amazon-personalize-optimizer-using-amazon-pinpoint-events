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

exports.handler = async (event) => {

  const output = [];

  event.records.forEach(record => {

    try {
      // Decode the base64 message
      const decoded = JSON.parse(Buffer.from(record.data, 'base64').toString('ascii'));

      // Filter out Test Messages
      if (decoded.event_type === '_test.event_stream') {
        output.push({
          data: record.data,
          recordId: record.recordId,
          result: 'Dropped'
        });

      } else {

        // Trim off millisecond precision
        decoded.arrival_timestamp = Math.round(decoded.arrival_timestamp / 1000);
        decoded.event_timestamp = Math.round(decoded.event_timestamp / 1000);

        output.push({
          // Add a linebreak for easier Glue crawling
          data: Buffer.from(JSON.stringify(decoded) + '\n').toString('base64'),
          recordId: record.recordId,
          result: 'Ok'
        });
      }
    }
    catch(err) {
      console.error('Encountered Error when processing Kinesis event record for RecordId: ' + record.recordId + ', error: ' + JSON.stringify(err));
      output.push({
        data: record.data,
        recordId: record.recordId,
        result: 'Dropped'
      });
    }

  });

  return {records: output};
};
