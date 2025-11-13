# Account Balance Checking Service


The Account Balance Checking Service is a background service that runs on a Cron Job schedule. The service uses Next.js Serverless Function and checks the balance of multiple tokens for multiple accounts on multiple networks. The service is able to add more accounts as required and send messages to Slack when account balances reaches a threshold or if there is an issue checking the account balances. The Cron Job frequency can be customised per network environment and the service uses environment variables to store the configurable information. This service also uses a JSON file to store the account addresses, and token details per network.


### API Endpoints

- **`POST /api/check-balances/:chain/:network/:key`**: This endpoint will check the balance on multiple tokens for multiple accounts on the provided `chain` and `network`. It will accept the following parameters:
    - **chain**: The blockchain name to check the balance on (e.g. ethereum / root / xrpl).
    - **network**: The network (or blockchain fork) to check the balance on (e.g. mainnet or testnet).
    - **key**: a randomized alphanumeric+symbols at least 32 characters long, to be used for securing the API. Cron job should call the api with the sharedKey

- **`POST /api/send-notifications/:type/:key/:isprod`**: This endpoint will send notifications for the identified accounts with low balance/s and/or any errors encountered. It will accept the following parameters:
    - **type**: Valid values are `balances` or `errors`.
    - **key**: a randomized alphanumeric+symbols at least 32 characters long, to be used for securing the API. Cron job should call the api with the sharedKey
    - **isprod**: Optional param (used for prod env only), to control which Slack webhook the notifications should be sent.