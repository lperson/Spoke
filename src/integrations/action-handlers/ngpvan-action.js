import { r, cacheableData } from "../../server/models";
import _ from "lodash";
import { getConfig } from "../../server/api/lib/config";

const getVanAuth = () => {
  const buffer = Buffer.from(
    `${getConfig("NGP_VAN_APP_NAME")}:${getConfig("NGP_VAN_API_KEY")}|0`
  );
  return `Basic ${buffer.toString("base64")}`;
};

import HttpRequest from "../../server/lib/http-request.js";

// What the user sees as the option
export const displayName = () => "NGPVAN action";

// The Help text for the user after selecting the action
export const instructions = () =>
  `This action is for reporting the results of interactions
   with contacts to NGPVAN`;

// return true, if the action is usable and available for the organizationId
// Sometimes this means certain variables/credentials must be setup
// either in environment variables or organization.features json data
// Besides this returning true, "test-action" will also need to be added to
// process.env.ACTION_HANDLERS
export async function available(organizationId) {
  return true;
}

// What happens when a texter saves the answer that triggers the action
// This is presumably the meat of the action
export async function processAction(
  questionResponse,
  interactionStep,
  campaignContactId
) {
  const contact = await cacheableData.campaignContact.load(campaignContactId);
  const customFields = JSON.parse(contact.custom_fields || "{}");
  if (customFields) {
    customFields["processed_test_action"] = "completed";
  }

  await r
    .knex("campaign_contact")
    .where("campaign_contact.id", campaignContactId)
    .update("custom_fields", JSON.stringify(customFields));
}

export async function getClientChoiceData(organization, user) {
  let surveyQuestionsResponse;
  let activistCodesResponse;
  let canvassResponsesResultCodesResponse;

  // survey questions
  try {
    // TODO statuses	query	string	Comma delimited list of statuses of Survey Questions. One or more of Active (default), Archived, and Inactive.
    // name	query	string	Filters to Survey Questions with names that start with the given input
    // type	query	string	Filters to Survey Questions of the given type
    // question	query	string	Filters to Survey Questions with script questions that contain the given input
    // cycle	query	int	A year in the format YYYY; filters to Survey Questions with the given cycle

    // The savedLists endpoint supports pagination; we are ignoring pagination now
    const response = await HttpRequest(
      `https://api.securevan.com/v4/surveyQuestions`,
      {
        method: "GET",
        headers: {
          Authorization: getVanAuth()
        }
      }
    );
    surveyQuestionsResponse = await response.json();
  } catch (error) {
    const message = `Error retrieving survey questions from VAN ${error}`;
    // eslint-disable-next-line no-console
    return { data: `${JSON.stringify({ error: message })}` };
  }

  // activist codes
  try {
    // TODO
    // statuses	query	string	Comma delimited list of statuses of Activist Codes. One or more of Active (default), Archived, and Inactive.
    // name	query	string	Filters to Activist Codes with names that start with the given input
    // type	query	string	Filters to Activist Codes of the given type

    // The activst codes endpoint supports pagination; we are ignoring pagination now
    const response = await HttpRequest(
      `https://api.securevan.com/v4/activistCodes`,
      {
        method: "GET",
        headers: {
          Authorization: getVanAuth()
        }
      }
    );
    activistCodesResponse = await response.json();
  } catch (error) {
    const message = `Error retrieving activist codes from VAN ${error}`;
    // eslint-disable-next-line no-console
    return { data: `${JSON.stringify({ error: message })}` };
  }

  // canvass responses
  try {
    // TODO
    // inputTypeId	query	int	Optional; filter Result Codes to those available to the given Input Type
    // contactTypeId	query	int	Optional; filter Result Codes to those available to the given Contact Type

    // The activst codes endpoint supports pagination; we are ignoring pagination now
    const response = await HttpRequest(
      `https://api.securevan.com/v4/canvassResponses/resultCodes`,
      {
        method: "GET",
        headers: {
          Authorization: getVanAuth()
        }
      }
    );
    canvassResponsesResultCodesResponse = await response.json();
  } catch (error) {
    const message = `Error canvass result codes from VAN ${error}`;
    // eslint-disable-next-line no-console
    return { data: `${JSON.stringify({ error: message })}` };
  }

  const vanActions = [];
  surveyQuestionsResponse.items.forEach(surveyQuestion => {
    const responses = surveyQuestion.responses.map(surveyResponse => ({
      name: `${surveyQuestion.name} - ${surveyResponse.name}`,
      details: JSON.stringify({
        type: "SurveyResponse",
        surveyQuestionId: surveyQuestion.surveyQuestionId,
        surveyResponseId: surveyResponse.surveyResponseId
      })
    }));
    vanActions.push(...responses);
  });

  const activistCodes = activistCodesResponse.items.map(activistCode => ({
    name: activistCode.name,
    details: JSON.stringify({
      type: "ActivistCode",
      activistCodeId: activistCode.activistCodeId
    })
  }));

  vanActions.push(...activistCodes);

  return {
    data: `${JSON.stringify({ items: vanActions })}`,
    expiresSeconds: Number(getConfig("NGP_VAN_CACHE_TTL")) || 300
  };
}
