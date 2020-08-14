import each from "jest-each";
import Van, {
  DEFAULT_NGP_VAN_API_BASE_URL
} from "../../../../src/extensions/contact-loaders/ngpvan/util";

const config = require("../../../../src/server/api/lib/config");

describe("ngpvan/util", () => {
  let organization;

  beforeEach(async () => {
    organization = {
      id: 77,
      name: "What good shall I do today?"
    };
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe(".makeUrl", () => {
    let oldNgpVanApiBaseUrl;
    let path;
    let expectedUrl;
    beforeEach(async () => {
      oldNgpVanApiBaseUrl = process.env.NGP_VAN_API_BASE_URL;
      process.env.NGP_VAN_API_BASE_URL = "https://relisten.net";
      path = "grateful-dead/1973/02/28/hes-gone?source=90046";
    });

    beforeEach(async () => {
      jest.spyOn(config, "getConfig");
    });

    beforeEach(async () => {
      expectedUrl = `${process.env.NGP_VAN_API_BASE_URL}/${path}`;
    });

    afterEach(async () => {
      process.env.NGP_VAN_API_BASE_URL = oldNgpVanApiBaseUrl;
    });

    it("makes a URL with base url from the environment", async () => {
      expect(Van.makeUrl(path, organization)).toEqual(expectedUrl);
      expect(config.getConfig.mock.calls).toEqual([
        ["NGP_VAN_API_BASE_URL", organization]
      ]);
    });

    describe("when NGP_VAN_API_BASE_URL is not set in the environment", () => {
      beforeEach(async () => {
        delete process.env.NGP_VAN_API_BASE_URL;
      });

      beforeEach(async () => {
        expectedUrl = `${DEFAULT_NGP_VAN_API_BASE_URL}/${path}`;
      });

      it("makes a URL with the default base url", async () => {
        expect(Van.makeUrl(path, organization)).toEqual(expectedUrl);
      });
    });
  });

  describe("getInstances", () => {
    beforeEach(async () => {
      jest.spyOn(config, "getConfig");
      jest.spyOn(Van, "getInstances");

      organization.features = JSON.stringify({
        NGP_VAN_INSTANCES: JSON.stringify([
          {
            NAME: "MyV",
            NGP_VAN_API_KEY: "MyV_key",
            NGP_VAN_APP_NAME: "MyV_app_name",
            NGP_VAN_DATABASE_MODE: 0
          },
          {
            NAME: "MyC",
            NGP_VAN_API_KEY: "MyC_key",
            NGP_VAN_APP_NAME: "MyC_app_name",
            NGP_VAN_DATABASE_MODE: 1
          }
        ])
      });
    });

    it("returns the instances", async () => {
      const instances = Van.getInstances(organization);
      expect(instances).toEqual({
        MyV: {
          NGP_VAN_API_KEY: "MyV_key",
          NGP_VAN_APP_NAME: "MyV_app_name",
          NGP_VAN_DATABASE_MODE: 0
        },
        MyC: {
          NGP_VAN_API_KEY: "MyC_key",
          NGP_VAN_APP_NAME: "MyC_app_name",
          NGP_VAN_DATABASE_MODE: 1
        },
        Default: {
          NGP_VAN_API_KEY: undefined,
          NGP_VAN_APP_NAME: undefined,
          NGP_VAN_DATABASE_MODE: 0
        }
      });
    });

    describe("when there are no instances", () => {
      beforeEach(async () => {
        delete organization.features;
      });

      it("returns an empty object", async () => {
        const instances = Van.getInstances(organization);
        expect(instances).toEqual({
          Default: {
            NGP_VAN_API_KEY: undefined,
            NGP_VAN_APP_NAME: undefined,
            NGP_VAN_DATABASE_MODE: 0
          }
        });
      });
    });

    describe("when an instance doesn't have all the keys", () => {
      beforeEach(async () => {
        organization.features = JSON.stringify({
          NGP_VAN_INSTANCES: JSON.stringify([
            {
              NAME: "MyV",
              NGP_VAN_API_KEY: "MyV_key",
              NGP_VAN_APP_NAME: "MyV_app_name",
              NGP_VAN_DATABASE_MODE: 0
            },
            {
              NAME: "MyC",
              NGP_VAN_API_KEY: "MyC_key",
              NGP_VAN_DATABASE_MODE: 1
            }
          ])
        });
      });

      it("doesn't return that instance", async () => {
        const instances = Van.getInstances(organization);
        expect(instances).toEqual({
          MyV: {
            NGP_VAN_API_KEY: "MyV_key",
            NGP_VAN_APP_NAME: "MyV_app_name",
            NGP_VAN_DATABASE_MODE: 0
          },
          Default: {
            NGP_VAN_API_KEY: undefined,
            NGP_VAN_APP_NAME: undefined,
            NGP_VAN_DATABASE_MODE: 0
          }
        });
      });
    });
  });

  describe(".getAuth", () => {
    let oldNgpVanAppName;
    let oldNgpVanApiKey;
    beforeAll(async () => {
      oldNgpVanAppName = process.env.NGP_VAN_APP_NAME;
      oldNgpVanApiKey = process.env.NGP_VAN_API_KEY;
    });

    afterAll(async () => {
      process.env.NGP_VAN_APP_NAME = oldNgpVanAppName;
      process.env.NGP_VAN_API_KEY = oldNgpVanApiKey;
    });

    beforeEach(async () => {
      jest.spyOn(config, "getConfig");
      jest.spyOn(Van, "getInstances");
    });

    const successValidator = (auth, error) => {
      expect(auth).toMatch(/^Basic [A-Za-z0-9+/=]|=[^=]|={3,}$/);
      expect(error).toBeUndefined();
    };

    const failureValidator = (auth, error) => {
      expect(error).toEqual(
        new Error("Environment missing NGP_VAN_APP_NAME or NGP_VAN_API_KEY")
      );

      expect(auth).not.toEqual(expect.anything());
    };

    each([
      ["both are defined", "spoke", "topsecret", successValidator],
      ["NGP_VAN_API_KEY is not defined", "spoke", undefined, failureValidator],
      [
        "NGP_VAN_APP_NAME is not defined",
        undefined,
        "topsecret",
        failureValidator
      ],
      ["both are not defined", undefined, undefined, failureValidator]
    ]).test("%s", async (description, appName, apiKey, validator) => {
      let auth;
      let error;

      if (appName) {
        process.env.NGP_VAN_APP_NAME = appName;
      } else {
        delete process.env.NGP_VAN_APP_NAME;
      }

      if (apiKey) {
        process.env.NGP_VAN_API_KEY = apiKey;
      } else {
        delete process.env.NGP_VAN_API_KEY;
      }

      try {
        auth = Van.getAuth(organization);
      } catch (caughtException) {
        error = caughtException;
      } finally {
        expect(Van.getInstances.mock.calls).toEqual([[organization]]);

        expect(config.getConfig.mock.calls).toEqual([
          ["NGP_VAN_INSTANCES", organization],
          ["NGP_VAN_APP_NAME", organization],
          ["NGP_VAN_API_KEY", organization],
          ["NGP_VAN_DATABASE_MODE", organization]
        ]);
        validator(auth, error);
      }
    });
  });
});
