import { NodeSDK } from "@opentelemetry/sdk-node"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"

let observabilitySdk: NodeSDK | undefined

export async function bootstrapPlatformInstrumentation(): Promise<void> {
  if (observabilitySdk) {
    return
  }

  observabilitySdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  })

  await observabilitySdk.start()
}
