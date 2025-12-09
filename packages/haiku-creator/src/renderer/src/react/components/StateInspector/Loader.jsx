import { Palette } from 'haiku-ui-common'
import * as Radium from 'radium'
import * as React from 'react'

// TODO: Make into a real loader, and move into ui-common

class Loader extends React.Component {
  render() {
    return (
      <div
        id="state-inspector-loader"
        style={{
          color: Palette.DARKER_ROCK2,
          marginLeft: 14,
          marginTop: 4,
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    )
  }
}

export default Radium(Loader)
