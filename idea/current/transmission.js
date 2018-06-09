/*
 * Server --> Client
 */
const s2cPkg = {
  action: '', // optional
  data: {

  },
  state: "encrypted",
};

const encryptedState = {
  state: {
    stateData: 'blah',
  },
  nonce: 'random',
};

/*
 * Client --> Server
 */
const c2sPkg = {
  name: "", // optional
  props: {

  },
  state: "encrypted", // optional
};

const state = {
  $$flowId: 1,
};