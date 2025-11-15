import * as React from 'react';
import PropTypes from 'prop-types';
import Bolt from 'haiku-ui-common/lib/react/icons/Bolt';

const STYLES = {
  wrapper: {
    cursor: 'pointer',
    width: '100%',
    height: '100%',
    display: 'inline-block',
  },
};

class EventHandlerTriggerer extends React.PureComponent {
  constructor (props) {
    super(props);
    this.triggerEventHandlers = this.triggerEventHandlers.bind(this);
  }

  triggerEventHandlers () {
    this.props.onEventHandlerTriggered(this.props.element.getPrimaryKey());
  }

  render () {
    return (
      <span onClick={this.triggerEventHandlers} style={STYLES.wrapper}>
        <Bolt color={this.props.boltColor} />
      </span>
    );
  }
}

EventHandlerTriggerer.propTypes = {
  element: PropTypes.object.isRequired,
  onEventHandlerTriggered: PropTypes.func.isRequired,
  boltColor: PropTypes.string.isRequired,
};

export default EventHandlerTriggerer;
