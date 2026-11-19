// Runs before the test with no network and writes SHIPPING_ADDRESS for {{env:SHIPPING_ADDRESS}}.
import { writeFile } from 'node:fs/promises'
import { randomInt } from 'node:crypto'

const address = `${randomInt(100, 1000)} Cedar Lane`
await writeFile('/tmp/agent-qa.env', `SHIPPING_ADDRESS="${address}"\n`, 'utf-8')
