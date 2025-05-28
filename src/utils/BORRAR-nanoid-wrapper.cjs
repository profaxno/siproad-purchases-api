// module.exports = async function generateCode() {
//   const { nanoid } = await import('nanoid');  // * dynamic import for ESM
//   return nanoid(6);
// }

module.exports = async function generateCode() {
  const { customAlphabet } = await import('nanoid'); // Importa la función correcta para personalizar el ID
  const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6); 
  return nanoid();
};