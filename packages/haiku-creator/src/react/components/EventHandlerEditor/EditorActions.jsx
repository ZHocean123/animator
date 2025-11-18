import * as React from 'react';
import PropTypes from 'prop-types';
import Palette from 'haiku-ui-common/lib/Palette.mjs';

const STYLES = {
  button: {
    height: '25px',
    color: Palette.PALE_GRAY,
    zIndex: 10000,
    fontSize: '11px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    borderRadius: '2px',
    padding: '5px 25px',
  },
  doneButton: {
    backgroundColor: Palette.BLACK,
  },
};

class EditorActions extends React.PureComponent {
  render() {
    return (
      <div style={STYLES.buttonsWrapper}>
        <button
          onClick={this.props.onCancel}
          style={STYLES.button}
        >
          Cancel
        </button>
        <button
          onClick={(event) => {
            if (!this.props.isSaveDisabled) {
              this.props.onSave();
            }
          }}
          style={{ ...STYLES.button, ...STYLES.doneButton, opacity: this.props.isSaveDisabled ? 0.5 : 1 }}
          title={this.props.title}
        >
          Done
        </button>
      </div>
    );
  }
}

EditorActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EditorActions;
