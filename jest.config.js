module.exports = {
  verbose: true,
  testURL: "http://localhost/",
  testEnvironment: "node",
  globals: {
    DB_JSON: JSON.stringify({
      client: "pg",
      connection: {
        host: "127.0.0.1",
        "port": "5432",
        "database": "spoke_test",
        "password": "spoke_test",
        "user": "spoke_test"
      },
    }),
    JOBS_SYNC: "1",
    JOBS_SAME_PROCESS: "1",
    RETHINK_KNEX_NOREFS: "1", // avoids db race conditions
    DEFAULT_SERVICE: 'fakeservice',
    DST_REFERENCE_TIMEZONE: 'America/New_York',
    DATABASE_SETUP_TEARDOWN_TIMEOUT: 20000,
  },
  moduleFileExtensions: [
    "js",
    "jsx"
  ],
  transform: {
    ".*.js": "<rootDir>/node_modules/babel-jest"
  },
  moduleDirectories: [
    "node_modules"
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
  },
  collectCoverageFrom : ["**/*.{js,jsx}", "!**/node_modules/**", "!**/__test__/**", "!**/deploy/**", "!**/coverage/**"],
  setupTestFrameworkScriptFile: "<rootDir>/__test__/setup.js",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/__test__/e2e/"]
};
