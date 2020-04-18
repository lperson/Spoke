import { r, cacheableData } from "../../server/models";
import { getConfig } from "../../server/api/lib/config";
import Van from "../contact-loaders/ngpvan/util";
import { log } from "../../lib";

import httpRequest from "../../server/lib/http-request.js";

export const name = "ngpvan-action";

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
export async function available(organization, user) {
  return {
    result: true,
    expiresSeconds: 60
  };
}

// What happens when a texter saves the answer that triggers the action
// This is presumably the meat of the action
export async function processAction(
  questionResponse,
  interactionStep,
  campaignContactId
) {
  try {
    const contact = await cacheableData.campaignContact.load(campaignContactId);
    const campaign = await cacheableData.campaign.load(contact.campaign_id);
    const organization = await cacheableData.organization.load(
      campaign.organization_id
    );

    const answerActionsData = JSON.parse(
      (interactionStep || {}).answer_actions_data || "{}"
    );

    const answerActionsDataValue = JSON.parse(answerActionsData.value);

    const url = Van.makeUrl(
      `v4/people/${contact.external_id}/canvassResponses`,
      organization
    );

    const type = answerActionsDataValue.type;

    const body = {
      canvassContext: {
        contactTypeId: 37,
        inputTypeId: 11
      },
      ...(type === "CanvassResponse" && {
        resultCodeId: answerActionsDataValue.resultCodeId
      }),
      ...(type !== "CanvassResponse" && {
        responses: [answerActionsDataValue]
      })
    };

    log.debug("Sending contact update to VAN", {
      vanId: contact.external_id,
      body
    });

    await httpRequest(url, {
      method: "POST",
      retries: 0,
      timeout: 5000,
      headers: {
        Authorization: Van.getAuth(organization),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      validStatuses: [204],
      compress: false
    });
  } catch (caughtError) {
    log.error("Encountered exception in ngpvan.processAction", caughtError);
    throw caughtError;
  }
}

export async function getClientChoiceData(organization, user) {
  // survey questions
  // TODO statuses	query	string	Comma delimited list of statuses of Survey Questions. One or more of Active (default), Archived, and Inactive.
  // name	query	string	Filters to Survey Questions with names that start with the given input
  // type	query	string	Filters to Survey Questions of the given type
  // question	query	string	Filters to Survey Questions with script questions that contain the given input
  // cycle	query	int	A year in the format YYYY; filters to Survey Questions with the given cycle

  // The savedLists endpoint supports pagination; we are ignoring pagination now

  // activist codes
  // TODO
  // statuses	query	string	Comma delimited list of statuses of Activist Codes. One or more of Active (default), Archived, and Inactive.
  // name	query	string	Filters to Activist Codes with names that start with the given input
  // type	query	string	Filters to Activist Codes of the given type

  // The activst codes endpoint supports pagination; we are ignoring pagination now

  // canvass responses
  // TODO
  // inputTypeId	query	int	Optional; filter Result Codes to those available to the given Input Type
  // contactTypeId	query	int	Optional; filter Result Codes to those available to the given Contact Type

  // The activst codes endpoint supports pagination; we are ignoring pagination now

  const surveyQuestionsPromise = httpRequest(
    `https://api.securevan.com/v4/surveyQuestions`,
    {
      method: "GET",
      headers: {
        Authorization: Van.getAuth(organization)
      }
    }
  )
    .then(async response => await response.json())
    .catch(error => {
      const message = `Error retrieving survey questions from VAN ${error}`;
      log.error(message);
      throw new Error(message);
    });

  const activistCodesPromise = httpRequest(
    `https://api.securevan.com/v4/activistCodes`,
    {
      method: "GET",
      headers: {
        Authorization: Van.getAuth(organization)
      }
    }
  )
    .then(async response => await response.json())
    .catch(error => {
      const message = `Error retrieving activist codes from VAN ${error}`;
      log.error(message);
      throw new Error(message);
    });

  const canvassResultCodesPromise = httpRequest(
    `https://api.securevan.com/v4/canvassResponses/resultCodes`,
    {
      method: "GET",
      headers: {
        Authorization: Van.getAuth(organization)
      }
    }
  )
    .then(async response => await response.json())
    .catch(error => {
      const message = `Error retrieving canvass result codes from VAN ${error}`;
      log.error(message);
      throw new Error(message);
    });

  let surveyQuestionsResponse;
  let activistCodesResponse;
  let canvassResponsesResultCodesResponse;

  try {
    [
      surveyQuestionsResponse,
      activistCodesResponse,
      canvassResponsesResultCodesResponse
    ] = await Promise.all([
      surveyQuestionsPromise,
      activistCodesPromise,
      canvassResultCodesPromise
    ]);
  } catch (caughtError) {
    return {
      data: `${JSON.stringify({
        error:
          "Failed to load surveyQuestions, activistCodes or canvassResultCodes from VAN"
      })}`
    };
  }

  const surveyResponses = surveyQuestionsResponse.items.reduce(
    (accumulator, surveyQuestion) => {
      const responses = surveyQuestion.responses.map(surveyResponse => ({
        name: `${surveyQuestion.name} - ${surveyResponse.name}`,
        details: JSON.stringify({
          type: "SurveyResponse",
          surveyQuestionId: surveyQuestion.surveyQuestionId,
          surveyResponseId: surveyResponse.surveyResponseId
        })
      }));
      accumulator.push(...responses);
      return accumulator;
    },
    []
  );

  const activistCodes = activistCodesResponse.items.map(activistCode => ({
    name: activistCode.name,
    details: JSON.stringify({
      type: "ActivistCode",
      action: "Apply",
      activistCodeId: activistCode.activistCodeId
    })
  }));

  const canvassResponses = canvassResponsesResultCodesResponse.map(
    canvassResponse => ({
      name: canvassResponse.name,
      details: JSON.stringify({
        type: "CanvassResponse",
        resultCodeId: canvassResponse.resultCodeId
      })
    })
  );

  const vanActions = [];
  vanActions.push(...surveyResponses, ...activistCodes, ...canvassResponses);

  return {
    data: `${JSON.stringify({ items: vanActions })}`,
    expiresSeconds: Number(getConfig("NGP_VAN_CACHE_TTL")) || 300
  };
}
