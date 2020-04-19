import gql from "graphql-tag";

export const schema = gql`
  input CampaignsFilter {
    isArchived: Boolean
    campaignId: Int
    campaignIds: [Int]
    listSize: Int
    pageSize: Int
  }

  type CampaignStats {
    sentMessagesCount: Int
    receivedMessagesCount: Int
    optOutsCount: Int
  }

  type IngestMethod {
    name: String!
    displayName: String
    clientChoiceData: String
    success: Boolean
    result: String
    reference: String
    contactsCount: Int
    deletedOptouts: Int
    deletedDupes: Int
    updatedAt: Date
  }

  type JobRequest {
    id: String
    jobType: String
    assigned: Boolean
    status: Int
    resultMessage: String
  }

  type ActionChoice {
    name: String!
    details: String!
  }

  type Action {
    name: String
    display_name: String
    instructions: String
    clientChoiceData: [ActionChoice]
  }

  type Campaign {
    id: ID
    organization: Organization
    title: String
    description: String
    dueBy: Date
    isStarted: Boolean
    isArchived: Boolean
    creator: User
    texters: [User]
    assignments(assignmentsFilter: AssignmentsFilter): [Assignment]
    interactionSteps: [InteractionStep]
    contacts: [CampaignContact]
    contactsCount: Int
    hasUnassignedContacts: Boolean
    hasUnassignedContactsForTexter: Boolean
    hasUnsentInitialMessages: Boolean
    customFields: [String]
    cannedResponses(userId: String): [CannedResponse]
    stats: CampaignStats
    pendingJobs: [JobRequest]
    availableActions: [Action]
    ingestMethodsAvailable: [IngestMethod]
    ingestMethod: IngestMethod
    useDynamicAssignment: Boolean
    introHtml: String
    primaryColor: String
    logoImageUrl: String
    editors: String
    cacheable: Boolean
    overrideOrganizationTextingHours: Boolean
    textingHoursEnforced: Boolean
    textingHoursStart: Int
    textingHoursEnd: Int
    timezone: String
  }

  type CampaignsList {
    campaigns: [Campaign]
  }

  union CampaignsReturn = PaginatedCampaigns | CampaignsList

  type PaginatedCampaigns {
    campaigns: [Campaign]
    pageInfo: PageInfo
  }
`;
