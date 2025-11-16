import * as React from 'react';
import PropTypes from 'prop-types';
import RowSegments from './RowSegments';

export default class PropertyTimelineSegments extends React.Component {
  render () {
    return (
      <div
        className="property-timeline-segments">
        <RowSegments
          scope="PropertyTimelineSegments"
          includeDraggables={true}
          row={this.props.row}
          showBezierEditor={this.props.showBezierEditor}
          component={this.props.component}
          timeline={this.props.timeline}
          rowHeight={this.props.rowHeight}
          preventDragging={this.props.preventDragging} />
      </div>
    );
  }
}

PropertyTimelineSegments.propTypes = {
  row: PropTypes.object.isRequired,
  component: PropTypes.object.isRequired,
  timeline: PropTypes.object.isRequired,
  rowHeight: PropTypes.number.isRequired,
  preventDragging: PropTypes.bool.isRequired,
  showBezierEditor: PropTypes.func,
};
