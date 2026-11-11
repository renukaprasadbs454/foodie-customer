export const getItemAsync = jest.fn(async () => null);
export const setItemAsync = jest.fn(async () => {});
export const deleteItemAsync = jest.fn(async () => {});
export const isAvailableAsync = jest.fn(async () => true);
export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
};

