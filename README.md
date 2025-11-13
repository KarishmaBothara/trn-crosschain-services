# The Root Network | Crosschain Services

Run `yarn workspace @trncs/<app> prisma:generate` to generate Prisma types
Run `yarn workspace @trncs/<app> prisma:migrate` to sync database with schema

1. Run `yarn workspace @trncs/<app> dev` to watch and compile TypeScript files
2. Run `yarn workspace @trncs/<app> call <process>` to start a process

Check out other `scripts` in each apps `package.json`

### Porcini Environment

To test, develop using Porcini

- Run `docker compose up` to start the local Postgres DB
- Update `.env` with the following details

```
ARCHIVE_ENDPOINT=http://gateway.cicd.rootnet.app/graphql
ROOT_WS_ENDPOINT=wss://porcini.au.rootnet.app/archive/ws
```

### Local Environment

To test, develop on a local ROOT nodes

- Remove `docker` folder if it exists to reset the Docker data
- Run `docker compose --profile=full up` to start the local Postgres DB
- Update `.env` with the following details

```
ARCHIVE_ENDPOINT=http://localhost:8888/graphql
ROOT_WS_ENDPOINT=ws://localhost:9944/ws
```
