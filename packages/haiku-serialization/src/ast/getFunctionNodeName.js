function getFunctionNodeName (node) {
  return (
    (node.id && node.id.name) ||
    (node.key && node.key.name) ||
    (node.name && node.name.value)
  );
}

export default getFunctionNodeName;
