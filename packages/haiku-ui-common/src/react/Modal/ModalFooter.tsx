import * as React from 'react';

const STYLES: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  right: '20px',
};

export interface ModalFooterProps {
  style?: React.CSSProperties;

  children?: React.ReactNode;}

export class ModalFooter extends React.PureComponent<ModalFooterProps> {
  render () {
    return (
      <div style={{...STYLES, ...this.props.style}}>
        {this.props.children}
      </div>
    );
  }
}
