import json
import os

import boto3


SNS_TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]

sns = boto3.client("sns")


def lambda_handler(event, context):

    for record in event["Records"]:

        message = json.loads(
            record["body"]
        )

        print(
            f"Processing notification: {message}"
        )

        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject="Writing Assistant Activity",
            Message=json.dumps(message),
        )

    return {
        "statusCode": 200
    }