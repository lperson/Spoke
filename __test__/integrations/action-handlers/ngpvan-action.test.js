import { getClientChoiceData } from "../../../src/integrations/action-handlers/ngpvan-action";
import nock from "nock";

describe("ngpvn-action", () => {
  beforeEach(async () => {
    process.env.NGP_VAN_APP_NAME = "AVNY.003.hustle";
    process.env.NGP_VAN_API_KEY = "e8ea38bf-4564-6d45-20f8-96fdbf12823c";
    process.env.NGP_VAN_EXPORT_JOB_TYPE_ID = 8;
    process.env.NGP_VAN_WEBHOOK_URL = "https://e6f9b408.ngrok.io";
    process.env.NGP_VAN_MAXIMUM_LIST_SIZE = 300;
    process.env.NGP_VAN_CACHE_TTL = 30;
  });
  describe("#getClientChoiceData", async () => {
    let makeGetSurveyQuestionsNock;
    let makeGetActivistCodesNock;
    let makeGetCanvassResponsesResultCodesNock;

    beforeEach(async () => {
      makeGetSurveyQuestionsNock = () =>
        nock("https://api.securevan.com:443", {
          encodedQueryParams: true
        })
          .get("/v4/surveyQuestions")
          .reply(200, {
            items: [
              {
                surveyQuestionId: 378552,
                type: "GOTV",
                cycle: 2020,
                name: "2020VotePPE",
                mediumName: "2020VoteP",
                shortName: "2020",
                scriptQuestion:
                  "Can we count on you to vote in the 2020 Presidential Primary Election? How do you plan to vote?",
                status: "Active",
                responses: [
                  {
                    surveyResponseId: 1555791,
                    name: "Yes - Early",
                    mediumName: "YEa",
                    shortName: "E"
                  },
                  {
                    surveyResponseId: 1555792,
                    name: "Yes - Eday",
                    mediumName: "YEd",
                    shortName: "D"
                  },
                  {
                    surveyResponseId: 1555793,
                    name: "Yes - Absentee",
                    mediumName: "YAb",
                    shortName: "A"
                  },
                  {
                    surveyResponseId: 1555794,
                    name: "Maybe",
                    mediumName: "May",
                    shortName: "M"
                  },
                  {
                    surveyResponseId: 1555795,
                    name: "No",
                    mediumName: "No",
                    shortName: "N"
                  }
                ]
              },
              {
                surveyQuestionId: 381390,
                type: "GOTV",
                cycle: 2020,
                name: "2020VoteTime",
                mediumName: "2020VoteT",
                shortName: "2020",
                scriptQuestion: "What time of the day do you plan to vote?",
                status: "Active",
                responses: [
                  {
                    surveyResponseId: 1566012,
                    name: "Morning",
                    mediumName: "Mor",
                    shortName: "M"
                  },
                  {
                    surveyResponseId: 1566013,
                    name: "Afternoon",
                    mediumName: "Aft",
                    shortName: "A"
                  },
                  {
                    surveyResponseId: 1566014,
                    name: "Evening",
                    mediumName: "Eve",
                    shortName: "E"
                  }
                ]
              }
            ],
            nextPageLink: null,
            count: 2
          });
    });

    beforeEach(async () => {
      makeGetActivistCodesNock = () =>
        nock("https://api.securevan.com:443", {
          encodedQueryParams: true
        })
          .get("/v4/activistCodes")
          .reply(200, {
            items: [
              {
                activistCodeId: 4482459,
                type: "Constituency/Issue",
                name: "EdayIssue-PollWorker",
                mediumName: "EdayIssue",
                shortName: "Eda",
                description: null,
                scriptQuestion: null,
                status: "Active"
              },
              {
                activistCodeId: 4153148,
                type: "Constituency/Issue",
                name: "Opt-In: Cell Phone",
                mediumName: "Cell Phon",
                shortName: "Cel",
                description: "Opt-In: Cell Phone",
                scriptQuestion: null,
                status: "Active"
              }
            ],
            nextPageLink: null,
            count: 2
          });
    });

    beforeEach(async () => {
      makeGetCanvassResponsesResultCodesNock = () =>
        nock("https://api.securevan.com:443", {
          encodedQueryParams: true
        })
          .get("/v4/canvassResponses/resultCodes")
          .reply(200, [
            {
              resultCodeId: 18,
              name: "Busy",
              mediumName: "Busy",
              shortName: "BZ"
            },
            {
              resultCodeId: 17,
              name: "Call Back",
              mediumName: "CB",
              shortName: "CB"
            },
            {
              resultCodeId: 14,
              name: "Canvassed",
              mediumName: "Canv",
              shortName: "CV"
            },
            {
              resultCodeId: 13,
              name: "Come Back",
              mediumName: "CB",
              shortName: "CB"
            },
            {
              resultCodeId: 4,
              name: "Deceased",
              mediumName: "Dec",
              shortName: "DC"
            },
            {
              resultCodeId: 25,
              name: "Disconnected",
              mediumName: "Disc",
              shortName: "WX"
            },
            {
              resultCodeId: 22,
              name: "Do Not Call",
              mediumName: "DNC",
              shortName: "XC"
            },
            {
              resultCodeId: 131,
              name: "Do Not Email",
              mediumName: "DNE",
              shortName: "DE"
            },
            {
              resultCodeId: 130,
              name: "Do Not Text",
              mediumName: "DNT",
              shortName: "XT"
            },
            {
              resultCodeId: 23,
              name: "Do Not Walk",
              mediumName: "DNW",
              shortName: "XW"
            }
          ]);
    });

    it("returns what we expect", async () => {
      const getSurveyQuestionsNock = makeGetSurveyQuestionsNock();
      const getActivistCodesNock = makeGetActivistCodesNock();
      const getCanvassResponsesResultCodesNock = makeGetCanvassResponsesResultCodesNock();

      const clientChoiceData = await getClientChoiceData();
      const receivedItems = JSON.parse(clientChoiceData.data).items;

      const expectedItems = [
        {
          type: "SurveyResponse",
          name: "2020VotePPE - Yes - Early",
          details: JSON.stringify({
            surveyQuestionId: 378552,
            surveyResponseId: 1555791
          })
        },
        {
          type: "SurveyResponse",
          name: "2020VotePPE - Yes - Eday",
          details: JSON.stringify({
            surveyQuestionId: 378552,
            surveyResponseId: 1555792
          })
        },
        {
          type: "SurveyResponse",
          name: "2020VotePPE - Yes - Absentee",
          details: JSON.stringify({
            surveyQuestionId: 378552,
            surveyResponseId: 1555793
          })
        },
        {
          type: "SurveyResponse",
          name: "2020VotePPE - Maybe",
          details: JSON.stringify({
            surveyQuestionId: 378552,
            surveyResponseId: 1555794
          })
        },
        {
          type: "SurveyResponse",
          name: "2020VotePPE - No",
          details: JSON.stringify({
            surveyQuestionId: 378552,
            surveyResponseId: 1555795
          })
        },
        {
          type: "SurveyResponse",
          name: "2020VoteTime - Morning",
          details: JSON.stringify({
            surveyQuestionId: 381390,
            surveyResponseId: 1566012
          })
        },
        {
          type: "SurveyResponse",
          name: "2020VoteTime - Afternoon",
          details: JSON.stringify({
            surveyQuestionId: 381390,
            surveyResponseId: 1566013
          })
        },
        {
          type: "SurveyResponse",
          name: "2020VoteTime - Evening",
          details: JSON.stringify({
            surveyQuestionId: 381390,
            surveyResponseId: 1566014
          })
        },
        {
          type: "ActivistCode",
          name: "EdayIssue-PollWorker",
          details: JSON.stringify({
            activistCodeId: 4482459
          })
        },
        {
          type: "ActivistCode",
          name: "Opt-In: Cell Phone",
          details: JSON.stringify({
            activistCodeId: 4153148
          })
        }
      ];

      expect(receivedItems).toEqual(expectedItems);
      expect(clientChoiceData.expireSeconds).toEqual(30);

      getCanvassResponsesResultCodesNock.done();
      getActivistCodesNock.done();
      getSurveyQuestionsNock.done();
    });
  });
});
