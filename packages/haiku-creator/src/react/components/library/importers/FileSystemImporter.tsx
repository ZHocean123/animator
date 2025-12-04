import { Experiment, experimentIsEnabled, isMac } from 'haiku-common'

import * as React from 'react'

// 声明 electronAPI 类型
declare global {
  interface Window {
    electronAPI: {
      dialog: {
        showOpenDialog: (options: {
          title?: string
          filters?: Array<{ name: string, extensions: string[] }>
          properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory'>
        }) => Promise<{ canceled: boolean, filePaths: string[] }>
      }
    }
  }
}

export interface FileSystemImporterProps {
  onFileDrop: (files: string[]) => void
  style?: React.CSSProperties
  text?: string
}

class FileSystemImporter extends React.PureComponent<FileSystemImporterProps> {
  showImportDialog = async () => {
    const validExtensions = [
      'svg',
      'ai',
    ]

    if (experimentIsEnabled(Experiment.AllowBitmapImages)) {
      validExtensions.push(
        'jpg',
        'jpeg',
        'png',
        'gif',
      )
    }

    // Only mac offers support for Sketch
    if (isMac()) {
      validExtensions.push('sketch')
    }

    // 使用 electronAPI 替代 remote.dialog
    const result = await window.electronAPI.dialog.showOpenDialog({
      title: 'Import to Library',
      filters: [{ name: 'Valid Files', extensions: validExtensions }],
      properties: ['multiSelections', 'openFile'],
    })

    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      this.props.onFileDrop(result.filePaths)
    }
  }

  render() {
    return (
      <div
        style={this.props.style}
        onClick={this.showImportDialog}
      >
        {this.props.text || 'Import From File'}
      </div>
    )
  }
}

export default FileSystemImporter
