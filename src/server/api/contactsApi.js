import { r } from '../models'
import _ from 'lodash'
import { getTimezoneByZip, getOptOutSubQuery } from '../../workers/jobs'

import { getValidatedData } from '../../lib'

function campaignStatusShortCircuit(campaign, res) {
  let message = ''
  if (campaign.is_archived) {
    message = 'Campaign is archived'
  } else if (campaign.is_started) {
    message = 'Campaign is started'
  }

  if (message) {
    res.writeHead(403)
    res.end(message)
    return true
  }

  return false
}

// TODO(lperson) enforce auth
export default async function contactsApi(req, res) {
  const orgId = req.params.orgId
  const campaignId = req.params.campaignId

  if (!['GET', 'DELETE', 'POST'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, POST, DELETE' })
    res.end('Not allowed')
    return
  }

  const [campaign] = await r
    .knex('campaign')
    .select()
    .where({ organization_id: orgId, id: campaignId })

  if (!campaign) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  if (['DELETE', 'POST'].includes(req.method)) {
    if (campaignStatusShortCircuit(campaign, res)) {
      return
    }
  }

  let resp = null

  if (req.method === 'GET') {
    const count = await r.getCount(
      r.knex('campaign_contact').where({ campaign_id: campaignId })
    )

    resp = {
      contacts: {
        count: parseInt(count)
      },
      status: {
        started: campaign.is_started,
        archived: campaign.is_archived
      }
    }
  } else if (req.method === 'DELETE') {
    const deleted = await r
      .knex('campaign_contact')
      .where({ campaign_id: campaignId })
      .delete()

    resp = { contacts: { deleted } }
  } else if (req.method === 'POST') {
    const { validationStats, validatedData } = getValidatedData(req.body, [])

    const successResponse = {
      invalid: _.concat(
        validationStats.invalidCellRows,
        validationStats.missingCellRows
      ),
      dupes_in_batch: validationStats.dupeCount,
      number_submitted: req.body.length
    }

    let validatedContactsToSave = validatedData

    if (!('duplicate_existing' in req.query)) {
      const existingContacts = await r
        .knex('campaign_contact')
        .select('cell')
        .whereIn('cell', validatedData.map(contact => contact.cell))
        .andWhere({ campaign_id: campaignId })

      const existingContactCells = new Set(
        existingContacts.map(contact => contact.cell)
      )

      const dedupedContactsToSave = _.filter(
        validatedData,
        contact => !existingContactCells.has(contact.cell)
      )

      successResponse.dupes_in_campaign =
        validatedData.length - dedupedContactsToSave.length

      validatedContactsToSave = dedupedContactsToSave
    }

    const standardFields = [
      'first_name',
      'last_name',
      'cell',
      'external_id',
      'zip',
      'timezone_offset'
    ]

    const contactsToSavePromises = validatedContactsToSave.map(
      async contact => {
        const contactToSave = _.pick(contact, standardFields)
        const customFields = _.omit(contact, standardFields)
        contactToSave.custom_fields = JSON.stringify(customFields)
        if (!contactToSave.timezone_offset) {
          contactToSave.timezone_offset = await getTimezoneByZip(
            contactToSave.zip
          )
        }
        return contactToSave
      }
    )

    const contactsToSave = await Promise.all(contactsToSavePromises)

    await r.knex
      .transaction(async tr => {
        await tr
          .batchInsert(
            'campaign_contact',
            contactsToSave.map(row => {
              row.campaign_id = campaignId
              return _.omitBy(row, v => v === null)
            }),
            req.body.length
          )
          .then(async () => {
            const optOutCellCount = await tr('campaign_contact')
              .whereIn('cell', getOptOutSubQuery(orgId))
              .where('campaign_id', campaignId)
              .delete()

            successResponse.opted_out = optOutCellCount
            successResponse.added =
              validatedContactsToSave.length - optOutCellCount
          })
      })
      .then(function() {
        resp = successResponse
      })
      .catch(function(error) {
        resp = { error }
        console.log(error)
      })
  }

  if (resp) {
    resp = { resp }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(resp))
  } else {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}