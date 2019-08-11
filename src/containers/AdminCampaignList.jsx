import PropTypes from 'prop-types'
import React from 'react'
import CampaignList from './CampaignsList'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import ContentAdd from 'material-ui/svg-icons/content/add'
import ArchiveIcon from 'material-ui/svg-icons/content/archive'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert'
import loadData from './hoc/load-data'
import { withRouter } from 'react-router'
import gql from 'graphql-tag'
import theme from '../styles/theme'
import LoadingIndicator from '../components/LoadingIndicator'
import wrapMutations from './hoc/wrap-mutations'
import DropDownMenu from 'material-ui/DropDownMenu'
import IconMenu from 'material-ui/IconMenu'
import { MenuItem } from 'material-ui/Menu'
import { dataTest } from '../lib/attributes'
import IconButton from 'material-ui/IconButton/IconButton'
import SortBy, {
  ID_ASC_SORT,
  ID_DESC_SORT,
} from '../components/AdminCampaignList/SortBy'
import Paper from 'material-ui/Paper'
import Search from '../components/Search'
import { StyleSheet, css } from 'aphrodite'

const styles = StyleSheet.create({
  settings: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
  },
})

const defaultSort = isArchived =>
  isArchived ? ID_DESC_SORT.value : ID_ASC_SORT.value

class AdminCampaignList extends React.Component {
  state = {
    isLoading: false,
    campaignsFilter: {
      isArchived: false,
      searchString: '',
    },
    archiveMultiple: false,
    campaignsToArchive: {},
    sortBy: defaultSort(false),
  }

  handleClickNewButton = async () => {
    const { organizationId } = this.props.params
    this.setState({ isLoading: true })
    const newCampaign = await this.props.mutations.createCampaign({
      title: 'New Campaign',
      description: '',
      dueBy: null,
      organizationId,
      contacts: [],
      interactionSteps: {
        script: '',
      },
    })
    if (newCampaign.errors) {
      alert('There was an error creating your campaign')
      throw new Error(newCampaign.errors)
    }

    this.props.router.push(
      `/admin/${organizationId}/campaigns/${newCampaign.data.createCampaign.id}/edit?new=true`
    )
  }

  handleClickArchiveButton = async keys => {
    if (keys.length) {
      this.setState({ isLoading: true })
      await this.props.mutations.archiveCampaigns(keys)
      this.setState({
        archiveMultiple: false,
        isLoading: false,
        campaignsToArchive: {},
      })
    }
  }

  handleFilterChange = (event, index, isArchived) => {
    this.setState({
      campaignsFilter: {
        isArchived,
      },
      sortBy: defaultSort(isArchived),
    })
  }

  handleChecked = ({ campaignId, checked }) => {
    this.setState(prevState => {
      const { campaignsToArchive } = prevState
      // checked has to be reversed here because the onTouchTap
      // event fires before the input is checked.
      if (!checked) {
        campaignsToArchive[campaignId] = !checked
      } else {
        delete campaignsToArchive[campaignId]
      }
      return { campaignsToArchive }
    })
  }

  toggleStateWithDelay = (property, delay) => {
    setTimeout(() => {
      this.setState(prevState => ({ [property]: !prevState[property] }))
    }, delay)
  }

  handleSortByChanged = sortBy => {
    this.setState({ sortBy })
  }

  handleSearchRequested = searchString => {
    const campaignsFilter = {
      ...this.state.campaignsFilter,
      searchString,
    }
    this.setState({ campaignsFilter })
  }

  handleCancelSearch = () => {
    const campaignsFilter = {
      ...this.state.campaignsFilter,
      searchString: '',
    }
    this.setState({ campaignsFilter })
  }

