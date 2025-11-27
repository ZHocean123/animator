export default function getFunctionNodeName(node: any) {
  return (
    (node.id && node.id.name)
    || (node.key && node.key.name)
    || (node.name && node.name.value)
  )
}
