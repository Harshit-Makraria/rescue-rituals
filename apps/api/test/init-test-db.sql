-- Separate database for e2e tests so they never touch dev data.
CREATE DATABASE events_test OWNER events;