  renderArchivedAndSortBy = () => {
    return (
      !this.state.archiveMultiple && (
        <span>
          <span>
            <DropDownMenu
              value={this.state.campaignsFilter.isArchived}
              onChange={this.handleFilterChange}
            >
              <MenuItem value={false} primaryText="Current" />
              <MenuItem value primaryText="Archived" />
            </DropDownMenu>
            <SortBy
              onChange={this.handleSortByChanged}
              sortBy={this.state.sortBy}
            />
          </span>
        </span>
      )
    )
  }

  renderSearch = () => {
    return (
      !this.state.archiveMultiple && (
        <Search
          onSearchRequested={this.handleSearchRequested}
          searchString={this.state.campaignsFilter.searchString}
          onCancelSearch={this.handleCancelSearch}
          hintText="Search for campaign title. Hit enter to search."
        />
      )
    )
  }

  renderFilters = () => (
    <Paper className={css(styles.settings)} zDepth={3}>
      <span>
        {this.props.params.adminPerms && this.renderArchiveMultiple()}
        {this.renderArchivedAndSortBy()}
      </span>
      <span>{this.renderSearch()}</span>
    </Paper>
  )

  renderArchiveMultiple() {
    return (
      <IconMenu
        iconButtonElement={
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        }
        style={{ bottom: '13px' }}
      >
        {/*
          The IconMenu component delays hiding the menu after it is
          clicked for 200ms. This looks nice, so the state change is
          delayed for 201ms to avoid switching the menu text before the
          menu is hidden.
        */}
        {this.state.archiveMultiple ? (
          <MenuItem
            primaryText="Cancel"
            onClick={() => {
              this.toggleStateWithDelay('archiveMultiple', 250)
            }}
          />
        ) : (
          <MenuItem
            primaryText="Archive multiple campaigns"
            onClick={() => {
              this.toggleStateWithDelay('archiveMultiple', 250)
            }}
          />
        )}
      </IconMenu>
    )
  }

  renderActionButton() {
    if (this.state.archiveMultiple) {
      const keys = Object.keys(this.state.campaignsToArchive)
      return (
        <FloatingActionButton
          {...dataTest('archiveCampaigns')}
          style={theme.components.floatingButton}
          onTouchTap={() => this.handleClickArchiveButton(keys)}
          disabled={!keys.length}
        >
          <ArchiveIcon />
        </FloatingActionButton>
      )
    }
    return (
      <FloatingActionButton
        {...dataTest('addCampaign')}
        style={theme.components.floatingButton}
        onTouchTap={this.handleClickNewButton}
      >
        <ContentAdd />
      </FloatingActionButton>
    )
  }

  render() {
    const { adminPerms } = this.props.params
    return (
      <div>
        {this.renderFilters()}
        {this.state.isLoading ? (
          <LoadingIndicator />
        ) : (
          <CampaignList
            campaignsFilter={this.state.campaignsFilter}
            sortBy={this.state.sortBy}
            organizationId={this.props.params.organizationId}
            adminPerms={adminPerms}
            selectMultiple={this.state.archiveMultiple}
            handleChecked={this.handleChecked}
          />
        )}

        {adminPerms && this.renderActionButton()}
      </div>
    )
  }
}

AdminCampaignList.propTypes = {
  params: PropTypes.object,
  mutations: PropTypes.exact({
    createCampaign: PropTypes.func,
    archiveCampaigns: PropTypes.func,
  }),
  router: PropTypes.object,
}

const mapMutationsToProps = () => ({
  createCampaign: campaign => ({
    mutation: gql`
      mutation createBlankCampaign($campaign: CampaignInput!) {
        createCampaign(campaign: $campaign) {
          id
        }
      }
    `,
    variables: { campaign },
  }),
  archiveCampaigns: ids => ({
    mutation: gql`
      mutation archiveCampaigns($ids: [String!]) {
        archiveCampaigns(ids: $ids) {
          id
        }
      }
    `,
    variables: { ids },
  }),
})

export default loadData(wrapMutations(withRouter(AdminCampaignList)), {
  mapMutationsToProps,
})
