import React from "react";
import AutoComplete from "material-ui/AutoComplete";
import { dataSourceItem } from "../../components/utils";

import GSFormField from "./GSFormField";

export default class GSSAutoComplete extends GSFormField {
  constructor(props) {
    super(props);
    this.state = {
      searchText: "",
      data: undefined
    };
  }

  createMenuItems() {
    return this.props.choices.map(({ value, label }) =>
      dataSourceItem(label, value)
    );
  }

  render = () => (
    <AutoComplete
      autoFocus
      onFocus={() => {
        this.setState({ searchText: "", data: undefined });
        this.props.onChange(undefined);
      }}
      onUpdateInput={searchText => {
        this.setState({ searchText });
        if (searchText.trim().length === 0) {
          this.props.onChange(undefined);
        }
      }}
      searchText={this.state.searchText}
      filter={AutoComplete.caseInsensitiveFilter}
      hintText={this.props.hintText}
      dataSource={this.createMenuItems()}
      onNewRequest={value => {
        // If you're searching but get no match, value is a string
        // representing your search term, but we only want to handle matches
        if (typeof value === "object") {
          const data = value.rawValue;
          this.setState({ data });
          this.props.onChange(
            JSON.stringify({
              data,
              searchText: this.state.searchText
            })
          );
        } else {
          // if it matches one item, that's their selection
          const regex = new RegExp(`.*${value}.*`, "i");
          const matches = selectData.filter(item => regex.test(item.text));

          if (matches.length === 1) {
            const data = matches[0].rawValue;
            const searchText = matches[0].text;
            this.setState({ searchText, data });
            this.props.onChange({
              data,
              searchText: this.state.searchText
            });
          }
        }
      }}
    />
  );
}
