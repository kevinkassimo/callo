const express = require('express')
const crossCall = require('crosscall');
const mongoApi = require('example-mongoApi');

const api = crossCall('/api', 'api'); // mount path, alias

api.on('getAllRepos', async (username) => {
  let validated = await api.request('validateCredentials', 'REQUIRE_CRED')
  if (validated) {
    let result = await mongoApi.find({query: 'blah'})
    return result
  }

  return null
})

api.on('validateCredentials', async (token) => {
  if (!token) {
    return false;
  }
  let data = await mongoApi.findOne({token: token})
  return !!data
})

// Check ws for mounting this to websocket

// Frontend
cc.dial('@api', async (conn) => {
  let handle = await conn.call('getAllRepos', 'kevinkassimo')
  while (handle.actionRequired) {
    switch (handle.action) {
      case 'REQUIRE_CRED':
        await handle.respond(localStorage.get('token'));
        break;
    }
  }
  let data = handle.result
  // Do work...
  conn.hangoff();
});


/*
 * Thoughts:
 * One way to store information of current backend operation flow is to store to mongo
 * Another way is to use the JWT token idea, encrypt and send the state to the client, so the client can resume whenever it wants.
 * The only problem now comes to how to make the API itself nice to use enough
 */

api.on('getAllRepos', (username) => {
  api.save({username});
  return api.order('validateCredentials', 'REQUIRE_CARD')
})

api.on('getAllRepos')
  .then(() => {
    return api.order('validateCredentials', 'REQUIRE_CRED')
  })
  .then((isValidated) => {
    if (!isValidated) {
      throw api.abort();
    }
    mongoApi.findOne('')
  })
