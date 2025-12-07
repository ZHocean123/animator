/* tslint:disable:import-name */
import * as React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import Palette from '../Palette'

export interface CodeBoxProps {
  lang?: string
  children?: string
}

export class CodeBox extends React.PureComponent<CodeBoxProps> {
  static defaultProps = {
    lang: 'jsx',
  }

  render() {
    atomDark['pre[class*="language-"]'].background = Palette.FATHER_COAL
    atomDark['pre[class*="language-"]'].userSelect = 'all'

    return (
      <SyntaxHighlighter language={this.props.lang} style={atomDark}>
        {this.props.children || ''}
      </SyntaxHighlighter>
    )
  }
}
