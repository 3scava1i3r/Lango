import { Client, AccountId, PrivateKey } from '@hiero-ledger/sdk'

const operatorId = process.env.HEDERA_OPERATOR_ID!
const operatorKey = process.env.HEDERA_OPERATOR_KEY!

let client: Client

export function getHederaClient(): Client {
  if (!client) {
    client = Client.forTestnet()
    client.setOperator(
      AccountId.fromString(operatorId),
      PrivateKey.fromStringECDSA(operatorKey),
    )
  }
  return client
}

export function getHcsTopicId(): string {
  return process.env.HCS_AUDIT_TOPIC_ID || ''
}
