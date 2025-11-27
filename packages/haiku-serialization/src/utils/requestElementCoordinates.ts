import logger from './LoggerInstance'

interface RequestParams {
  currentWebview: string
  requestedWebview: string
  selector: string
  shouldNotifyEnvoy?: boolean
  tourClient?: { receiveElementCoordinates: (view: string, rect: { top: number, left: number, width: number, height: number }) => void }
}

export default function requestElementCoordinates(
  { currentWebview, requestedWebview, selector, shouldNotifyEnvoy, tourClient }: RequestParams,
  maxNumberOfTries = 15,
  currentNumberOfTries = 0,
) {
  if (currentWebview !== requestedWebview)
    return
  const loader = document.getElementById('js-helper-project-loader')
  if (loader) {
    return setTimeout(() => {
      requestElementCoordinates({ currentWebview, requestedWebview, selector, shouldNotifyEnvoy, tourClient }, maxNumberOfTries, currentNumberOfTries)
    }, 300)
  }
  logger.info(`[${currentWebview}] handleRequestElementCoordinates`, selector, currentWebview)
  const domElement = document.querySelector(selector)
  if (domElement) {
    const { top, left, width, height } = (domElement as Element).getBoundingClientRect()
    if (shouldNotifyEnvoy && tourClient) {
      logger.info(`[${currentWebview}] receive element coordinates`, selector, top, left)
      tourClient.receiveElementCoordinates(currentWebview, { top, left, width, height })
    }
  }
  else {
    if (maxNumberOfTries >= currentNumberOfTries) {
      setTimeout(() => {
        requestElementCoordinates({ currentWebview, requestedWebview, selector, shouldNotifyEnvoy, tourClient }, maxNumberOfTries, currentNumberOfTries + 1)
      }, 300)
    }
    else {
      logger.error(`[${currentWebview}] Error fetching ${selector} in webview ${currentWebview}`)
    }
  }
}
