import * as React from 'react';
import {CustomPicker, CustomPickerProps} from 'react-color';
import {Alpha, Checkboard, EditableInput, Hue, Saturation} from 'react-color/lib/components/common';
import {EditableInputStyles} from 'react-color/lib/components/common/EditableInput';
import {DisplayValues} from '../../helpers/uiColorHelpers';
import Palette from '../../Palette';

declare module 'react-color' {
  interface HSVColor {
    a: number;
    h: number;
    s: number;
    v: number;
  }

  interface HSLColor {
    a: number;
    h: number;
    s: number;
    l: number;
  }

  interface RGBColor {
    a: number;
    r: number;
    g: number;
    b: number;
  }

  interface ColorState {
    hex: string;
    hsl: HSLColor;
    hsv: HSVColor;
    rgb: RGBColor;
    oldHue: number;
  }

  interface CustomPickerProps<A = any> {
    hex?: string;
    hsl?: HSLColor;
    hsv?: HSVColor;
    rgb?: RGBColor;
    oldHue?: number;
    label?: string;
    onChange?: (color: any) => void;
  }

  interface EditableInputProps {
    arrowOffset?: number;
    style?: any;
    children?: React.ReactNode;
  }

  interface ColorResult {
    hex: string;
    hsl: HSLColor;
    hsv: HSVColor;
    rgb: RGBColor;
    source: string;
  }
}

const INPUT_STYLES: EditableInputStyles = {
  input: {
    border: `1px solid ${Palette.MEDIUM_COAL}`,
    width: '100%',
    color: Palette.PALE_GRAY,
    fontFamily: 'Fira Sans',
    caretColor: Palette.LIGHTEST_PINK,
    padding: '3px 6px',
    borderRadius: 4,
    background: Palette.COAL,
  },
  label: {},
  wrap: {
    width: '100%',
  },
};

const STYLES: any = {
  picker: {
    width: '9px',
    height: '9px',
    borderRadius: '9px',
    transform: 'translate(-4px, -2px)',
    backgroundColor: 'transparent',
    boxShadow: 'rgba(0, 0, 0, 0.37) 0px 1px 4px 0px',
    border: '2px solid white',
  },
  sliderContainer: {
    position: 'relative',
    width: '100%',
    height: '5px',
    marginBottom: 10,
  },
  wrapper: {
    width: '230px',
    backgroundColor: Palette.FATHER_COAL,
    borderRadius: '4px 4px 0 0',
    padding: '10px 10px 6px 10px',
  },
  saturationContainer: {
    position: 'relative',
    width: '120px',
    height: '100px',
  },
  editorsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    textAlign: 'right',
  },
  leftPanel: {
    width: '35%',
    marginTop: '10px',
  },
  smallInput: {
    input: {
      ...INPUT_STYLES.input,
      fontSize: 11,
      padding: '4px 6px',
      fontWeight: 'bold',
      lineHeight: '16px',
    },
    wrap: {
      ...INPUT_STYLES.wrap,
    },
  },
  mainInputContainer: {
    marginTop: '8px',
  },
  select: {
    outline: 'none',
    color: 'rgb(254, 254, 254)',
    fontSize: 11,
    fontFamily: 'Fira Sans',
    padding: '',
    marginTop: '6px',
    fontWeight: 'bold',
    marginBottom: '-6px',
  },
};

export interface HaikuColorPickerProps extends CustomPickerProps {
  displayValue: DisplayValues;
}

class SliderPointer extends React.PureComponent {
  render () {
    return <div style={STYLES.picker} />;
  }
}

class HaikuColorPicker extends React.PureComponent<HaikuColorPickerProps> {
  state = {
    valueDisplay: this.props.displayValue,
  };

  onValueDisplayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({valueDisplay: Number(event.currentTarget.value)});

    this.props.onChange && this.props.onChange({
      hex: this.props.hex || '',
      hsl: this.props.hsl || { a: 1, h: 0, s: 0, l: 0 },
      hsv: this.props.hsv || { a: 1, h: 0, s: 0, v: 0 },
      rgb: this.props.rgb || { a: 1, r: 0, g: 0, b: 0 },
      source: event.currentTarget.value,
      oldHue: 0,
    });
  };

  onChange = (data: any) => {
    let source: DisplayValues;

    if (data.a !== 1 && this.state.valueDisplay === DisplayValues.HEX) {
      source = DisplayValues.RGB;
      this.setState({valueDisplay: source});
    } else {
      source = this.state.valueDisplay;
    }

    this.props.onChange && this.props.onChange({
      ...data,
      source,
    });
  };

  render () {
    if (this.state.valueDisplay === null) {
      return null;
    }

    return (
      <div style={STYLES.wrapper} className="color-picker-wrapper">
        <style>
          {`
            .color-picker-wrapper [class^="saturation-"],
            .color-picker-wrapper .saturation-container > * {
              border-radius: 4px;
            }
          `}
        </style>
        <div style={STYLES.editorsContainer}>
          <div style={STYLES.saturationContainer} className="saturation-container">
            <Saturation 
              hsl={this.props.hsl || { a: 1, h: 0, s: 0, l: 0 }} 
              hsv={this.props.hsv || { a: 1, h: 0, s: 0, v: 0 }} 
              onChange={this.onChange} 
            />
          </div>
          <div style={STYLES.leftPanel}>
            <div style={STYLES.sliderContainer}>
              <Hue 
                hsl={this.props.hsl || { a: 1, h: 0, s: 0, l: 0 }} 
                onChange={this.onChange} 
                pointer={SliderPointer} 
              />
            </div>
            <div style={{...STYLES.sliderContainer, background: 'white', opacity: 1}}>
              <Alpha 
                rgb={this.props.rgb || { a: 1, r: 0, g: 0, b: 0 }} 
                hsl={this.props.hsl || { a: 1, h: 0, s: 0, l: 0 }} 
                onChange={this.onChange} 
                pointer={SliderPointer} 
              />
              <div style={{pointerEvents: "none", background: 'white', opacity: 1}}>
                <Checkboard />
              </div>
            </div>
            <div style={{width: '57%', display: 'inline-block', marginTop: 2}}>
              <EditableInput
                style={STYLES.smallInput}
                value={`${this.props.hsl?.a || 0 * 100}%`}
                onChange={this.onChange}
              />
            </div>
            <div>
              <select
                value={this.state.valueDisplay.toString()}
                style={STYLES.select}
                onChange={this.onValueDisplayChange}
              >
                <option value={DisplayValues.HEX}>HEX</option>
                <option value={DisplayValues.HSL}>HSL</option>
                <option value={DisplayValues.RGB}>RGB</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CustomPicker(HaikuColorPicker);
