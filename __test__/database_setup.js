import '../src/server/models'

import {sleep} from '../src/workers/lib'

async function pause() {
  await sleep(10000)
}

pause().then(() => {process.exit()}).catch((e) => process.exit(console.log(e)))
