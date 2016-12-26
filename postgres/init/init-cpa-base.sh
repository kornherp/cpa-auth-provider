#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE ROLE `echo $DOCKER_USER` WITH LOGIN PASSWORD '`echo $DOCKER_PASSWORD`';
    CREATE DATABASE cpa;
    GRANT ALL PRIVILEGES ON DATABASE cpa TO `echo $DOCKER_USER`;
EOSQL