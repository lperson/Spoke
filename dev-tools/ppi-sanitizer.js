#!/usr/bin/env dev-tools/babel-run

const papa = require("papaparse");
const fs = require("fs");
import chance from "chance";

class VanDataAnonymizer {
  static chance = new chance();
  constructor(data) {
    this.data = {
      ...data
    };

    Object.keys(this.data).forEach(key => {
      this.transformer(key);
    });
  }

  transformer = key => {
    let newValue = this.data[key];
    if (key.match(/lastname/i)) {
      newValue = VanDataAnonymizer.chance.last();
    } else if (key.match(/firstname/i)) {
      newValue = VanDataAnonymizer.chance.first();
    } else if (key.match(/.*Phone$/i)) {
      if (newValue) {
        newValue = VanDataAnonymizer.chance.phone();
      }
    } else if (key.match(/^address$/i)) {
      if (newValue) {
        newValue = this.address();
      }
    } else if (key.match(/^employer$/)) {
      if (newValue) {
        newValue = VanDataAnonymizer.chance.company();
      }
    } else if (key.match(/streetaddress/i)) {
      if (newValue) {
        newValue = this.street();
      }
    } else if (key.match(/city/i)) {
      if (newValue) {
        newValue = this.city();
      }
    } else if (key.match(/^state$/i)) {
      if (newValue) {
        newValue = this.state();
      }
    } else if (key.match(/zip/i)) {
      if (newValue) {
        newValue = this.zip();
      }
    }

    this.data[key] = newValue;
  };

  addressPart = (part, chance_function, parameters) => {
    if (!this[part]) {
      this[part] = VanDataAnonymizer.chance[chance_function](parameters);
    }
    return this[part];
  };

  address = () =>
    `${this.street()}, ${this.city()}, ${this.state()} ${this.zip()}`;

  street = () => this.addressPart("_street", "address", { short_suffix: true });

  city = () => this.addressPart("_city", "city");

  state = () => this.addressPart("_state", "state");

  zip = () => this.addressPart("_zip", "zip");
}

async function main() {
  const readStream = fs.createReadStream(process.argv[3]);
  papa.parse(readStream, {
    skipEmptyLines: true,
    header: true,
    complete: ({ data, meta, errors }, file) => {
      const anonymized = data.map(datum => {
        const anonymizer = new VanDataAnonymizer(datum);
        return anonymizer.data;
      });
      console.log(papa.unparse(anonymized, { columns: meta.fields }));
    }
  });
}

main().catch(error => {
  console.log(error);
});
