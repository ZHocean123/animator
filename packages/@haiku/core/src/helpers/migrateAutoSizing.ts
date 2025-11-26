import { AUTO_SIZING_TOKEN } from '../Layout3D'

function migrateAutoSizing(propertyGroup) {
  migrateAutoSizingForProperty(propertyGroup, 'sizeAbsolute.x')
  migrateAutoSizingForProperty(propertyGroup, 'sizeAbsolute.y')
}

function migrateAutoSizingForProperty(propertyGroup, propertyName: string) {
  if (propertyGroup[propertyName]) {
    for (const keyframeMs in propertyGroup[propertyName]) {
      if (propertyGroup[propertyName][keyframeMs].value === true) {
        propertyGroup[propertyName][keyframeMs].value = AUTO_SIZING_TOKEN
      }
    }
  }
}

export default migrateAutoSizing
