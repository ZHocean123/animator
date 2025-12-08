const ensureTrailingSlash = (str) => {
  return (str[str.length - 1] === '/')
    ? str
    : `${str}/`;
};

export default ensureTrailingSlash;
