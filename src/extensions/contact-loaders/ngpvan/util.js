import { getConfig } from "../../../server/api/lib/config";

export const DEFAULT_NGP_VAN_API_BASE_URL = "https://api.securevan.com";
export const DEFAULT_NGP_VAN_DATABASE_MODE = 0;

export default class Van {
  static getInstances = organization => {
    const requiredInstanceKeys = [
      "NAME",
      "NGP_VAN_API_KEY",
      "NGP_VAN_APP_NAME",
      "NGP_VAN_DATABASE_MODE"
    ];

    const toReturn = {};
    const vanInstances = getConfig("NGP_VAN_INSTANCES", organization);
    if (vanInstances) {
      const rawInstances = JSON.parse(vanInstances);
      rawInstances.forEach(rawInstance => {
        if (
          !requiredInstanceKeys.every(key => rawInstance[key] !== undefined)
        ) {
          // eslint-disable-next-line no-console
          console.warn(
            `Ignoring NGP_VAN_INSTANCE ${JSON.stringify(
              rawInstance
            )} for organization ${
              organization.id
            } because it's missing a required key`
          );
          return;
        }

        const name = rawInstance.NAME;
        delete rawInstance.NAME; // eslint-disable-line no-param-reassign
        toReturn[name] = rawInstance;
      });
    }

    const defaultInstance = {
      NGP_VAN_APP_NAME: getConfig("NGP_VAN_APP_NAME", organization),
      NGP_VAN_API_KEY: getConfig("NGP_VAN_API_KEY", organization),
      NGP_VAN_DATABASE_MODE:
        getConfig("NGP_VAN_DATABASE_MODE", organization) ||
        DEFAULT_NGP_VAN_DATABASE_MODE
    };
    toReturn["Default"] = defaultInstance;

    return toReturn;
  };

  static getAuth = (organization, instanceName = "Default") => {
    const vanInstances = Van.getInstances(organization);
    const vanInstance = vanInstances[instanceName];

    if (!vanInstance) {
      throw new Error(`NGP VAN Instance ${instanceName} not found`);
    }

    const appName = vanInstance.NGP_VAN_APP_NAME;
    const apiKey = vanInstance.NGP_VAN_API_KEY;
    const databaseMode = vanInstance.NGP_VAN_DATABASE_MODE;

    if (!appName || !apiKey) {
      throw new Error(
        "Environment missing NGP_VAN_APP_NAME or NGP_VAN_API_KEY"
      );
    }

    const buffer = Buffer.from(`${appName}:${apiKey}|${databaseMode}`);
    return `Basic ${buffer.toString("base64")}`;
  };

  static makeUrl = (pathAndQuery, organization) => {
    const baseUrl =
      getConfig("NGP_VAN_API_BASE_URL", organization) ||
      DEFAULT_NGP_VAN_API_BASE_URL;
    return `${baseUrl}/${pathAndQuery}`;
  };
}
