import BaseModel from './BaseModel.js';

/**
 * @class PseudoFile
 */
class PseudoFile extends BaseModel {}

PseudoFile.DEFAULT_OPTIONS = {
  required: {
    relpath: true,
  },
};

BaseModel.extend(PseudoFile);

export default PseudoFile;
