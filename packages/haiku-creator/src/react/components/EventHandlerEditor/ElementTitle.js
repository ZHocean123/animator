import * as React from 'react';
import PropTypes from 'prop-types';
import isNumeric from 'haiku-ui-common/lib/helpers/isNumeric';
import {TrashIconSVG} from 'haiku-ui-common/lib/react/OtherIcons';
import Palette from 'haiku-ui-common/lib/Palette';
import truncate from 'haiku-ui-common/lib/helpers/truncate';

const STYLES = {
  wrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: Palette.PALE_GRAY,
    fontFamily: 'Fira Sans',
    fontSize: '15px',
    fontStyle: 'italic',
    fontWeight: 500,
  },
  trashIcon: {
    backgroundColor: Palette.SPECIAL_COAL,
    padding: '4px 10px',
    borderRadius: '4px',
  },
  trashIconColor: Palette.ROCK,
};

class ElementTitle extends React.PureComponent {
  get elementTitle () {
    return this.props.element ? truncate(this.props.element.getTitle(), 16) : '(unknown)';
  }

  get title () {
    return isNumeric(this.props.currentFrame) ? `Frame ${this.props.currentFrame}` : this.elementTitle;
  }

  get breadcrumb () {
    if (!isNumeric(this.props.currentFrame) && this.props.currentEvent) {
      return '> ' + this.props.currentEvent;
    }

    return '';
  }

  render () {
    return (
      <div style={STYLES.wrapper}>
        <h3 style={STYLES.title}>{`${this.title} Actions ${this.breadcrumb}`}</h3>
        {(isNumeric(this.props.currentFrame) || this.props.currentEvent) &&
          <button onClick={this.props.onEditorRemoved} style={STYLES.trashIcon}>
            <TrashIconSVG color={STYLES.trashIconColor} />
          </button>
        }
      </div>
    );
  }
}

ElementTitle.propTypes = {
  element: PropTypes.object,
  onEditorRemoved: PropTypes.func.isRequired,
  currentFrame: PropTypes.number,
  currentEvent: PropTypes.string,
};

export default ElementTitle;
