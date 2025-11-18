import * as React from 'react';
import PropTypes from 'prop-types';
import * as Radium from 'radium';
import AssetItem from './AssetItem';

class AssetList extends React.Component {
  render () {
    return (
      <div
        className="assets-list">
        {this.props.assets.map((asset) => {
          return (
            <AssetItem
              key={asset.getPrimaryKey()}
              websocket={this.props.websocket}
              projectModel={this.props.projectModel}
              onDragStart={this.props.onDragStart}
              onDragEnd={this.props.onDragEnd}
              onAssetDoubleClick={this.props.onAssetDoubleClick}
              deleteAsset={this.props.deleteAsset}
              asset={asset}
              indent={this.props.indent}
              figma={this.props.figma}
              onAskForFigmaAuth={this.props.onAskForFigmaAuth}
              onImportFigmaAsset={this.props.onImportFigmaAsset}
              onRefreshFigmaAsset={this.props.onRefreshFigmaAsset}
              conglomerateComponent={this.props.conglomerateComponent}
              />
          );
        })}
      </div>
    );
  }
}

AssetList.propTypes = {
  indent: PropTypes.number.isRequired,
  assets: PropTypes.array.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onAssetDoubleClick: PropTypes.func.isRequired,
  deleteAsset: PropTypes.func.isRequired,
  projectModel: PropTypes.object.isRequired,
  onRefreshFigmaAsset: PropTypes.func.isRequired,
};

export default Radium(AssetList);
